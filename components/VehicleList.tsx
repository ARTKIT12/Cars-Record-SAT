import React, { useState, useEffect, useRef } from 'react';
import { getVehicles, addVehicle, deleteVehicle, getEmployees } from '../services/supabaseService';
import { extractLicensePlate } from '../services/geminiService';
import { Vehicle, Employee, VehicleType } from '../types';
import { Plus, Trash2, Car, Bike, Camera, X, Loader2, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

const VehicleList: React.FC = () => {
    const [vehicles, setVehicles] = useState<(Vehicle & { employee?: Employee })[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
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

    const handleSave = async () => {
        if (!form.plate || !form.empId) return alert('กรุณาระบุเลขทะเบียนและเจ้าของรถ');
        
        // Ensure type is valid (default to CAR if weirdness happens)
        const typeToSend = form.type === VehicleType.MOTORCYCLE ? VehicleType.MOTORCYCLE : VehicleType.CAR;

        const { error } = await addVehicle({
            license_plate: form.plate.trim(),
            type: typeToSend,
            make: form.make || null,   // Send null if empty
            model: form.model || null, // Send null if empty
            color: form.color || null, // Send null if empty
            employee_id: form.empId,
            photo_url: 'https://placehold.co/100x100/e2e8f0/64748b?text=Vehicle'
        }) as any;

        if (error) {
            console.error("Registration Error:", error);
            // Translate common errors
            if (error.code === '23505') { // Unique violation
                alert(`เกิดข้อผิดพลาด: ทะเบียนรถ ${form.plate} มีอยู่ในระบบแล้ว`);
            } else if (error.code === '42703') { // Undefined column
                alert("เกิดข้อผิดพลาด: ฐานข้อมูลไม่รองรับข้อมูลใหม่ กรุณาไปที่หน้าตั้งค่า > SQL Table Setup และรันคำสั่ง SQL เพื่ออัปเดตตาราง");
            } else {
                alert(`บันทึกไม่สำเร็จ: ${error.message || 'กรุณาลองใหม่'}`);
            }
            return; 
        }

        alert("ลงทะเบียนรถสำเร็จ!");
        stopCamera();
        setShowModal(false);
        loadData();
    };

    const startCamera = async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            handleStream(stream);
        } catch (e: any) {
            console.warn("Env camera failed, trying fallback");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                handleStream(stream);
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
        
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
        const plate = await extractLicensePlate(imageData);
        
        if (plate) {
            setForm(prev => ({ ...prev, plate }));
            stopCamera();
        } else {
            alert('มองไม่เห็นป้ายทะเบียน กรุณาลองใหม่');
        }
        setAnalyzing(false);
    };

    return (
        <div className="p-4 pb-24 animate-fade-in">
             <button 
                onClick={() => { setForm({plate: '', type: VehicleType.CAR, make: '', model: '', color: '', empId: ''}); setShowModal(true); }} 
                className="w-full bg-white border-2 border-dashed border-pastel-accent/40 text-pastel-accent font-bold py-5 rounded-3xl flex items-center justify-center gap-3 mb-6 hover:bg-pastel-accent/5 hover:border-pastel-accent transition-all group shadow-sm"
             >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pastel-accent to-teal-300 text-white flex items-center justify-center shadow-lg shadow-teal-200 group-hover:scale-110 transition-transform">
                    <Plus size={18} />
                </div>
                <span className="text-sm tracking-wide">ลงทะเบียนรถใหม่</span>
            </button>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-pastel-accent" /></div>
            ) : (
                <div className="space-y-4">
                    {vehicles.map(v => (
                        <div key={v.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4 relative group hover:shadow-md transition-all">
                            <div className={`p-4 rounded-2xl shadow-inner ${
                                v.type === VehicleType.CAR 
                                    ? 'bg-gradient-to-br from-blue-50 to-white border border-blue-100 text-blue-500' 
                                    : 'bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 text-emerald-500'
                            }`}>
                                {v.type === VehicleType.CAR ? <Car size={26} /> : <Bike size={26} />}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-gray-800 text-lg font-mono tracking-tight">{v.license_plate}</div>
                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                    <span className="bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{v.make || '-'}</span>
                                    <span>{v.model}</span>
                                    {v.color && <span className="w-2 h-2 rounded-full bg-gray-300 mx-1"></span>}
                                    {v.color}
                                </div>
                                {v.employee && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 p-0.5">
                                            <img src={v.employee.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-bold">
                                            {v.employee.first_name} {v.employee.last_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => handleDelete(v.id)} className="absolute top-4 right-4 p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {vehicles.length === 0 && (
                        <div className="text-center py-12 flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                <Car size={32} />
                            </div>
                            <span className="text-gray-400 text-sm">ยังไม่มีรถในระบบ</span>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <div className="bg-pastel-accent p-1.5 rounded-lg text-white"><Sparkles size={14} /></div>
                                ลงทะเบียนรถ
                            </h3>
                            <button onClick={() => { stopCamera(); setShowModal(false); }} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 hover:bg-gray-50"><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Camera Section */}
                            <div className="bg-white p-1 rounded-2xl border-2 border-pastel-blue/20 shadow-sm overflow-hidden">
                                <div className="bg-pastel-blue/5 p-4 rounded-xl">
                                    <div className="flex gap-2 mb-2">
                                        <input value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} placeholder="ทะเบียนรถ" className="flex-1 p-3 rounded-xl border border-gray-200 text-lg font-bold text-center uppercase focus:ring-2 focus:ring-pastel-accent outline-none text-gray-700 placeholder-gray-300" />
                                        <button onClick={isCameraOpen ? capture : startCamera} className="bg-gradient-to-b from-pastel-accent to-teal-600 text-white px-4 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200 active:scale-95 transition-transform">
                                            {analyzing ? <Loader2 className="animate-spin" /> : <Camera />}
                                        </button>
                                    </div>
                                    {cameraError && (
                                        <div className="text-xs text-red-500 flex items-center gap-1 mb-2 bg-red-50 p-2 rounded-lg border border-red-100">
                                            <AlertTriangle size={12} /> {cameraError}
                                        </div>
                                    )}
                                    {isCameraOpen && (
                                        <div className="relative rounded-xl overflow-hidden aspect-video bg-black shadow-inner ring-4 ring-white">
                                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                            <canvas ref={canvasRef} className="hidden" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Owner */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block uppercase tracking-wider">เจ้าของรถ (Owner)</label>
                                <div className="relative">
                                    <select 
                                        value={form.empId} 
                                        onChange={e => setForm({...form, empId: e.target.value})}
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-pastel-accent appearance-none text-gray-700 font-medium"
                                    >
                                        <option value="">-- เลือกพนักงาน --</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.department})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                                </div>
                            </div>

                            {/* Type */}
                            <div className="flex gap-3">
                                <button onClick={() => setForm({...form, type: VehicleType.CAR})} className={`flex-1 py-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-2 border-2 transition-all ${form.type === VehicleType.CAR ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-50 text-gray-400 bg-gray-50'}`}>
                                    <Car size={20} className={form.type === VehicleType.CAR ? 'text-blue-500' : 'text-gray-300'} /> รถยนต์
                                </button>
                                <button onClick={() => setForm({...form, type: VehicleType.MOTORCYCLE})} className={`flex-1 py-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-2 border-2 transition-all ${form.type === VehicleType.MOTORCYCLE ? 'border-green-400 bg-green-50 text-green-600 shadow-md' : 'border-gray-50 text-gray-400 bg-gray-50'}`}>
                                    <Bike size={20} className={form.type === VehicleType.MOTORCYCLE ? 'text-green-500' : 'text-gray-300'} /> มอเตอร์ไซค์
                                </button>
                            </div>

                            {/* Details */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 ml-1 mb-1 block uppercase tracking-wider">รายละเอียด (Details)</label>
                                <div className="space-y-3">
                                    <input value={form.make} onChange={e => setForm({...form, make: e.target.value})} placeholder="ยี่ห้อ (เช่น Toyota)" className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pastel-accent" />
                                    <div className="flex gap-3">
                                        <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="รุ่น (เช่น Altis)" className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pastel-accent" />
                                        <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="สี (เช่น ขาว)" className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pastel-accent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 pt-0 mt-auto">
                            <button onClick={handleSave} className="w-full bg-gradient-to-r from-pastel-accent to-teal-600 hover:to-teal-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-teal-200 transition-all active:scale-95 flex justify-center items-center gap-2">
                                <Sparkles size={18} /> บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleList;