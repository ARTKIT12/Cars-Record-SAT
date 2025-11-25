import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import Scanner from './components/Scanner';
import AdminDashboard from './components/AdminDashboard';
import SqlModal from './components/SqlModal';
import { initSupabase, isSupabaseConfigured } from './services/supabaseService';
import { ShieldCheck, Database, LogIn, LayoutDashboard, ScanLine } from 'lucide-react';

const App: React.FC = () => {
  // Simple State-based Routing
  const [currentView, setCurrentView] = useState<'LOGIN' | 'SCANNER' | 'ADMIN'>('LOGIN');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [showSql, setShowSql] = useState(false);
  
  // Credentials (In real app, use env)
  const [sbUrl, setSbUrl] = useState(process.env.SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(process.env.SUPABASE_KEY || '');
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  
  const handleLogin = (role: UserRole) => {
    if (!sbUrl || !sbKey) {
      alert("กรุณากรอก Supabase URL และ Key ก่อนเริ่มใช้งาน");
      return;
    }
    
    const success = initSupabase(sbUrl, sbKey);
    if (success) {
      setCurrentUserRole(role);
      setCurrentView(role === UserRole.ADMIN ? 'ADMIN' : 'SCANNER');
    } else {
        alert("การเชื่อมต่อฐานข้อมูลล้มเหลว");
    }
  };

  const TopBar = () => (
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-pastel-accent to-teal-300 rounded-lg flex items-center justify-center text-white font-bold">
                  S
              </div>
              <span className="font-bold text-pastel-text text-lg tracking-tight">SoftGuard</span>
          </div>
          <div className="flex gap-3">
              <button onClick={() => setShowSql(true)} className="p-2 text-gray-400 hover:text-pastel-accent transition-colors">
                  <Database size={20} />
              </button>
          </div>
      </div>
  );

  const BottomNav = () => (
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.05)] px-8 py-4 flex justify-around items-center z-40 rounded-t-3xl">
          <button 
            onClick={() => setCurrentView('SCANNER')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'SCANNER' ? 'text-pastel-accent -translate-y-2' : 'text-gray-300'}`}
          >
              <div className={`p-3 rounded-full ${currentView === 'SCANNER' ? 'bg-pastel-green shadow-lg shadow-teal-100' : 'bg-transparent'}`}>
                <ScanLine size={24} />
              </div>
              <span className="text-[10px] font-medium">สแกน</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('ADMIN')}
            className={`flex flex-col items-center gap-1 transition-all ${currentView === 'ADMIN' ? 'text-pastel-accent -translate-y-2' : 'text-gray-300'}`}
          >
              <div className={`p-3 rounded-full ${currentView === 'ADMIN' ? 'bg-pastel-blue shadow-lg shadow-blue-100' : 'bg-transparent'}`}>
                <LayoutDashboard size={24} />
              </div>
              <span className="text-[10px] font-medium">แอดมิน</span>
          </button>
      </div>
  );

  // VIEW: Login Screen
  if (currentView === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6 font-sans text-pastel-text">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-white">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-pastel-green to-pastel-blue rounded-3xl mx-auto mb-4 shadow-lg shadow-teal-100 flex items-center justify-center">
                <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gray-800">SoftGuard</h1>
            <p className="text-gray-400">ระบบบันทึกรถเข้า-ออกอัจฉริยะ</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="space-y-2">
                <label className="text-xs font-bold ml-1 text-gray-400">DATABASE SETUP</label>
                <input 
                    type="text" 
                    placeholder="Supabase URL"
                    value={sbUrl}
                    onChange={e => setSbUrl(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none"
                />
                <input 
                    type="password" 
                    placeholder="Supabase Anon Key" 
                    value={sbKey}
                    onChange={e => setSbKey(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none"
                />
            </div>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => handleLogin(UserRole.GUARD)}
              className="w-full bg-pastel-accent hover:bg-teal-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-200 transition-all active:scale-95 flex justify-center items-center gap-3"
            >
              <ScanLine /> เข้าสู่ระบบ รปภ.
            </button>
            <button 
              onClick={() => handleLogin(UserRole.ADMIN)}
              className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
            >
              ผู้ดูแลระบบ
            </button>
          </div>
          
          <div className="mt-8 text-center">
             <button onClick={() => setShowSql(true)} className="text-xs text-pastel-accent underline">
               แสดง SQL สำหรับสร้างตาราง
             </button>
          </div>
        </div>
        {showSql && <SqlModal onClose={() => setShowSql(false)} />}
      </div>
    );
  }

  // VIEW: Scanner (Full Screen)
  if (currentView === 'SCANNER') {
    return (
      <div className="h-screen bg-black">
        <Scanner onBack={() => setCurrentView('LOGIN')} guardName="Guard 01" />
      </div>
    );
  }

  // VIEW: Admin (Dashboard)
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-pastel-text">
        <TopBar />
        <div className="max-w-md mx-auto">
            <AdminDashboard />
        </div>
        <BottomNav />
        {showSql && <SqlModal onClose={() => setShowSql(false)} />}
    </div>
  );
};

export default App;