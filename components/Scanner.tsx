import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Car, Bike, User, AlertCircle, Zap, ZapOff, Search, Scan, Aperture } from 'lucide-react';
import { extractLicensePlate } from '../services/geminiService';
import { findVehicleByPlate, saveLog, getEmployees } from '../services/supabaseService';
import { Employee, Vehicle, VehicleType } from '../types';

interface ScannerProps {
  guardName: string;
}

const Scanner: React.FC<ScannerProps> = ({ guardName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInitRef = useRef(false);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<{ employee: Employee, vehicle: Vehicle | null } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  // Flash Control
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

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
    if (stream || isInitRef.current) return;
    
    // REMOVED: Manual HTTPS check. Letting browser handle permissions naturally.

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorType('ERROR');
        setMessage("เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง (หรือไม่ได้เชื่อมต่อ HTTPS)");
        return;
    }

    isInitRef.current = true;
    setErrorType(null);
    setMessage(null);

    try {
      // Attempt 1: Environment (Rear) Camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 }, // Request higher resolution for AI
            height: { ideal: 720 }
        },
        audio: false // Crucial: Disable audio to prevent extra permission prompts
      });
      handleStreamSuccess(mediaStream);
    } catch (err: any) {
      console.warn("Primary camera failed, trying fallback...", err);
      
      // Attempt 2: Any Camera
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
        });
        handleStreamSuccess(mediaStream);
      } catch (fallbackErr: any) {
        console.warn("Fallback camera error:", fallbackErr);
        setErrorType('ERROR');
        
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
            setErrorType('PERMISSION');
            setMessage("กรุณากด 'อนุญาต' (Allow) เพื่อใช้งานกล้อง");
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
            setMessage("ไม่พบอุปกรณ์กล้อง");
        } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
             setMessage("กล้องถูกใช้งานโดยแอปอื่น");
        } else {
            setMessage(`ไม่สามารถเปิดกล้องได้ (${fallbackErr.name})`);
        }
      }
    } finally {
        isInitRef.current = false;
    }
  };

  const handleStreamSuccess = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
    setErrorType(null);
    setMessage(null);

    const track = mediaStream.getVideoTracks()[0];
    const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
    if (capabilities.torch) {
      setHasFlash(true);
    } else {
      setHasFlash(false);
    }
    setIsFlashOn(false);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsFlashOn(false);
    }
    isInitRef.current = false;
  };

  const toggleFlash = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !isFlashOn }] as any
      });
      setIsFlashOn(!isFlashOn);
    } catch (err) {
      console.error("Flash toggle failed", err);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || analyzing) return;

    setAnalyzing(true);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
    setMessage("AI กำลังวิเคราะห์ภาพ...");

    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      // High quality jpeg for OCR
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);
      
      try {
        const detectedPlate = await extractLicensePlate(imageData);
        
        if (detectedPlate) {
          setMessage(`พบป้ายทะเบียน: ${detectedPlate}`);
          setManualInput(detectedPlate);
          await handleSearch(detectedPlate);
        } else {
          setMessage("ไม่พบป้ายทะเบียน กรุณาลองใหม่");
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }
      } catch (error) {
        console.error("AI Error", error);
        setMessage("ระบบ AI ขัดข้อง");
      }
      setAnalyzing(false);
    }
  };

  const handleSearch = async (plate: string) => {
    setAnalyzing(true);
    const result = await findVehicleByPlate(plate);
    setAnalyzing(false);

    if (result) {
      setScanResult(result);
      setMessage(null);
      if (navigator.vibrate) navigator.vibrate(200);
    } else {
      setScanResult(null);
      setMessage("ไม่พบข้อมูลรถในระบบ");
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
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
      {/* Flash Toggle */}
      {hasFlash && (
        <div className="absolute top-6 right-6 z-50">
           <button 
             onClick={toggleFlash}
             className={`p-3 rounded-full backdrop-blur-md transition-colors shadow-lg ${isFlashOn ? 'bg-yellow-400 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
           >
             {isFlashOn ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
           </button>
        </div>
      )}

      {/* Main Camera Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900">
        {!stream || errorType ? (
           <div className="text-center p-6 max-w-xs animate-in fade-in zoom-in duration-300 z-50 bg-black/60 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400 border border-red-500/30">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm font-bold text-white mb-2">{errorType === 'PERMISSION' ? 'ต้องการสิทธิ์กล้อง' : 'กล้องมีปัญหา'}</p>
              <p className="text-xs text-gray-300 mb-6">{message || "ไม่สามารถเข้าถึงกล้องได้"}</p>
              <button 
                onClick={() => startCamera()}
                className="bg-gradient-to-r from-pastel-accent to-teal-500 text-white px-6 py-3 rounded-full font-bold text-xs hover:scale-105 transition-all shadow-lg active:scale-95 w-full flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> ลองเชื่อมต่อใหม่
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
                
                {/* AI Processing Indicator */}
                {analyzing && (
                    <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-pastel-accent/50 flex items-center gap-3 z-20 animate-in fade-in slide-in-from-top-4 shadow-[0_0_20px_rgba(0,137,123,0.5)]">
                        <Scan className="animate-pulse text-pastel-accent" size={18} />
                        <span className="text-xs font-bold text-pastel-accent tracking-widest">AI ANALYZING...</span>
                    </div>
                )}
                
                {/* High Tech Overlay Grid */}
                {stream && !scanResult && (
                    <div className="relative z-0 w-72 h-48 border-2 border-white/30 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-[2px] transition-all duration-300">
                        {/* Scanning Laser */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-pastel-accent to-transparent animate-[scan_2s_ease-in-out_infinite] opacity-90 blur-[2px]"></div>
                        
                        {/* High Tech Corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-pastel-accent rounded-tl-[28px] -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-pastel-accent rounded-tr-[28px] -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-pastel-accent rounded-bl-[28px] -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-pastel-accent rounded-br-[28px] -mb-1 -mr-1"></div>
                        
                        <div className="absolute -bottom-10 text-white/90 text-[10px] font-bold tracking-[0.2em] bg-black/50 px-4 py-1.5 rounded-full border border-white/10">
                            SCANNING
                        </div>
                    </div>
                )}

                {/* Shutter Button (AI Scan) */}
                {stream && !scanResult && (
                    <div className="absolute bottom-[110px] left-0 right-0 flex justify-center z-30 pointer-events-none">
                        <button 
                            onClick={captureAndAnalyze}
                            disabled={analyzing}
                            className="pointer-events-auto group relative w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-4 border-white/50 flex items-center justify-center transition-all active:scale-95 hover:bg-white/20 disabled:opacity-50"
                        >
                            <div className={`w-16 h-16 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all duration-300 flex items-center justify-center ${analyzing ? 'scale-90 bg-pastel-accent animate-pulse' : 'group-hover:scale-105'}`}>
                                <Aperture size={32} className={analyzing ? 'text-white animate-spin' : 'text-gray-400'} />
                            </div>
                            <div className="absolute -bottom-8 text-white text-[10px] font-bold tracking-widest opacity-80 shadow-black drop-shadow-md">AI CAPTURE</div>
                        </button>
                    </div>
                )}
            </>
        )}
      </div>

      {/* Result Card */}
      {scanResult ? (
        <div className="absolute bottom-[80px] left-0 right-0 bg-white text-pastel-text rounded-t-[40px] p-8 shadow-[0_-10px_60px_rgba(0,0,0,0.3)] animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] z-40 border-t border-white/80">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
          
          <div className="flex items-start gap-6">
            <div className="relative shrink-0">
                <img 
                src={scanResult.employee.photo_url} 
                alt="Employee" 
                className="w-24 h-24 rounded-[24px] object-cover border-4 border-white shadow-xl shadow-gray-200"
                />
                <div className="absolute -bottom-2 -right-2 bg-pastel-accent text-white p-2 rounded-xl border-4 border-white shadow-md">
                    <User size={16} />
                </div>
            </div>
            <div className="flex-1 pt-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-800 leading-tight truncate">
                {scanResult.employee.first_name} 
              </h2>
              <span className="block text-lg font-medium text-gray-500 truncate">{scanResult.employee.last_name}</span>
              
              <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-bold">{scanResult.employee.department}</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-bold">{scanResult.employee.position}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ยานพาหนะที่ตรวจพบ</span>
                 {scanResult.vehicle && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold">MATCHED</span>}
             </div>
             {scanResult.vehicle ? (
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${scanResult.vehicle.type === VehicleType.CAR ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {scanResult.vehicle.type === VehicleType.CAR ? <Car size={20}/> : <Bike size={20}/>}
                  </div>
                  <div>
                      <div className="font-mono font-bold text-xl text-gray-800 tracking-tight">{scanResult.vehicle.license_plate}</div>
                      <div className="text-xs text-gray-500">{scanResult.vehicle.make} {scanResult.vehicle.model}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-orange-500 bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <AlertCircle size={20} />
                    <span className="font-bold text-sm">ไม่พบข้อมูลรถในระบบ</span>
                </div>
              )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <button 
              onClick={() => confirmEntry(VehicleType.CAR)}
              className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-white border-2 border-blue-50 hover:border-blue-500 hover:bg-blue-50 active:scale-95 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-sm">
                  <Car size={20} />
              </div>
              <span className="text-xs font-bold text-gray-600 group-hover:text-blue-700">รถยนต์</span>
            </button>
            <button 
              onClick={() => confirmEntry(VehicleType.MOTORCYCLE)}
              className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-white border-2 border-green-50 hover:border-green-500 hover:bg-green-50 active:scale-95 transition-all"
            >
               <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2 group-hover:bg-green-500 group-hover:text-white transition-colors shadow-sm">
                  <Bike size={20} />
              </div>
              <span className="text-xs font-bold text-gray-600 group-hover:text-green-700">มอเตอร์ไซค์</span>
            </button>
            <button 
              onClick={() => confirmEntry(VehicleType.WIN)}
              className="group flex flex-col items-center justify-center p-4 rounded-3xl bg-white border-2 border-orange-50 hover:border-orange-500 hover:bg-orange-50 active:scale-95 transition-all"
            >
               <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-sm">
                  <User size={20} />
              </div>
              <span className="text-xs font-bold text-gray-600 group-hover:text-orange-700">วิน/อื่นๆ</span>
            </button>
          </div>
          
          <button onClick={() => setScanResult(null)} className="mt-6 w-full py-4 text-gray-400 text-xs font-bold tracking-widest hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-colors">ยกเลิก / ปิด</button>
        </div>
      ) : (
        /* Manual Input Bar */
        <div className="absolute bottom-[80px] left-0 right-0 p-4 z-20 pointer-events-none">
           {message && !errorType && !analyzing && (
             <div className="mb-3 flex justify-center animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg">{message}</span>
             </div>
           )}
           
           <div className="bg-white/90 backdrop-blur-xl p-2 rounded-[28px] shadow-2xl flex gap-2 pointer-events-auto border border-white/50">
             <input 
                type="text" 
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="กรอกทะเบียน..."
                className="flex-1 bg-gray-100 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-pastel-accent outline-none text-base text-gray-700 font-bold placeholder-gray-400"
             />
             <button 
               onClick={() => handleSearch(manualInput)} 
               disabled={analyzing}
               className="bg-pastel-accent text-white rounded-2xl w-14 flex items-center justify-center shadow-lg shadow-teal-200 disabled:opacity-50 active:scale-95 transition-all"
             >
               {analyzing ? <RefreshCw className="animate-spin" size={20} /> : <Search size={24} />}
             </button>
             <button onClick={() => setShowManualSelect(true)} className="bg-gray-100 text-gray-500 rounded-2xl w-14 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all">
                <User size={24} />
             </button>
           </div>
        </div>
      )}

       {/* Manual Employee Selection Modal */}
       {showManualSelect && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 backdrop-blur-sm">
              <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden shadow-2xl mb-[80px] sm:mb-0">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800">เลือกพนักงาน</h3>
                      <button onClick={() => setShowManualSelect(false)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold hover:bg-gray-300 transition-colors">✕</button>
                  </div>
                  <div className="overflow-y-auto p-3 space-y-1">
                      {allEmployees.map(emp => (
                          <div key={emp.id} onClick={() => handleManualEmployeeSelect(emp)} className="flex items-center gap-4 p-3 hover:bg-pastel-blue/10 rounded-2xl cursor-pointer border border-transparent hover:border-pastel-blue/20 transition-all">
                              <img src={emp.photo_url} className="w-12 h-12 rounded-2xl object-cover bg-gray-200 border border-white shadow-sm" alt="" />
                              <div>
                                  <div className="font-bold text-gray-700 text-sm">{emp.first_name} {emp.last_name}</div>
                                  <div className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-lg inline-block mt-1">{emp.department}</div>
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