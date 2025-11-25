import { MonthlyStats, VehicleType, Employee, ExpenseRates } from '../types';

export const calculateMonthlyExpenses = (
  logs: any[], // Raw logs joined with employees
  employees: Employee[],
  targetYear: number,
  targetMonth: number,
  rates: ExpenseRates
): MonthlyStats[] => {
  const statsMap = new Map<string, MonthlyStats>();

  // Initialize stats for all employees
  employees.forEach(emp => {
    statsMap.set(emp.id, {
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      department: emp.department,
      total_days: 0,
      car_days: 0,
      moto_days: 0,
      win_days: 0,
      calculated_type: VehicleType.WIN, // Default
      total_payout: 0,
      payout_status: 'PENDING'
    });
  });

  // Unique days per employee to avoid double counting if multiple entries per day
  const processedDays = new Set<string>();

  logs.forEach(log => {
    const logDate = new Date(log.timestamp);
    const dateKey = `${log.employee_id}-${logDate.getDate()}`; // unique per day per emp
    
    if (processedDays.has(dateKey)) return; 
    processedDays.add(dateKey);

    const stat = statsMap.get(log.employee_id);
    if (!stat) return;

    stat.total_days++;

    if (log.vehicle_type === VehicleType.CAR) stat.car_days++;
    else if (log.vehicle_type === VehicleType.MOTORCYCLE) stat.moto_days++;
    else stat.win_days++;
  });

  // Apply the 80% Rule
  // "If driving a specific type is < 80%, calculate as that type" -> The prompt example is: 
  // 17 Moto, 13 Car -> Calc as Moto. 
  // Interpretation: To claim CAR rate (usually higher), you must drive CAR >= 80% of time.
  // Otherwise, fallback to MOTO (or WIN/Cheaper rate).
  
  return Array.from(statsMap.values()).map(stat => {
    const total = stat.total_days;
    if (total === 0) return stat;

    const carPercentage = (stat.car_days / total) * 100;
    
    // Determine Type
    if (carPercentage >= 80) {
      stat.calculated_type = VehicleType.CAR;
    } else if (stat.moto_days > 0 || stat.car_days > 0) {
      // If mixed or mostly moto, we give them Moto rate
      stat.calculated_type = VehicleType.MOTORCYCLE;
    } else {
      stat.calculated_type = VehicleType.WIN;
    }

    // Calculate Payout
    let rate = 0;
    switch (stat.calculated_type) {
      case VehicleType.CAR: rate = rates.car; break;
      case VehicleType.MOTORCYCLE: rate = rates.moto; break;
      case VehicleType.WIN: rate = rates.win; break;
    }

    stat.total_payout = total * rate;

    return stat;
  });
};