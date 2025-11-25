import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../services/supabaseService';
import { Employee } from '../types';
import { Search, Plus, Edit2, Trash2, ArrowUpDown, UserPlus } from 'lucide-react';

const EmployeeList: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
    const [form, setForm] = useState({ first: '', last: '', dept: '', pos: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getEmployees();
        setEmployees(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.first || !form.last) return alert('กรุณากรอกชื่อ-นามสกุล');
        
        const payload = {
            first_name: form.first,
            last_name: form.last,
            department: form.dept,
            position: form.pos,
            photo_url: editingEmp?.photo_url || `https://ui-avatars.com/api/?name=${form.first}+${form.last}&background=random&color=fff&background=00897B`
        };

        if (editingEmp) {
            await updateEmployee(editingEmp.id, payload);
        } else {
            await addEmployee(payload as any);
        }
        setShowModal(false);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (confirm('ยืนยันการลบข้อมูลพนักงาน? ข้อมูลรถและประวัติจะหายไปทั้งหมด')) {
            await deleteEmployee(id);
            loadData();
        }
    };

    const openModal = (emp?: Employee) => {
        if (emp) {
            setEditingEmp(emp);
            setForm({ first: emp.first_name, last: emp.last_name, dept: emp.department, pos: emp.position });
        } else {
            setEditingEmp(null);
            setForm({ first: '', last: '', dept: '', pos: '' });
        }
        setShowModal(true);
    };

    const filtered = employees.filter(e => 
        `${e.first_name} ${e.last_name} ${e.department}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 pb-24 animate-fade-in">
            {/* Search Bar */}
            <div className="flex gap-3 mb-6 sticky top-0 bg-[#F5F7FA] z-10 py-2">
                <div className="flex-1 relative shadow-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาพนักงาน..." 
                        className="w-full bg-white rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none text-gray-700 border border-gray-100"
                    />
                </div>
                <button onClick={() => openModal()} className="bg-gradient-to-br from-pastel-accent to-teal-600 text-white p-3 rounded-2xl shadow-lg shadow-teal-200 hover:shadow-teal-300 transition-all active:scale-95">
                    <UserPlus size={24} />
                </button>
            </div>

            <div className="space-y-4">
                {filtered.map(emp => (
                    <div key={emp.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4 group hover:shadow-md transition-all">
                        <div className="relative">
                            <img src={emp.photo_url} className="w-14 h-14 rounded-2xl object-cover bg-gray-200 border-2 border-white shadow-sm" alt="Avatar" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pastel-green rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-teal-700 shadow-sm">
                                {emp.first_name.charAt(0)}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-lg">{emp.first_name} {emp.last_name}</h3>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold border border-blue-100">{emp.department}</span>
                                <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg border border-gray-100">{emp.position}</span>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => openModal(emp)} className="p-2 bg-gradient-to-br from-indigo-50 to-white text-indigo-500 rounded-xl border border-indigo-100 hover:from-indigo-100 hover:text-indigo-600 shadow-sm transition-all">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(emp.id)} className="p-2 bg-gradient-to-br from-rose-50 to-white text-rose-500 rounded-xl border border-rose-100 hover:from-rose-100 hover:text-rose-600 shadow-sm transition-all">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && !loading && (
                    <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Search size={24} className="text-gray-300"/>
                         </div>
                        <span>ไม่พบข้อมูลพนักงาน</span>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="font-bold text-xl mb-6 text-gray-800 text-center">{editingEmp ? 'แก้ไขข้อมูล' : 'เพิ่มพนักงาน'}</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <input value={form.first} onChange={e => setForm({...form, first: e.target.value})} placeholder="ชื่อ" className="flex-1 bg-gray-50 p-4 rounded-2xl text-sm border-none focus:ring-2 focus:ring-pastel-accent outline-none" />
                                <input value={form.last} onChange={e => setForm({...form, last: e.target.value})} placeholder="นามสกุล" className="flex-1 bg-gray-50 p-4 rounded-2xl text-sm border-none focus:ring-2 focus:ring-pastel-accent outline-none" />
                            </div>
                            <input value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} placeholder="แผนก" className="w-full bg-gray-50 p-4 rounded-2xl text-sm border-none focus:ring-2 focus:ring-pastel-accent outline-none" />
                            <input value={form.pos} onChange={e => setForm({...form, pos: e.target.value})} placeholder="ตำแหน่ง" className="w-full bg-gray-50 p-4 rounded-2xl text-sm border-none focus:ring-2 focus:ring-pastel-accent outline-none" />
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">ยกเลิก</button>
                            <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-pastel-accent to-teal-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-teal-200 transition-transform active:scale-95">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;