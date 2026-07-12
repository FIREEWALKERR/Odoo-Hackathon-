import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
  onBackToDashboard: () => void;
  requiredRole?: string;
  currentRole?: string;
}

export default function AccessDenied({ onBackToDashboard, requiredRole, currentRole }: AccessDeniedProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-white/75 p-8 text-center shadow-xl backdrop-blur-xl dark:border-red-900/30 dark:bg-slate-900/85 max-w-md w-full animate-fade-in">
        {/* Glow Effects */}
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-red-500/10 blur-2xl"></div>
        <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-red-500/5 blur-2xl"></div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 mb-6 border border-red-100 dark:border-red-900/20">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white mb-2">
          Access Authorization Denied
        </h2>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          Your current security clearance role <strong className="text-slate-800 dark:text-slate-200">({currentRole?.replace('_', ' ').toUpperCase() || 'UNKNOWN'})</strong> does not possess the permissions required to view this panel.
        </p>

        {requiredRole && (
          <div className="mb-6 rounded-xl bg-slate-50 border border-slate-100 p-3 text-left font-mono text-[10px] text-slate-500 dark:bg-slate-950/40 dark:border-slate-800/80 dark:text-slate-400">
            <span className="font-bold text-red-500">Security Requirement:</span> Requires level {requiredRole.replace('_', ' ').toUpperCase()} access.
          </div>
        )}

        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
