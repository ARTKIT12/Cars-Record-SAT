export enum UserRole {
  ADMIN = 'ADMIN',
  GUARD = 'GUARD'
}

export enum VehicleType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
  WIN = 'WIN' // Win Motosai (Taxi)
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  photo_url: string;
}

export interface Vehicle {
  id: string;
  employee_id: string;
  license_plate: string;
  type: VehicleType;
  photo_url?: string;
}

export interface AccessLog {
  id: string;
  employee_id: string;
  vehicle_id?: string; // Null if WIN
  vehicle_type: VehicleType;
  timestamp: string; // ISO String
  guard_id: string;
}

// For UI logic
export interface ScannedResult {
  employee: Employee;
  vehicle: Vehicle | null; // Null if unknown vehicle or WIN
}

export interface MonthlyStats {
  employee_id: string;
  employee_name: string;
  total_days: number;
  car_days: number;
  moto_days: number;
  win_days: number;
  calculated_type: VehicleType;
  payout_status: 'PENDING' | 'PAID';
}