import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface UnauthorizedAccessProps {
  darkMode: boolean;
  setActiveTab: (tab: string) => void;
}

export const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({ darkMode, setActiveTab }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
      <div className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl animate-bounce">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-tight text-rose-500">Security Rule Violation</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          Your active system role does not have authorization to view this asset ledger. Contact your Fleet Manager for security group promotions.
        </p>
      </div>
      <button
        onClick={() => setActiveTab('dashboard')}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/20 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};
