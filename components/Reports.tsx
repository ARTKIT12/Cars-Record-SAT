import React, { useEffect, useState } from 'react';
import { getEmployees, getMonthlyLogs } from '../services/supabaseService';
import { calculateMonthlyExpenses } from '../services/expenseCalculator';
import { MonthlyStats, VehicleType, ExpenseRates } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Car, Bike, User, Download, TrendingUp } from 'lucide-react';

const Reports: React.FC = () => {
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<ExpenseRates>({ car: 90, moto: 70, win: 70 });
  const [totalPayout, setTotalPayout] = useState(0);

  useEffect(() => {
    // Load rates
    const savedRates = localStorage.getItem('EXPENSE_RATES');
    if (savedRates) {
      setRates(JSON.parse(savedRates));
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    // In a real app, allow date selection. Defaulting to current month.
    const [employees, logs] = await Promise.all([
      getEmployees(),
      getMonthlyLogs(now.getMonth(), now.getFullYear())
    ]);

    // Re-read rates inside here to ensure we have latest from closure if needed, but state is fine
    const currentRates = localStorage.getItem('EXPENSE_RATES') 
        ? JSON.parse(localStorage.getItem('EXPENSE_RATES')!) 
        : { car: 90, moto: 70, win: 70 };

    const calculated = calculateMonthlyExpenses(logs, employees, now.getFullYear(), now.getMonth(), currentRates);
    
    setStats(calculated);
    setTotalPayout(calculated.reduce((sum, item) => sum + item.total_payout, 0));
    setLoading(false);
  };

  const getTypeColor = (type: VehicleType) => {
    switch(type) {
        case VehicleType.CAR: return '#4299E1'; // Blue
        case VehicleType.MOTORCYCLE: return '#48BB78'; // Green
        case VehicleType.WIN: return '#ED8936'; // Orange
        default: return '#CBD5E0';
    }
  };

  if (loading) {
      return <div className="p-8 text-center text-gray-400">กำลังคำนวณข้อมูล...</div>;
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-fade-in">
        <div className="glass-panel bg-gradient-to-r from-pastel-accent to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-teal-200/50">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-white/80 text-xs font-bold mb-1">ยอดรวมค่าเดินทางเดือนนี้</h2>
                    <div className="text-3xl font-bold">{totalPayout.toLocaleString()} <span className="text-sm font-normal opacity-80">บาท</span></div>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                    <TrendingUp size={24} className="text-white" />
                </div>
            </div>
            <div className="mt-4 flex gap-3 text-xs font-medium text-white/90">
                <div className="bg-white/20 px-2 py-1 rounded-lg">รถยนต์ ฿{rates.car}</div>
                <div className="bg-white/20 px-2 py-1 rounded-lg">มอไซค์ ฿{rates.moto}</div>
                <div className="bg-white/20 px-2 py-1 rounded-lg">วิน ฿{rates.win}</div>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 h-72">
            <h3 className="font-bold text-gray-700 mb-4 text-sm">สถิติวันทำงาน</h3>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={stats.filter(s => s.total_days > 0).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="employee_name" tick={{fontSize: 10, fill: '#9CA3AF'}} interval={0} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{fill: 'transparent'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Bar dataKey="total_days" radius={[4, 4, 0, 0]} barSize={20}>
                        {stats.filter(s => s.total_days > 0).slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getTypeColor(entry.calculated_type)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* List */}
        <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-gray-700">รายละเอียดรายบุคคล</h3>
                <button className="text-pastel-accent text-xs font-bold flex items-center gap-1 bg-pastel-accent/10 px-3 py-1 rounded-lg">
                    <Download size={14} /> Export
                </button>
            </div>

            {stats.filter(s => s.total_days > 0).map(stat => (
                <div key={stat.employee_id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex justify-between items-center">
                    <div>
                        <div className="font-bold text-gray-800 text-sm">{stat.employee_name}</div>
                        <div className="text-xs text-gray-400 mb-2">{stat.department}</div>
                        <div className="flex gap-2">
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                <Car size={10} /> {stat.car_days}
                            </span>
                            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                <Bike size={10} /> {stat.moto_days}
                            </span>
                            <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                <User size={10} /> {stat.win_days}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-block mb-1 ${
                            stat.calculated_type === VehicleType.CAR ? 'bg-blue-100 text-blue-700' :
                            stat.calculated_type === VehicleType.MOTORCYCLE ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                            {stat.calculated_type}
                        </div>
                        <div className="font-bold text-gray-800">{stat.total_payout.toLocaleString()} บ.</div>
                    </div>
                </div>
            ))}
             {stats.filter(s => s.total_days > 0).length === 0 && (
                <div className="text-center py-10 text-gray-300 text-sm">ไม่มีข้อมูลการเดินทางในเดือนนี้</div>
            )}
        </div>
    </div>
  );
};

export default Reports;