import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Truck, 
  KeyRound, 
  Mail, 
  Loader2, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login, quickLogin, seeding, seedProgress, isAuthNotAllowed } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Fleet Manager');
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleNormalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError('Please fill in both email and password fields.');
      return;
    }
    setLocalLoading(true);
    try {
      await login(email, password, selectedRole);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Invalid credentials. Feel free to use the Quick Preset buttons below!');
      } else {
        setAuthError(err.message || 'Authentication failed.');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setAuthError('');
    setLocalLoading(true);
    try {
      await quickLogin(role);
    } catch (err: any) {
      console.error(err);
      setAuthError(`Failed to log in as ${role}. Server timeout.`);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div id="login-page" className="min-h-screen flex bg-slate-950 text-slate-100 flex-col md:flex-row relative overflow-hidden">
      {/* Absolute Backdrop ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] animate-pulse"></div>

      {/* Database Seeding Overlay (Shows only on initial run if DB is empty) */}
      {seeding && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/20 mb-6 animate-bounce">
            T
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mb-2">Deploying High-Fidelity Dataset...</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Provisioning TransitOps with 20 Indian vehicles, 30 safety compliance drivers, 50 logistics dispatches, and financial logs.
          </p>
          <div className="flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-[11px] font-mono text-indigo-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{seedProgress}</span>
          </div>
        </div>
      )}

      {/* Left side: Editorial brand billboard */}
      <div className="hidden md:flex md:w-5/12 p-12 flex-col justify-between border-r border-slate-900 bg-slate-950/40 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Truck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">TransitOps</h1>
            <span className="text-[10px] text-indigo-400 font-mono">INTELLIGENT TRANSPORTATION</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Seamless logistics orchestration for India's heavy commercial fleets.
          </h2>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          © 2026 TransitOps India Ltd. Standard locked IST timezone.
        </div>
      </div>

      {/* Right side: Login forms */}
      <div className="flex-1 p-6 md:p-12 flex flex-col justify-center items-center z-10 bg-slate-900/10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold tracking-tight">System Login</h3>
            <p className="text-xs text-slate-400 mt-2">Enter credentials or choose an administrative demo role below.</p>
          </div>



          {authError && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Standard credential login */}
          <form onSubmit={handleNormalLogin} className="space-y-4">
            {/* User Type / Role Selector */}
            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">
                1. SELECT ACCESS PORTAL TYPE
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { r: 'Fleet Manager', label: 'Fleet Manager', desc: 'Full Control' },
                  { r: 'Driver', label: 'Active Driver', desc: 'Trips & Expenses' },
                  { r: 'Safety Officer', label: 'Safety Officer', desc: 'Fleet Compliance' },
                  { r: 'Financial Analyst', label: 'Financial Analyst', desc: 'ROI & Audits' }
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(item.r as UserRole);
                      // Set matching email for easier flow
                      if (item.r === 'Fleet Manager') setEmail('manager@transitops.in');
                      else if (item.r === 'Driver') setEmail('driver@transitops.in');
                      else if (item.r === 'Safety Officer') setEmail('safety@transitops.in');
                      else if (item.r === 'Financial Analyst') setEmail('finance@transitops.in');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedRole === item.r 
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold shadow-md shadow-indigo-600/10' 
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px]">{item.label}</div>
                    <div className="text-[9px] opacity-60 font-medium mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">2. CREDENTIALS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="manager@transitops.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-950 border-slate-800 text-slate-200 text-xs focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1">PASSWORD</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-950 border-slate-800 text-slate-200 text-xs focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            {/* Remember Me / Forgot Password */}
            <div className="flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-400">Remember Me</span>
              </label>
              <span className="text-indigo-400 hover:underline cursor-pointer">Forgot Password?</span>
            </div>

            <button
              type="submit"
              disabled={localLoading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
            >
              {localLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Log In Securely</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
