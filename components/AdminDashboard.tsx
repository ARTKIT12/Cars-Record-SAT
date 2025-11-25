import React, { useState, useEffect, useRef } from 'react';
import { getEmployees, getMonthlyLogs, addEmployee, updateEmployee, deleteEmployee, addVehicle, deleteVehicle } from '../services/supabaseService';
import { calculateMonthlyExpenses } from '../services/expenseCalculator';
import { extractLicensePlate } from '../services/geminiService';
import { MonthlyStats, VehicleType, Employee, Vehicle } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Car, Bike, User, Search, Filter, Camera, X, Loader2, Save, Trash2, Edit2, ArrowUpDown, ChevronDown, AlertCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REPORT' | 'EMPLOYEES'>('REPORT');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'NAME' | 'DEPT' | 'VEHICLES', direction: 'ASC' | 'DESC' }>({ key: 'NAME', direction: 'ASC' });

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ first: '', last: '', dept: '', pos: '' });

  const [showAddVehicleModal, setShowAddVehicleModal] = useState<{show: boolean, employeeId: string | null}>({ show: false, employeeId: null });
  const [newVehicle, setNewVehicle] = useState({ plate: '', type: VehicleType.CAR, make: '', model: '', color: '' });
  
  // Vehicle Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [analyzingPlate, setAnalyzingPlate] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    const empData = await getEmployees();
    setEmployees(empData);

    const now = new Date();
    const logs = await getMonthlyLogs(now.getMonth(), now.getFullYear());

    const savedRates = localStorage.getItem('EXPENSE_RATES');
    const rates = savedRates ? JSON.parse(savedRates) : { car: 90, moto: 70, win: 70 };

    const calculatedStats = calculateMonthlyExpenses(logs, empData, now.getFullYear(), now.getMonth(), rates);
    setStats(calculatedStats);
    setLoading(false);
  };

  // --- Employee CRUD ---

  const handleOpenAddEmployee = () => {
      setEditingEmployee(null);
      setEmpForm({ first: '', last: '', dept: '', pos: '' });
      setShowAddEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
      setEditingEmployee(emp);
      setEmpForm({ first: emp.first_name, last: emp.last_name, dept: emp.department, pos: emp.position });
      setShowAddEmployeeModal(true);
  };

  const handleSaveEmployee = async () => {
      if (!empForm.first || !empForm.last) return alert("กรุณากรอกชื่อและนามสกุล");

      const payload = {
          first_name: empForm.first,
          last_name: empForm.last,
          department: empForm.dept,
          position: empForm.pos,
          photo_url: editingEmployee?.photo_url || `https://ui-avatars.com/api/?name=${empForm.first}+${empForm.last}&background=random`
      };

      let error;
      if (editingEmployee) {
          const res = await updateEmployee(editingEmployee.id, payload);
          error = res?.error;
      } else {
          const res = await addEmployee(payload as any);
          error = res?.error;
      }

      if(!error) {
          alert(editingEmployee ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มพนักงานเรียบร้อย");
          setShowAddEmployeeModal(false);
          loadData();
      } else {
          alert("เกิดข้อผิดพลาด");
      }
  };

  const handleDeleteEmployee = async (id: string) => {
      if(window.confirm("คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้? ข้อมูลรถและประวัติจะถูกลบด้วย")) {
          await deleteEmployee(id);
          loadData();
      }
  };

  // --- Vehicle CRUD ---

  const openAddVehicle = (employeeId: string) => {
      setNewVehicle({ plate: '', type: VehicleType.CAR, make: '', model: '', color: '' });
      setShowAddVehicleModal({ show: true, employeeId });
  };

  const handleDeleteVehicle = async (id: string) => {
      if(window.confirm("ลบรถคันนี้?")) {
          await deleteVehicle(id);
          loadData();
      }
  };

  const handleAddVehicle = async () => {
      if (!showAddVehicleModal.employeeId || !newVehicle.plate) return;

      const { error } = await addVehicle({
          employee_id: showAddVehicleModal.employeeId,
          license_plate: newVehicle.plate,
          type: newVehicle.type,
          make: newVehicle.make,
          model: newVehicle.model,
          color: newVehicle.color,
          photo_url: 'https://placehold.co/100x100/e2e8f0/64748b?text=Car' 
      }) as any;

      if (!error) {
          alert("ลงทะเบียนรถสำเร็จ");
          stopCamera();
          setShowAddVehicleModal({ show: false, employeeId: null });
          loadData();
      } else {
          alert("เกิดข้อผิดพลาด หรือทะเบียนซ้ำ");
      }
  };

  // --- Camera Logic ---
  const startCamera = async () => {
      setCameraError(null);
      try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          handleStreamSuccess(mediaStream);
      } catch (e: any) {
          console.warn("Env camera failed, trying fallback", e);
          try {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
              handleStreamSuccess(fallbackStream);
          } catch (err: any) {
              console.error(err);
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                  setCameraError("กรุณาอนุญาตให้เข้าถึงกล้อง");
              } else {
                  setCameraError("ไม่สามารถเปิดกล้องได้");
              }
          }
      }
  };

  const handleStreamSuccess = (mediaStream: MediaStream) => {
      setStream(mediaStream);
      setIsCameraOpen(true);
      // Wait a bit for the video element to be ready
      setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
  };

  const stopCamera = () => {
      if (stream) {
          stream.getTracks().forEach(t => t.stop());
          setStream(null);
      }
      setIsCameraOpen(false);
      setCameraError(null);
  };

  const capturePlate = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      setAnalyzingPlate(true);
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);

      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const plate = await extractLicensePlate(imageData);
      
      if (plate) {
          setNewVehicle(prev => ({ ...prev, plate }));
          stopCamera(); 
      } else {
          alert("อ่านป้ายไม่ชัดเจน กรุณาลองใหม่");
      }
      setAnalyzingPlate(false);
  };

  const getTypeColor = (type: VehicleType) => {
      switch(type) {
          case VehicleType.CAR: return '#4299E1'; // Blue
          case VehicleType.MOTORCYCLE: return '#48BB78'; // Green
          case VehicleType.WIN: return '#ED8936'; // Orange
          default: return '#CBD5E0';
      }
  };

  // --- Sort & Filter Logic ---
  const filteredEmployees = employees.filter(emp => {
      const fullString = `${emp.first_name} ${emp.last_name} ${emp.department} ${emp.position}`.toLowerCase();
      return fullString.includes(searchTerm.toLowerCase());
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortConfig.key === 'NAME') {
          valA = `${a.first_name} ${a.last_name}`;
          valB = `${b.first_name} ${b.last_name}`;
      } else if (sortConfig.key === 'DEPT') {
          valA = a.department || '';
          valB = b.department || '';
      } else if (sortConfig.key === 'VEHICLES') {
          valA = a.vehicles?.length || 0;
          valB = b.vehicles?.length || 0;
          // Number sorting
          return sortConfig.direction === 'ASC' ? valA - valB : valB - valA;
      }

      // String sorting
      if (sortConfig.direction === 'ASC') {
          return valA.localeCompare(valB);
      } else {
          return valB.localeCompare(valA);
      }
  });

  const toggleSort = (key: 'NAME' | 'DEPT' | 'VEHICLES') => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'ASC' ? 'DESC' : 'ASC'
      }));
  };

  return (
    <div className="pb-20">
      <div className="bg-white px-6 pt-2 pb-6 rounded-b-[40px] shadow-sm mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">แดชบอร์ดผู้ดูแล</h2>
        <p className="text-gray-400 text-xs font-medium">จัดการข้อมูลและสรุปค่าใช้จ่าย</p>
        
        <div className="flex gap-3 mt-6 p-1 bg-gray-50 rounded-2xl">
          <button 
            onClick={() => setActiveTab('REPORT')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'REPORT' ? 'bg-white text-pastel-accent shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            รายงานประจำเดือน
          </button>
          <button 
             onClick={() => setActiveTab('EMPLOYEES')}
             className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'EMPLOYEES' ? 'bg-white text-pastel-accent shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            ข้อมูลพนักงาน & รถ
          </button>
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'REPORT' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-72">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700">สถิติการใช้รถเดือนนี้</h3>
                    <div className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</div>
                </div>
                <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={stats.filter(s => s.total_days > 0).slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="employee_name" tick={{fontSize: 10, fill: '#9CA3AF'}} interval={0} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="total_days" fill="#E0F2F1" radius={[6, 6, 0, 0]} barSize={20}>
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
                <div key={stat.employee_id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
                   <div>
                      <div className="font-bold text-gray-700 mb-2">{stat.employee_name}</div>
                      <div className="flex gap-2">
                          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-[10px] text-blue-600 font-bold">
                              <Car size={10} /> {stat.car_days}
                          </div>
                          <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md text-[10px] text-green-600 font-bold">
                              <Bike size={10} /> {stat.moto_days}
                          </div>
                          <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-md text-[10px] text-orange-600 font-bold">
                              <User size={10} /> {stat.win_days}
                          </div>
                      </div>
                   </div>
                   <div className="text-right">
                       <div className="text-[10px] text-gray-400 font-medium mb-1">จ่ายประเภท</div>
                       <div className={`font-bold px-3 py-1.5 rounded-xl text-xs inline-block shadow-sm ${
                           stat.calculated_type === VehicleType.CAR ? 'bg-blue-100 text-blue-700' :
                           stat.calculated_type === VehicleType.MOTORCYCLE ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                       }`}>
                           {stat.calculated_type}
                       </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'EMPLOYEES' && (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
                {/* Actions & Search */}
                <div className="flex gap-3 mb-4 sticky top-20 z-10">
                    <div className="flex-1 relative shadow-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาชื่อ..." 
                            className="w-full bg-white rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none text-gray-700"
                        />
                    </div>
                    <button onClick={handleOpenAddEmployee} className="bg-pastel-accent hover:bg-teal-700 text-white p-3 rounded-2xl shadow-lg shadow-teal-100 transition-colors">
                        <Plus size={20} />
                    </button>
                </div>

                {/* Sorting Toolbar */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => toggleSort('NAME')} 
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${sortConfig.key === 'NAME' ? 'bg-white border-pastel-accent text-pastel-accent shadow-sm' : 'bg-transparent border-transparent text-gray-400'}`}
                    >
                        ชื่อ {sortConfig.key === 'NAME' && (sortConfig.direction === 'ASC' ? 'A-Z' : 'Z-A')} <ArrowUpDown size={10} />
                    </button>
                    <button 
                        onClick={() => toggleSort('DEPT')} 
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${sortConfig.key === 'DEPT' ? 'bg-white border-pastel-accent text-pastel-accent shadow-sm' : 'bg-transparent border-transparent text-gray-400'}`}
                    >
                        แผนก {sortConfig.key === 'DEPT' && <ChevronDown size={10} />}
                    </button>
                    <button 
                        onClick={() => toggleSort('VEHICLES')} 
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${sortConfig.key === 'VEHICLES' ? 'bg-white border-pastel-accent text-pastel-accent shadow-sm' : 'bg-transparent border-transparent text-gray-400'}`}
                    >
                        จำนวนรถ {sortConfig.key === 'VEHICLES' && <ChevronDown size={10} />}
                    </button>
                </div>

                <div className="space-y-4">
                    {sortedEmployees.map(emp => (
                        <div key={emp.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 hover:shadow-md transition-shadow relative group">
                            {/* Admin Actions */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenEditEmployee(emp)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-blue-500"><Edit2 size={12} /></button>
                                <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-red-500"><Trash2 size={12} /></button>
                            </div>

                            <div className="flex items-start gap-4 mb-4">
                                <img src={emp.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover bg-gray-200 shadow-sm border-2 border-white" />
                                <div className="flex-1 pr-12">
                                    <h3 className="font-bold text-gray-800 text-lg">{emp.first_name} {emp.last_name}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="text-[10px] font-bold bg-pastel-blue text-blue-600 px-2 py-1 rounded-lg">{emp.department}</span>
                                        <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">{emp.position}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Vehicle Section */}
                            <div className="bg-gray-50/50 rounded-2xl p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                                        ยานพาหนะ 
                                        <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{emp.vehicles?.length || 0}</span>
                                    </span>
                                    <button 
                                        onClick={() => openAddVehicle(emp.id)}
                                        className="text-[10px] font-bold text-pastel-accent bg-pastel-accent/10 px-2 py-1 rounded-lg hover:bg-pastel-accent hover:text-white transition-all flex items-center gap-1"
                                    >
                                        <Plus size={10} /> ลงทะเบียนรถ
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    {emp.vehicles && emp.vehicles.length > 0 ? (
                                        emp.vehicles.map(v => (
                                            <div key={v.id} className="bg-white p-2 rounded-xl border border-gray-100 flex items-center gap-3 relative group/vehicle">
                                                <div className={`p-2 rounded-lg ${v.type === VehicleType.CAR ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                                                    {v.type === VehicleType.CAR ? <Car size={16} /> : <Bike size={16} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-700 text-sm">{v.license_plate}</div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {v.make} {v.model} {v.color && `• สี${v.color}`}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteVehicle(v.id)} className="absolute right-2 opacity-0 group-hover/vehicle:opacity-100 p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 hover:text-red-500 transition-all">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-3 text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl bg-white/50">ยังไม่มีข้อมูลรถ</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

        {/* Modal: Add/Edit Employee */}
        {showAddEmployeeModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="font-bold text-xl mb-6 text-gray-800 text-center">{editingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                             <input value={empForm.first} placeholder="ชื่อ" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-pastel-accent outline-none" onChange={e => setEmpForm({...empForm, first: e.target.value})} />
                             <input value={empForm.last} placeholder="นามสกุล" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-pastel-accent outline-none" onChange={e => setEmpForm({...empForm, last: e.target.value})} />
                        </div>
                        <input value={empForm.dept} placeholder="แผนก" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-pastel-accent outline-none" onChange={e => setEmpForm({...empForm, dept: e.target.value})} />
                        <input value={empForm.pos} placeholder="ตำแหน่ง" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-pastel-accent outline-none" onChange={e => setEmpForm({...empForm, pos: e.target.value})} />
                    </div>
                    <div className="mt-8 flex gap-3">
                        <button onClick={() => setShowAddEmployeeModal(false)} className="flex-1 py-4 text-gray-500 font-bold text-sm bg-gray-50 rounded-2xl hover:bg-gray-100">ยกเลิก</button>
                        <button onClick={handleSaveEmployee} className="flex-1 bg-pastel-accent text-white rounded-2xl font-bold text-sm shadow-lg shadow-teal-200 hover:bg-teal-700">บันทึก</button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Register Vehicle */}
        {showAddVehicleModal.show && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h3 className="font-bold text-lg text-gray-800">ลงทะเบียนยานพาหนะ</h3>
                        <button onClick={() => { stopCamera(); setShowAddVehicleModal({show: false, employeeId: null}); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={16} /></button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* License Plate Input Section */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative overflow-hidden">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">เลขทะเบียนรถ</label>
                                <span className="text-[10px] text-pastel-accent bg-pastel-accent/10 px-2 py-0.5 rounded-full font-bold">AI SCANNER</span>
                             </div>
                             
                             <div className="flex gap-2">
                                 <input 
                                     value={newVehicle.plate}
                                     onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value})}
                                     placeholder="1กก-9999"
                                     className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg text-gray-800 focus:ring-2 focus:ring-pastel-accent outline-none placeholder-gray-300"
                                 />
                                 <button 
                                     onClick={isCameraOpen ? capturePlate : startCamera}
                                     disabled={analyzingPlate}
                                     className={`px-4 rounded-xl flex items-center justify-center transition-all shadow-md ${isCameraOpen ? 'bg-red-500 text-white' : 'bg-pastel-accent text-white hover:bg-teal-600'}`}
                                 >
                                     {analyzingPlate ? <Loader2 className="animate-spin" /> : <Camera />}
                                 </button>
                             </div>
                             
                             {/* Camera Preview Area */}
                             {isCameraOpen && (
                                 <div className="mt-3 relative rounded-xl overflow-hidden bg-black aspect-video shadow-inner ring-4 ring-black/5">
                                     <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-90" />
                                     <canvas ref={canvasRef} className="hidden" />
                                     
                                     {/* Scanning Overlay */}
                                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                         <div className="w-2/3 h-1/2 border-2 border-white/60 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                                            <div className="absolute top-0 left-0 w-full h-0.5 bg-green-400 animate-[scan_1.5s_ease-in-out_infinite] shadow-[0_0_10px_#4ade80]"></div>
                                         </div>
                                         <p className="mt-4 text-white text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">วางป้ายทะเบียนในกรอบ</p>
                                     </div>
                                 </div>
                             )}
                             {cameraError && (
                                <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle size={12} /> {cameraError}
                                </div>
                             )}
                        </div>

                        {/* Vehicle Type */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">ประเภทรถ</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setNewVehicle({...newVehicle, type: VehicleType.CAR})}
                                    className={`py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${newVehicle.type === VehicleType.CAR ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-100 bg-white text-gray-400 hover:bg-gray-50'}`}
                                >
                                    <Car size={18} /> รถยนต์
                                </button>
                                <button 
                                    onClick={() => setNewVehicle({...newVehicle, type: VehicleType.MOTORCYCLE})}
                                    className={`py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${newVehicle.type === VehicleType.MOTORCYCLE ? 'border-green-500 bg-green-50 text-green-600 shadow-sm' : 'border-gray-100 bg-white text-gray-400 hover:bg-gray-50'}`}
                                >
                                    <Bike size={18} /> มอเตอร์ไซค์
                                </button>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 block">ยี่ห้อ (Brand)</label>
                                <input 
                                    placeholder="เช่น Toyota, Honda" 
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none"
                                    value={newVehicle.make}
                                    onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">รุ่น (Model)</label>
                                    <input 
                                        placeholder="เช่น Altis, Wave" 
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none"
                                        value={newVehicle.model}
                                        onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">สี (Color)</label>
                                    <input 
                                        placeholder="เช่น ขาว, ดำ" 
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none"
                                        value={newVehicle.color}
                                        onChange={e => setNewVehicle({...newVehicle, color: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-50 bg-gray-50/50">
                        <button 
                            onClick={handleAddVehicle}
                            className="w-full bg-pastel-accent hover:bg-teal-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-200 transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            <Save size={20} /> บันทึกข้อมูล
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;