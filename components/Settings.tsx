import React, { useState, useEffect } from 'react';
import { Save, Database, Play, ArrowLeft, Coins, Calculator } from 'lucide-react';
import { initSupabase, getEmployees } from '../services/supabaseService';
import { DB_SCHEMA_SQL } from '../constants';
import { ExpenseRates } from '../types';

interface SettingsProps {
  onBack: () => void;
  initialUrl: string;
  initialKey: string;
  onSave: (url: string, key: string, rates: ExpenseRates) => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, initialUrl, initialKey, onSave }) => {
  const [url, setUrl] = useState(initialUrl);
  const [key, setKey] = useState(initialKey);
  const [rates, setRates] = useState<ExpenseRates>({ car: 90, moto: 70, win: 70 });
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    const savedRates = localStorage.getItem('EXPENSE_RATES');
    if (savedRates) {
      setRates(JSON.parse(savedRates));
    }
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    const initialized = initSupabase(url, key);
    if (!initialized) {
      setTestStatus('ERROR');
      return;
    }

    try {
      const data = await getEmployees();
      if (Array.isArray(data)) {
        setTestStatus('SUCCESS');
      } else {
        setTestStatus('ERROR');
      }
    } catch (e) {
      setTestStatus('ERROR');
    }
  };

  const handleSave = () => {
    localStorage.setItem('EXPENSE_RATES', JSON.stringify(rates));
    onSave(url, key, rates);
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    onBack();
  };

  const copySql = () => {
    navigator.clipboard.writeText(DB_SCHEMA_SQL);
    alert("คัดลอก SQL เรียบร้อยแล้ว");
  };

  if (showSql) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col font-mono text-xs">
        <div className="p-4 bg-gray-800 flex justify-between items-center shadow-md">
          <h2 className="font-bold text-lg text-pastel-accent flex items-center gap-2">
            <Database size={18} /> Database Schema
          </h2>
          <button onClick={() => setShowSql(false)} className="text-gray-400 hover:text-white">
            ปิด
          </button>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <pre className="text-green-400 whitespace-pre-wrap">{DB_SCHEMA_SQL}</pre>
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
           <button onClick={copySql} className="bg-pastel-accent hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-sans font-bold shadow-lg transition-all active:scale-95">
             คัดลอกโค้ด SQL
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col pb-24">
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-pastel-text">การตั้งค่าระบบ</h1>
      </div>

      <div className="p-6 max-w-lg mx-auto w-full space-y-6 animate-fade-in">
        
        {/* Expense Rates Card */}
        <div className="glass-panel bg-white/60 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-pastel-pink text-pink-600">
              <Coins size={24} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">อัตราค่าเดินทาง</h2>
              <p className="text-xs text-gray-400">Expense Rates Configuration</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-4">
               <label className="w-32 text-sm font-bold text-gray-500">รถยนต์ (บาท)</label>
               <input 
                 type="number"
                 value={rates.car}
                 onChange={e => setRates({...rates, car: Number(e.target.value)})}
                 className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pastel-accent outline-none"
               />
            </div>
            <div className="flex items-center gap-4">
               <label className="w-32 text-sm font-bold text-gray-500">มอเตอร์ไซค์ (บาท)</label>
               <input 
                 type="number"
                 value={rates.moto}
                 onChange={e => setRates({...rates, moto: Number(e.target.value)})}
                 className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pastel-accent outline-none"
               />
            </div>
            <div className="flex items-center gap-4">
               <label className="w-32 text-sm font-bold text-gray-500">นั่งวิน/อื่นๆ (บาท)</label>
               <input 
                 type="number"
                 value={rates.win}
                 onChange={e => setRates({...rates, win: Number(e.target.value)})}
                 className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pastel-accent outline-none"
               />
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="glass-panel bg-white/60 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-pastel-blue text-blue-600">
              <Database size={24} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">ฐานข้อมูล</h2>
              <p className="text-xs text-gray-400">Supabase Connection</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1 mb-1 block">PROJECT URL</label>
              <input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1 mb-1 block">ANON KEY</label>
              <input 
                value={key}
                onChange={(e) => setKey(e.target.value)}
                type="password"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pastel-accent outline-none text-gray-600 font-mono"
              />
            </div>
          </div>

          {testStatus !== 'IDLE' && (
             <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
               testStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' : 
               testStatus === 'ERROR' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
             }`}>
                <div className={`w-2 h-2 rounded-full ${
                  testStatus === 'SUCCESS' ? 'bg-green-500' : 
                  testStatus === 'ERROR' ? 'bg-red-500' : 'bg-gray-500 animate-pulse'
                }`} />
                {testStatus === 'TESTING' && 'Connecting...'}
                {testStatus === 'SUCCESS' && 'Connected Successfully'}
                {testStatus === 'ERROR' && 'Connection Failed'}
             </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-6">
             <button 
                onClick={handleTestConnection}
                disabled={testStatus === 'TESTING'}
                className="py-3 px-4 rounded-xl border-2 border-pastel-blue text-pastel-text font-bold text-xs hover:bg-pastel-blue/20 transition-colors flex items-center justify-center gap-2"
             >
               <Play size={14} /> ทดสอบการเชื่อมต่อ
             </button>
             <button 
                onClick={() => setShowSql(true)}
                className="py-3 px-4 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
             >
               <Database size={14} /> SQL Table Setup
             </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-pastel-accent hover:bg-teal-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-200 transition-all active:scale-95 flex justify-center items-center gap-3"
        >
          <Save size={20} /> บันทึกการตั้งค่า
        </button>

      </div>
    </div>
  );
};

export default Settings;