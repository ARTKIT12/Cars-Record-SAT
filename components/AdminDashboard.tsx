import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyLogs, addEmployee, addVehicle } from '../services/supabaseService';
import { calculateMonthlyExpenses } from '../services/expenseCalculator';
import { MonthlyStats, VehicleType, Employee } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Users, Car, AlertCircle, Plus } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REPORT' | 'EMPLOYEES'>('REPORT');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New Entry States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState({ first: '', last: '', dept: '', pos: '' });
  const [newVehicle, setNewVehicle] = useState({ plate: '', type: VehicleType.CAR });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    const empData = await getEmployees();
    setEmployees(empData);

    const now = new Date();
    // Fetch logs for current month
    const logs = await getMonthlyLogs(now.getMonth(), now.getFullYear());
    const calculatedStats = calculateMonthlyExpenses(logs, empData, now.getFullYear(), now.getMonth());
    setStats(calculatedStats);
    setLoading(false);
  };

  const handleAddEmployee = async () => {
      // Simplified add logic
      const { data, error } = await addEmployee({
          first_name: newEmpName.first,
          last_name: newEmpName.last,
          department: newEmpName.dept,
          position: newEmpName.pos,
          photo_url: `https://ui-avatars.com/api/?name=${newEmpName.first}+${newEmpName.last}&background=random`
      }) as any;
      
      if(!error) {
          alert("เพิ่มพนักงานเรียบร้อย");
          setShowAddModal(false);
          loadData();
      }
  }

  const getTypeColor = (type: VehicleType) => {
      switch(type) {
          case VehicleType.CAR: return '#4299E1'; // Blue
          case VehicleType.MOTORCYCLE: return '#48BB78'; // Green
          case VehicleType.WIN: return '#ED8936'; // Orange
          default: return '#CBD5E0';
      }
  }

  return (
    <div className="pb-20">
      <div className="bg-white p-6 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-pastel-text mb-1">ผู้ดูแลระบบ</h1>
        <p className="text-gray-400 text-sm">จัดการข้อมูลและสรุปค่าใช้จ่าย</p>
        
        <div className="flex gap-2 mt-6">
          <button 
            onClick={() => setActiveTab('REPORT')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'REPORT' ? 'bg-pastel-accent text-white shadow-lg shadow-teal-100' : 'bg-gray-100 text-gray-500'}`}
          >
            รายงานประจำเดือน
          </button>
          <button 
             onClick={() => setActiveTab('EMPLOYEES')}
             className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'EMPLOYEES' ? 'bg-pastel-accent text-white shadow-lg shadow-teal-100' : 'bg-gray-100 text-gray-500'}`}
          >
            ข้อมูลพนักงาน
          </button>
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'REPORT' && (
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-64">
                <h3 className="font-bold text-gray-700 mb-4">สถิติการใช้รถเดือนนี้</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.filter(s => s.total_days > 0).slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="employee_name" tick={{fontSize: 10}} interval={0} />
                        <YAxis tick={{fontSize: 10}} />
                        <Tooltip />
                        <Bar dataKey="total_days" fill="#E0F2F1" radius={[4, 4, 0, 0]}>
                            {stats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getTypeColor(entry.calculated_type)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* List */}
            <div className="space-y-3">
              {stats.map(stat => (
                <div key={stat.employee_id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                   <div>
                      <div className="font-bold text-gray-700">{stat.employee_name}</div>
                      <div className="text-xs text-gray-400 flex gap-2 mt-1">
                          <span className="text-blue-500">รถยนต์: {stat.car_days}</span>
                          <span className="text-green-500">มอไซค์: {stat.moto_days}</span>
                          <span className="text-orange-500">วิน: {stat.win_days}</span>
                      </div>
                   </div>
                   <div className="text-right">
                       <div className="text-xs text-gray-400">สรุปจ่ายประเภท</div>
                       <div className={`font-bold px-3 py-1 rounded-lg text-sm inline-block mt-1 ${
                           stat.calculated_type === VehicleType.CAR ? 'bg-blue-100 text-blue-700' :
                           stat.calculated_type === VehicleType.MOTORCYCLE ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                       }`}>
                           {stat.calculated_type}
                       </div>
                   </div>
                </div>
              ))}
              {stats.length === 0 && <div className="text-center text-gray-400 py-10">ไม่พบข้อมูลในเดือนนี้</div>}
            </div>
          </div>
        )}

        {activeTab === 'EMPLOYEES' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700">รายชื่อ ({employees.length})</h3>
                    <button onClick={() => setShowAddModal(true)} className="bg-pastel-accent text-white p-2 rounded-full shadow-lg">
                        <Plus size={20} />
                    </button>
                </div>
                <div className="space-y-3">
                    {employees.map(emp => (
                        <div key={emp.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
                            <img src={emp.photo_url} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                            <div>
                                <div className="font-bold text-gray-800">{emp.first_name} {emp.last_name}</div>
                                <div className="text-xs text-gray-500">{emp.position} | {emp.department}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

        {/* Add Employee Modal (Simplified) */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
                    <h3 className="font-bold text-xl mb-4 text-pastel-accent">เพิ่มพนักงานใหม่</h3>
                    <div className="space-y-3">
                        <input placeholder="ชื่อ" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setNewEmpName({...newEmpName, first: e.target.value})} />
                        <input placeholder="นามสกุล" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setNewEmpName({...newEmpName, last: e.target.value})} />
                        <input placeholder="แผนก" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setNewEmpName({...newEmpName, dept: e.target.value})} />
                        <input placeholder="ตำแหน่ง" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setNewEmpName({...newEmpName, pos: e.target.value})} />
                    </div>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-500">ยกเลิก</button>
                        <button onClick={handleAddEmployee} className="flex-1 bg-pastel-accent text-white rounded-xl font-bold shadow-lg">บันทึก</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;