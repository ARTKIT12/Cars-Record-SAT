import React, { useState, useEffect, useRef } from 'react';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle, getEmployees } from '../services/supabaseService';
import { extractLicensePlate } from '../services/geminiService';
import { Vehicle, Employee, VehicleType } from '../types';
import { Plus, Trash2, Car, Bike, Camera, X, Loader2, AlertTriangle, RefreshCw, Sparkles, User, Edit2 } from 'lucide-react';

const VehicleList: React.FC = () => {
    const [vehicles, setVehicles] = useState<(Vehicle & { employee?: Employee })[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ plate: '', type: VehicleType.CAR, make: '', model: '', color: '', empId: '' });
    
    // Camera
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [vData, eData] = await Promise.all([getVehicles(), getEmployees()]);
            setVehicles(vData);
            setEmployees(eData);
        } catch (error) {
            console.error("Failed to load data", error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('ลบรถคันนี้?')) {
            await deleteVehicle(id);
            loadData();
        }
    };

    const openModal = (vehicle?: Vehicle & { employee?: Employee }) => {
        if (vehicle) {
            setEditingId(vehicle.id);
            setForm({
                plate: vehicle.license_plate,
                type: vehicle.type,
                make: vehicle.make || '',
                model: vehicle.model || '',
                color: vehicle.color || '',
                empId: vehicle.employee_id
            });
        } else {
            setEditingId(null);
            setForm({ plate: '', type: VehicleType.CAR, make: '', model: '', color: '', empId: '' });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.plate || !form.empId) return alert('กรุณาระบุเลขทะเบียนและเจ้าของรถ');
        
        const typeToSend = form.type === VehicleType.MOTORCYCLE ? VehicleType.MOTORCYCLE : VehicleType.CAR;

        const payload = {
            license_plate: form.plate.trim(),
            type: typeToSend,
            make: form.make || null,
            model: form.model || null,
            color: form.color || null,
            employee_id: form.empId,
            photo_url: 'https://placehold.co/100x100/e2e8f0/64748b?text=Vehicle'
        };

        let error;
        
        if (editingId) {
             const res = await updateVehicle(editingId, payload);
             error = res?.error;
        } else {
             const res = await addVehicle(payload);
             error = res?.error;
        }

        if (error) {
            console.error("Operation Error:", error);
            if (error.code === '23505') {
                alert(`เกิดข้อผิดพลาด: ทะเบียนรถ ${form.plate} มีอยู่ในระบบแล้ว`);
            } else if (error.code === '42703') {
                alert("เกิดข้อผิดพลาด: ฐานข้อมูลไม่รองรับข้อมูลใหม่ กรุณาไปที่หน้าตั้งค่า > SQL Table Setup และรันคำสั่ง SQL เพื่ออัปเดตตาราง");
            } else {
                alert(`บันทึกไม่สำเร็จ: ${error.message || 'กรุณาลองใหม่'}`);
            }
            return; 
        }

        alert(editingId ? "อัปเดตข้อมูลสำเร็จ" : "ลงทะเบียนรถสำเร็จ!");
        stopCamera();
        setShowModal(false);
        loadData();
    };

    const startCamera = async () => {
        setCameraError(null);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' },
                audio: false
            });
            handleStream(stream);
        } catch (e: any) {
            console.warn("Env camera failed, trying fallback");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true,
                    audio: false
                });
                handleStream(stream);
            } catch (err: any) {
                console.error("Camera fallback failed:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setCameraError("กรุณาอนุญาตให้เข้าถึงกล้อง (Permission Denied)");
                } else if (err.name === 'NotFoundError') {
                     setCameraError("ไม่พบกล้อง");
                } else {
                    setCameraError("ไม่สามารถเปิดกล้องได้");
                }
            }
        }
    };

    const handleStream = (stream: MediaStream) => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
        setIsCameraOpen(true);
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
        setCameraError(null);
    };

    const capture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setAnalyzing(true);
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0);
        
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9); // High quality for AI
        const plate = await extractLicensePlate(imageData);
        
        if (plate) {
            setForm(prev => ({ ...prev, plate }));
            stopCamera();
        } else {
            alert('มองไม่เห็นป้ายทะเบียน กรุณาลองใหม่');
        }
        setAnalyzing(false);
    };

    // Stats
    const carCount = vehicles.filter(v => v.type === VehicleType.CAR).length;
    const motoCount = vehicles.filter(v => v.type === VehicleType.MOTORCYCLE).length;

    return (
        <div className="p-4 pb-24 animate-fade-in">
            {/* Summary Dashboard */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-xl"><Car size={20} /></div>
                        <span className="text-2xl font-bold">{carCount}</span>
                    </div>
                    <div className="mt-2 text-xs font-medium text-blue-100">รถยนต์ทั้งหมด</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-white/20 rounded-xl"><Bike size={20} /></div>
                        <span className="text-2xl font-bold">{motoCount}</span>
                    </div>
                    <div className="mt-2 text-xs font-medium text-emerald-100">มอเตอร์ไซค์ทั้งหมด</div>
                </div>
            </div>

             <button 
                onClick={() => openModal()} 
                className="w-full bg-white border border-pastel-accent/30 text-pastel-accent font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mb-6 hover:bg-pastel-accent/5 transition-all shadow-sm"
             >
                <Plus size={18} /> ลงทะเบียนรถใหม่
            </button>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-pastel-accent" /></div>
            ) : (
                <div className="space-y-3">
                    {vehicles.map(v => (
                        <div key={v.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 relative group">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                v.type === VehicleType.CAR 
                                    ? 'bg-blue-50 text-blue-500' 
                                    : 'bg-emerald-50 text-emerald-500'
                            }`}>
                                {v.type === VehicleType.CAR ? <Car size={20} /> : <Bike size={20} />}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <div className="font-bold text-gray-800 text-base font-mono">{v.license_plate}</div>
                                    <div className="text-[10px] text-gray-400 font-medium">{v.make} {v.model}</div>
                                </div>
                                
                                {v.employee ? (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg w-fit">
                                        <User size={10} className="text-gray-400"/>
                                        <span className="font-bold truncate max-w-[120px]">{v.employee.first_name} {v.employee.last_name}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-red-400">ไม่ระบุเจ้าของ</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1">
                                <button onClick={() => openModal(v)} className="p-2 bg-indigo-50 text-indigo-400 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(v.id)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                {editingId ? (
                                    <><Edit2 size={18} className="text-pastel-accent"/> แก้ไขข้อมูลรถ</>
                                ) : (
                                    <><Plus size={18} className="text-pastel-accent"/> ลงทะเบียนรถใหม่</>
                                )}
                            </h3>
                            <button onClick={() => { stopCamera(); setShowModal(false); }}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Camera Section */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex gap-2 mb-2">
                                    <input value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} placeholder="ทะเบียนรถ" className="flex-1 p-3 rounded-xl border border-gray-200 font-bold text-center uppercase outline-none" />
                                    <button onClick={isCameraOpen ? capture : startCamera} className="bg-pastel-accent text-white px-4 rounded-xl shadow-lg">
                                        {analyzing ? <Loader2 className="animate-spin" /> : <Camera />}
                                    </button>
                                </div>
                                {cameraError && (
                                    <div className="text-xs text-red-500 flex items-center gap-1 mb-2 bg-red-50 p-2 rounded-lg border border-red-100">
                                        <AlertTriangle size={12} /> {cameraError}
                                    </div>
                                )}
                                {isCameraOpen && (
                                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black mt-2">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                )}
                            </div>

                            {/* Owner */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 ml-1">เจ้าของรถ</label>
                                <select 
                                    value={form.empId} 
                                    onChange={e => setForm({...form, empId: e.target.value})}
                                    className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100"
                                >
                                    <option value="">-- เลือกพนักงาน --</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Type */}
                            <div className="flex gap-3">
                                <button onClick={() => setForm({...form, type: VehicleType.CAR})} className={`flex-1 py-3 rounded-xl font-bold text-xs border ${form.type === VehicleType.CAR ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-200 text-gray-400'}`}>รถยนต์</button>
                                <button onClick={() => setForm({...form, type: VehicleType.MOTORCYCLE})} className={`flex-1 py-3 rounded-xl font-bold text-xs border ${form.type === VehicleType.MOTORCYCLE ? 'bg-green-50 border-green-500 text-green-600' : 'border-gray-200 text-gray-400'}`}>มอเตอร์ไซค์</button>
                            </div>

                            {/* Details */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 ml-1 mb-1 block">รายละเอียด</label>
                                <input value={form.make} onChange={e => setForm({...form, make: e.target.value})} placeholder="ยี่ห้อ (Toyota)" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100 mb-2" />
                                <div className="flex gap-3">
                                    <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="รุ่น (Altis)" className="flex-1 p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100" />
                                    <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="สี (ขาว)" className="flex-1 p-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100" />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 pt-0 mt-auto">
                            <button onClick={handleSave} className="w-full bg-pastel-accent text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-teal-700 transition-colors">
                                {editingId ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleList;