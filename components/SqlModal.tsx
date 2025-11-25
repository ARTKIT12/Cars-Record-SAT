import React from 'react';
import { DB_SCHEMA_SQL } from '../constants';
import { Copy } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SqlModal: React.FC<Props> = ({ onClose }) => {
  const copySql = () => {
    navigator.clipboard.writeText(DB_SCHEMA_SQL);
    alert("Copied SQL to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-pastel-green/20 rounded-t-2xl">
          <h2 className="font-bold text-pastel-text">Supabase SQL Setup</h2>
          <button onClick={onClose} className="text-gray-500 font-bold px-2">X</button>
        </div>
        <div className="p-4 overflow-y-auto bg-gray-900 text-green-400 font-mono text-xs flex-1">
          <pre>{DB_SCHEMA_SQL}</pre>
        </div>
        <div className="p-4 border-t flex justify-end">
          <button onClick={copySql} className="flex items-center gap-2 bg-pastel-accent text-white px-4 py-2 rounded-xl">
            <Copy size={16} /> Copy SQL
          </button>
        </div>
      </div>
    </div>
  );
};

export default SqlModal;