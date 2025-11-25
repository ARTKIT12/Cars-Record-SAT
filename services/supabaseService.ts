import { createClient } from '@supabase/supabase-js';
import { Employee, Vehicle, AccessLog, VehicleType } from '../types';

// NOTE: In a real app, these would come from process.env
// For this generated code to be runnable immediately, we will allow the user
// to input them in the UI or fallback to a local mock if missing.
let supabaseUrl = '';
let supabaseKey = '';
let supabase: any = null;

export const initSupabase = (url: string, key: string) => {
  supabaseUrl = url;
  supabaseKey = key;
  try {
    supabase = createClient(url, key);
    return true;
  } catch (e) {
    console.error("Supabase init failed", e);
    return false;
  }
};

export const isSupabaseConfigured = () => !!supabase;

// --- Database Operations ---

export const findVehicleByPlate = async (plate: string): Promise<{ vehicle: Vehicle, employee: Employee } | null> => {
  if (!supabase) return null;
  
  // Search strictly or loosely (Thai plates can be tricky with spacing)
  // Assuming exact match for simplicity
  const { data: vehicleData, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      employees (*)
    `)
    .ilike('license_plate', `%${plate}%`) // Partial match for better UX
    .limit(1)
    .single();

  if (error || !vehicleData) return null;

  return {
    vehicle: {
      id: vehicleData.id,
      employee_id: vehicleData.employee_id,
      license_plate: vehicleData.license_plate,
      type: vehicleData.type as VehicleType,
      photo_url: vehicleData.photo_url
    },
    employee: vehicleData.employees
  };
};

export const getEmployees = async (): Promise<Employee[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('employees').select('*');
    return data || [];
};

export const saveLog = async (employeeId: string, vehicleId: string | null, type: VehicleType, guardId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('access_logs').insert({
    employee_id: employeeId,
    vehicle_id: vehicleId,
    vehicle_type: type,
    guard_id: guardId,
    timestamp: new Date().toISOString()
  });
  if (error) throw error;
};

export const getMonthlyLogs = async (month: number, year: number) => {
  if (!supabase) return [];
  
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0).toISOString();

  const { data, error } = await supabase
    .from('access_logs')
    .select(`
      *,
      employees (first_name, last_name, department)
    `)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate);

  if (error) return [];
  return data;
};

// CRUD for Admin
export const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    if(!supabase) return;
    return await supabase.from('employees').insert(emp);
}

export const addVehicle = async (veh: Omit<Vehicle, 'id'>) => {
    if(!supabase) return;
    return await supabase.from('vehicles').insert(veh);
}
