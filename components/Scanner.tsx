import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, Car, Bike, User } from 'lucide-react';
import { extractLicensePlate } from '../services/geminiService';
import { findVehicleByPlate, saveLog, getEmployees } from '../services/supabaseService';
import { Employee, Vehicle, VehicleType } from '../types';

interface ScannerProps {
  onBack: () => void;
  guardName: string;
}

const Scanner: React.FC<ScannerProps> = ({ onBack, guardName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<{ employee: Employee, vehicle: Vehicle | null } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    startCamera();
    fetchEmployees();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = async () => {
      const emps = await getEmployees();
      setAllEmployees(emps);
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setMessage("ไม่สามารถเข้าถึงกล้องได้");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setAnalyzing(true);
    setMessage("กำลังอ่านป้ายทะเบียนด้วย AI...");

    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      // 1. Try Gemini OCR
      const detectedPlate = await extractLicensePlate(imageData);
      
      if (detectedPlate) {
        setMessage(`อ่านป้ายได้: ${detectedPlate} - กำลังค้นหาข้อมูล...`);
        setManualInput(detectedPlate);
        await handleSearch(detectedPlate);
      } else {
        setMessage("อ่านป้ายไม่ชัดเจน กรุณากรอกด้วยมือ");
        setAnalyzing(false);
      }
    }
  };

  const handleSearch = async (plate: string) => {
    setAnalyzing(true);
    const result = await findVehicleByPlate(plate);
    setAnalyzing(false);

    if (result) {
      setScanResult(result);
      setMessage(null);
    } else {
      setScanResult(null);
      setMessage("ไม่พบข้อมูลรถในระบบ");
    }
  };

  const confirmEntry = async (overrideType?: VehicleType) => {
    if (!scanResult) return;
    
    // Determine type: if override is provided (e.g. they came with diff vehicle) use that, otherwise use registered vehicle type
    const type = overrideType || scanResult.vehicle?.type || VehicleType.WIN;
    const vehicleId = (overrideType && overrideType !== scanResult.vehicle?.type) ? null : scanResult.vehicle?.id || null;

    try {
      await saveLog(scanResult.employee.id, vehicleId, type, guardName);
      alert(`บันทึกสำเร็จ: ${scanResult.employee.first_name} (${type === VehicleType.WIN ? 'วิน/อื่นๆ' : type})`);
      setScanResult(null);
      setManualInput('');
      setShowManualSelect(false);
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleManualEmployeeSelect = (emp: Employee) => {
      setScanResult({ employee: emp, vehicle: null });
      setShowManualSelect(false);
      setManualInput('');
  }

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
        <button onClick={onBack} className="text-white/80 text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
          &larr; กลับหน้าหลัก
        </button>
        <div className="text-white font-bold text-lg drop-shadow-md">Scan Access</div>
        <div className="w-16"></div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scanning Overlay Grid */}
        <div className="relative z-0 w-64 h-40 border-2 border-pastel-green/50 rounded-lg shadow-[0_0_20px_rgba(224,242,241,0.3)] flex items-center justify-center">
             <div className="absolute inset-0 border-t-2 border-b-2 border-white/30 animate-pulse"></div>
             <span className="text-xs text-white/50 bg-black/50 px-2 py-1 rounded">กรอบป้ายทะเบียน</span>
        </div>
      </div>

      {/* Result Card (Slide Up) */}
      {scanResult ? (
        <div className="absolute bottom-0 left-0 right-0 bg-white text-pastel-text rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out] z-20">
          <div className="flex items-start gap-4">
            <img 
              src={scanResult.employee.photo_url} 
              alt="Employee" 
              className="w-20 h-20 rounded-full object-cover border-4 border-pastel-blue shadow-lg"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-pastel-accent">
                {scanResult.employee.first_name} {scanResult.employee.last_name}
              </h2>
              <p className="text-sm text-gray-500">{scanResult.employee.department} - {scanResult.employee.position}</p>
              
              {scanResult.vehicle ? (
                <div className="mt-2 bg-pastel-green/30 p-2 rounded-lg inline-block">
                  <span className="font-mono font-bold text-pastel-accent">{scanResult.vehicle.license_plate}</span>
                  <span className="text-xs ml-2 text-gray-600">({scanResult.vehicle.type})</span>
                </div>
              ) : (
                <div className="mt-2 text-orange-500 text-sm font-medium">ไม่พบรถที่ลงทะเบียน / นั่งวิน</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <button 
              onClick={() => confirmEntry(VehicleType.CAR)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-pastel-blue/20 hover:bg-pastel-blue text-pastel-text transition-colors border border-pastel-blue/50"
            >
              <Car className="w-6 h-6 mb-1 text-blue-600" />
              <span className="text-xs font-medium">รถยนต์</span>
            </button>
            <button 
              onClick={() => confirmEntry(VehicleType.MOTORCYCLE)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-pastel-green/20 hover:bg-pastel-green text-pastel-text transition-colors border border-pastel-green/50"
            >
              <Bike className="w-6 h-6 mb-1 text-teal-600" />
              <span className="text-xs font-medium">มอเตอร์ไซค์</span>
            </button>
            <button 
              onClick={() => confirmEntry(VehicleType.WIN)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-pastel-pink/40 hover:bg-pastel-pink text-pastel-text transition-colors border border-pastel-pink/50"
            >
              <User className="w-6 h-6 mb-1 text-pink-600" />
              <span className="text-xs font-medium">วิน/ไม่มีรถ</span>
            </button>
          </div>
          
          <button onClick={() => setScanResult(null)} className="mt-4 w-full py-2 text-gray-400 text-sm">ยกเลิก</button>
        </div>
      ) : (
        /* Manual Entry Bar */
        <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl z-20 shadow-lg">
           {message && <div className="mb-2 text-center text-sm text-pastel-accent animate-pulse">{message}</div>}
           
           <div className="flex gap-2">
             <input 
                type="text" 
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="กรอกทะเบียนรถ (เช่น 1กก-9999)"
                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-pastel-accent outline-none text-lg"
             />
             <button 
               onClick={() => handleSearch(manualInput)} 
               disabled={analyzing}
               className="bg-pastel-accent text-white rounded-xl px-6 font-medium shadow-lg shadow-teal-200 disabled:opacity-50"
             >
               {analyzing ? <RefreshCw className="animate-spin" /> : 'ค้นหา'}
             </button>
           </div>
           
           <div className="mt-3 flex justify-between items-center">
             <button onClick={captureAndAnalyze} className="flex items-center gap-2 text-pastel-accent font-medium text-sm">
                <Camera size={18} /> ถ่ายภาพสแกน
             </button>
             <button onClick={() => setShowManualSelect(true)} className="text-gray-400 text-sm underline">
                ค้นหาชื่อพนักงาน
             </button>
           </div>
        </div>
      )}

       {/* Manual Employee Selection Modal */}
       {showManualSelect && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg">เลือกพนักงาน</h3>
                      <button onClick={() => setShowManualSelect(false)} className="text-gray-500">Close</button>
                  </div>
                  <div className="overflow-y-auto p-2">
                      {allEmployees.map(emp => (
                          <div key={emp.id} onClick={() => handleManualEmployeeSelect(emp)} className="flex items-center gap-3 p-3 hover:bg-pastel-blue/20 rounded-lg cursor-pointer border-b border-gray-100 last:border-0">
                              <img src={emp.photo_url} className="w-10 h-10 rounded-full object-cover bg-gray-200" alt="" />
                              <div>
                                  <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                                  <div className="text-xs text-gray-500">{emp.department}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default Scanner;