import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import Scanner from './components/Scanner';
import Settings from './components/Settings';
import Reports from './components/Reports';
import EmployeeList from './components/EmployeeList';
import VehicleList from './components/VehicleList';
import { initSupabase } from './services/supabaseService';
import { ShieldCheck, Settings as SettingsIcon, ScanLine, CarFront, Users, FileBarChart, Car, LayoutDashboard } from 'lucide-react';

const DEFAULT_SB_URL = "https://uomtgjcpigkganfcdmge.supabase.co";
const DEFAULT_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbXRnamNwaWdrZ2FuZmNkbWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzY0OTIsImV4cCI6MjA3OTYxMjQ5Mn0.4NGdI1xq93MlGqnvgNPLXMiTiAlQ_DRXGdR5tq1_O6U";

type Tab = 'SCANNER' | 'VEHICLES' | 'EMPLOYEES' | 'REPORTS' | 'SETTINGS';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'LOGIN' | 'APP'>('LOGIN');
  const [activeTab, setActiveTab] = useState<Tab>('SCANNER');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  // Credentials & Settings
  const [sbUrl, setSbUrl] = useState(DEFAULT_SB_URL);
  const [sbKey, setSbKey] = useState(DEFAULT_SB_KEY);

  useEffect(() => {
    // Attempt auto-init
    if(sbUrl && sbKey) {
        initSupabase(sbUrl, sbKey);
    }
  }, [sbUrl, sbKey]);
  
  const handleLogin = (role: UserRole) => {
    if (!initSupabase(sbUrl, sbKey)) {
      alert("กรุณาตั้งค่าฐานข้อมูลก่อน");
      return;
    }
    setUserRole(role);
    setCurrentView('APP');
    setActiveTab('SCANNER');
  };

  const handleSaveSettings = (newUrl: string, newKey: string) => {
      setSbUrl(newUrl);
      setSbKey(newKey);
      initSupabase(newUrl, newKey);
  };

  const TopHeader = () => (
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4 shadow-sm flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-gray-200/50 shrink-0 border border-gray-100 overflow-hidden p-1">
              <img src="logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                  // Fallback if logo.png is missing
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.classList.add('bg-gradient-to-tr', 'from-pastel-accent', 'to-teal-300');
                  e.currentTarget.parentElement!.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h2v-6l2-5h9l-1 5h2"/></svg>';
              }} />
          </div>
          <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">ระบบบันทึกรถของพนักงาน</div>
              <h1 className="font-bold text-pastel-text text-sm leading-tight">บริษัท ซูมิโน อาปิโก(ไทยแลนด์) จำกัด</h1>
          </div>
      </div>
  );

  const BottomNav = () => (
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl shadow-[0_-5px_30px_rgba(0,0,0,0.08)] px-2 py-2 flex justify-around items-center z-40 rounded-t-[30px] border-t border-gray-50 pb-6">
          <NavButton tab="SCANNER" icon={<ScanLine size={22} />} label="สแกน" />
          <NavButton tab="VEHICLES" icon={<Car size={22} />} label="รถยนต์" />
          <NavButton tab="EMPLOYEES" icon={<Users size={22} />} label="พนักงาน" />
          <NavButton tab="REPORTS" icon={<FileBarChart size={22} />} label="รายงาน" />
          <NavButton tab="SETTINGS" icon={<SettingsIcon size={22} />} label="ตั้งค่า" />
      </div>
  );

  const NavButton = ({ tab, icon, label }: { tab: Tab, icon: React.ReactNode, label: string }) => {
      const isActive = activeTab === tab;
      return (
        <button 
            onClick={() => {
                if (tab === 'REPORTS' && userRole !== UserRole.ADMIN) {
                    alert("สำหรับผู้ดูแลระบบเท่านั้น");
                    return;
                }
                setActiveTab(tab);
            }}
            className={`flex flex-col items-center gap-1 transition-all w-16 group relative`}
        >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                isActive 
                ? 'bg-gradient-to-tr from-pastel-green to-teal-100 text-teal-800 shadow-lg shadow-teal-100 -translate-y-3 scale-110' 
                : 'text-gray-300 group-hover:text-gray-500'
            }`}>
                {icon}
            </div>
            <span className={`text-[9px] font-bold transition-all duration-300 ${
                isActive ? 'text-teal-700 -translate-y-1' : 'text-gray-300 scale-0 h-0'
            }`}>{label}</span>
            
            {isActive && <div className="absolute -bottom-2 w-1 h-1 bg-teal-500 rounded-full"></div>}
        </button>
      );
  };

  // Login Screen
  if (currentView === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6 font-sans text-pastel-text relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-pastel-pink/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-pastel-blue/40 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 border border-white z-10 animate-fade-in">
          <div className="text-center mb-10 mt-4">
            <div className="w-24 h-24 bg-white rounded-[30px] mx-auto mb-6 shadow-xl shadow-teal-100 flex items-center justify-center p-2 border border-gray-50">
                <img src="logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.classList.add('bg-gradient-to-tr', 'from-pastel-green', 'to-pastel-blue');
                    e.currentTarget.parentElement!.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 10c-.8-1.7-2.7-3-5.5-3-3.6 0-6.5 2.5-6.5 6s3 5.5 6.5 5.5c2.8 0 4.8-1.3 5.5-3"/><path d="M19 10c.8-1.7 2.7-3 5.5-3 3.6 0 6.5 2.5 6.5 6s-3 5.5-6.5 5.5c-2.8 0-4.8-1.3-5.5-3"/></svg>'; 
                }} />
            </div>
            <h1 className="text-xl font-bold mb-1 text-gray-800">ระบบบันทึกรถของพนักงาน</h1>
            <p className="text-gray-500 text-xs font-medium">บริษัท ซูมิโน อาปิโก(ไทยแลนด์) จำกัด</p>
          </div>

          <div className="grid gap-4 mb-8">
            <button onClick={() => handleLogin(UserRole.GUARD)} className="w-full bg-gradient-to-r from-pastel-accent to-teal-600 hover:to-teal-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                 <ScanLine size={20} /> เข้าสู่ระบบ รปภ.
            </button>
            <button onClick={() => handleLogin(UserRole.ADMIN)} className="w-full bg-white border-2 border-gray-100 hover:border-pastel-blue text-gray-500 hover:text-pastel-blue font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                 <ShieldCheck size={20} /> ผู้ดูแลระบบ
            </button>
          </div>

          <div className="text-center">
             <button onClick={() => { setCurrentView('APP'); setActiveTab('SETTINGS'); }} className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-pastel-accent transition-colors bg-gray-50 px-4 py-2 rounded-full">
               <SettingsIcon size={14} /> ตั้งค่าการเชื่อมต่อ
             </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App Layout
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-pastel-text">
        {activeTab !== 'SCANNER' && <TopHeader />}
        
        <div className="max-w-md mx-auto h-full">
            {activeTab === 'SCANNER' && (
                <div className="h-screen bg-black relative">
                    {/* Floating Back Button for Scanner */}
                    <div className="absolute top-6 left-6 z-50">
                        <button onClick={() => setCurrentView('LOGIN')} className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors">
                            <LayoutDashboard size={20} />
                        </button>
                    </div>
                    <Scanner guardName={userRole === UserRole.ADMIN ? 'Admin' : 'Guard'} />
                </div>
            )}
            
            {activeTab === 'VEHICLES' && <VehicleList />}
            
            {activeTab === 'EMPLOYEES' && <EmployeeList />}
            
            {activeTab === 'REPORTS' && <Reports />}
            
            {activeTab === 'SETTINGS' && (
                <Settings 
                    initialUrl={sbUrl} 
                    initialKey={sbKey} 
                    onBack={() => userRole ? setActiveTab('SCANNER') : setCurrentView('LOGIN')}
                    onSave={handleSaveSettings}
                />
            )}
        </div>

        {activeTab !== 'SCANNER' && <BottomNav />}
    </div>
  );
};

export default App;