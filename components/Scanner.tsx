import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Car, Bike, User, AlertCircle } from 'lucide-react';
import { extractLicensePlate } from '../services/geminiService';
import { findVehicleByPlate, saveLog, getEmployees } from '../services/supabaseService';
import { Employee, Vehicle, VehicleType } from '../types';

interface ScannerProps {
  guardName: string;
}

const Scanner: React.FC<ScannerProps> = ({ guardName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<{ employee: Employee, vehicle: Vehicle | null } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
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
    setErrorType(null);
    setMessage(null);
    
    if (stream) return;

    try {
      // Attempt 1: Try environment facing mode (rear camera)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      handleStreamSuccess(mediaStream);
    } catch (err: any) {
      console.warn("Environment camera failed, trying fallback...", err);
      
      // Attempt 2: Fallback to any video device
      // We do not return early on 'NotAllowedError' here anymore, 
      // just in case the error was specific to the 'environment' constraint on some devices.
      
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        handleStreamSuccess(mediaStream);
      } catch (fallbackErr: any) {
        console.error("Fallback camera error:", fallbackErr);
        setErrorType('ERROR');
        
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
            setErrorType('PERMISSION');
            setMessage("สิทธิ์การเข้าถึงกล้องถูกปฏิเสธ กรุณาอนุญาตที่ช่อง URL ของเบราว์เซอร์");
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
            setMessage("ไม่พบอุปกรณ์กล้อง");
        } else {
            setMessage(`ไม่สามารถเปิดกล้องได้ (${fallbackErr.name || 'Unknown'})`);
        }
      }
    }
  };

  const handleStreamSuccess = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
    setErrorType(null);
    setMessage(null);
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
      // Haptic feedback on success
      if (navigator.vibrate) {
          navigator.vibrate(200);
      }
    } else {
      setScanResult(null);
      setMessage("ไม่พบข้อมูลรถในระบบ");
    }
  };

  const confirmEntry = async (overrideType?: VehicleType) => {
    if (!scanResult) return;
    
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
      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
        {!stream && errorType ? (
           <div className="text-center p-6 max-w-xs animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm font-bold text-red-200 mb-4">{message}</p>
              <button 
                onClick={() => startCamera()}
                className="bg-white text-gray-900 px-6 py-2 rounded-full font-bold text-xs hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
              >
                ลองใหม่อีกครั้ง
              </button>
           </div>
        ) : (
            <>
                <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanning Overlay Grid */}
                {stream && (
                    <div className="relative z-0 w-72 h-44 border-2 border-pastel-green/60 rounded-xl shadow-[0_0_30px_rgba(224,242,241,0.2)] flex items-center justify-center backdrop-blur-[2px]">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                        <div className="absolute top-[-20px] bg-black/60 px-3 py-1 rounded-full text-[10px] tracking-wider text-pastel-green font-bold">LICENSE PLATE AREA</div>
                        
                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg -mb-1 -mr-1"></div>
                    </div>
                )}
            </>
        )}
      </div>

      {/* Result Card (Slide Up) */}
      {scanResult ? (
        <div className="absolute bottom-[80px] left-0 right-0 bg-white text-pastel-text rounded-t-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out] z-20">
          <div className="flex items-start gap-4">
            <img 
              src={scanResult.employee.photo_url} 
              alt="Employee" 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-pastel-blue shadow-lg"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-pastel-accent">
                {scanResult.employee.first_name} {scanResult.employee.last_name}
              </h2>
              <p className="text-sm text-gray-500 font-medium">{scanResult.employee.department}</p>
              <p className="text-xs text-gray-400">{scanResult.employee.position}</p>
              
              {scanResult.vehicle ? (
                <div className="mt-2 bg-pastel-green/30 px-3 py-1 rounded-lg inline-flex items-center gap-2">
                  <Car size={14} className="text-teal-700" />
                  <span className="font-mono font-bold text-teal-800 text-sm">{scanResult.vehicle.license_plate}</span>
                </div>
              ) : (
                <div className="mt-2 text-orange-500 text-xs font-medium bg-orange-100 px-3 py-1 rounded-lg inline-block">ไม่พบรถที่ลงทะเบียน</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <button 
              onClick={() => confirmEntry(VehicleType.CAR)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all active:scale-95 border border-blue-100"
            >
              <Car className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">รถยนต์</span>
            </button>
            <button 
              onClick={() => confirmEntry(VehicleType.MOTORCYCLE)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-green-50 hover:bg-green-100 text-green-700 transition-all active:scale-95 border border-green-100"
            >
              <Bike className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">มอเตอร์ไซค์</span>
            </button>
            <button 
              onClick={() => confirmEntry(VehicleType.WIN)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition-all active:scale-95 border border-orange-100"
            >
              <User className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">วิน/อื่นๆ</span>
            </button>
          </div>
          
          <button onClick={() => setScanResult(null)} className="mt-4 w-full py-3 text-gray-400 text-xs font-bold tracking-wider hover:text-gray-600">ยกเลิก</button>
        </div>
      ) : (
        /* Manual Entry Bar */
        <div className="absolute bottom-[80px] left-0 right-0 bg-white p-6 rounded-t-3xl z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
           {message && !errorType && (
             <div className="mb-3 flex justify-center">
                <span className="text-xs font-bold text-white bg-pastel-accent/90 px-3 py-1 rounded-full animate-pulse shadow-lg">{message}</span>
             </div>
           )}
           
           <div className="flex gap-3">
             <input 
                type="text" 
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="กรอกทะเบียน (เช่น 1กก-9999)"
                className="flex-1 bg-gray-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-pastel-accent outline-none text-lg text-gray-700 font-medium placeholder-gray-400"
             />
             <button 
               onClick={() => handleSearch(manualInput)} 
               disabled={analyzing}
               className="bg-pastel-accent text-white rounded-2xl px-6 font-bold shadow-lg shadow-teal-200 disabled:opacity-50 active:scale-95 transition-all"
             >
               {analyzing ? <RefreshCw className="animate-spin" /> : 'ค้นหา'}
             </button>
           </div>
           
           <div className="mt-5 flex justify-between items-center px-1">
             <button onClick={() => { stopCamera(); startCamera(); }} className="flex items-center gap-2 text-pastel-accent font-bold text-sm bg-pastel-accent/10 px-4 py-2 rounded-xl hover:bg-pastel-accent/20 transition-colors">
                <Camera size={18} /> สแกนใหม่
             </button>
             <button onClick={() => setShowManualSelect(true)} className="text-gray-400 text-xs font-bold tracking-wide hover:text-gray-600">
                ค้นหาชื่อพนักงาน
             </button>
           </div>
        </div>
      )}

       {/* Manual Employee Selection Modal */}
       {showManualSelect && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden shadow-2xl mb-[80px] sm:mb-0">
                  <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800">เลือกพนักงาน</h3>
                      <button onClick={() => setShowManualSelect(false)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">✕</button>
                  </div>
                  <div className="overflow-y-auto p-2">
                      {allEmployees.map(emp => (
                          <div key={emp.id} onClick={() => handleManualEmployeeSelect(emp)} className="flex items-center gap-4 p-4 hover:bg-pastel-blue/10 rounded-2xl cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                              <img src={emp.photo_url} className="w-12 h-12 rounded-full object-cover bg-gray-200 border-2 border-white shadow-sm" alt="" />
                              <div>
                                  <div className="font-bold text-gray-700">{emp.first_name} {emp.last_name}</div>
                                  <div className="text-xs text-gray-400 font-medium">{emp.department} • {emp.position}</div>
                              </div>
                          </div>
                      ))}
                      {allEmployees.length === 0 && (
                          <div className="p-8 text-center text-gray-400">ไม่พบข้อมูลพนักงาน</div>
                      )}
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default Scanner;