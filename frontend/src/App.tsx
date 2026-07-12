import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Users, 
  MapPin, 
  Wrench, 
  Droplet, 
  DollarSign, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  Lock, 
  Mail, 
  User as UserIcon,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Phone,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { dbService } from './lib/storage';
import { UserRole } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GlobalDashboardView from './components/GlobalDashboardView';
import FleetManagerView from './components/FleetManagerView';
import DriverDispatcherView from './components/DriverDispatcherView';
import SafetyOfficerView from './components/SafetyOfficerView';
import FinancialAnalystView from './components/FinancialAnalystView';
import DriverView from './components/DriverView';
import CustomerView from './components/CustomerView';
import AccessDenied from './components/AccessDenied';
import { canRoleAccessTab, getRequiredAccessLevel } from './lib/rbac';
import { isRealFirebase, firestoreDb } from './lib/firebase';

export default function App() {
  const { 
    currentUser, 
    loading, 
    login, 
    register, 
    logout, 
    resetPassword, 
    error: authError,
    setError: setAuthError
  } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Auth screen state switcher: 'login' | 'register' | 'forgot_password'
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Interactive input states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('fleet_manager');
  const [rememberMe, setRememberMe] = useState(true);
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Enforce light mode by default
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('transitops_theme');
  }, []);

  // Sync role switch (for simulator)
  const handleRoleSwitch = async (newRole: UserRole) => {
    if (!currentUser) return;
    try {
      setIsSubmitting(true);
      const docRef = firestoreDb.doc(firestoreDb.collection('users'), currentUser.uid);
      const snap = await firestoreDb.getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        await firestoreDb.setDoc(docRef, { ...data, role: newRole });
        dbService.addNotification(
          'Identity Switched', 
          `Switched active role authorization to ${newRole.replace('_', ' ').toUpperCase()}. Synchronizing...`, 
          'info'
        );
        // Force state reload to synchronize completely
        window.location.reload();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Evaluation Quick Presets
  const handlePresetLogin = async (email: string) => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      // Presets use 'Password123!' as default password
      await login(email, 'Password123!', true);
      setActiveTab('dashboard');
    } catch (err: any) {
      setAuthError(err.message || "Failed preset authorization.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual login form
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage('');

    if (!emailInput.trim() || !passwordInput) {
      setAuthError('Please fill in both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(emailInput.trim(), passwordInput, rememberMe);
      setActiveTab('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual registration form
  const handleFormRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage('');

    if (!nameInput.trim() || !emailInput.trim() || !passwordInput || !phoneInput.trim()) {
      setAuthError('Please fill in all registration fields.');
      return;
    }

    if (passwordInput.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(nameInput.trim(), emailInput.trim(), phoneInput.trim(), roleInput, passwordInput);
      setSuccessMessage('Registration completed successfully! Authenticating workspace...');
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 1000);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Check network or email syntax.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle forgot password recovery form
  const handleFormForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage('');

    if (!emailInput.trim()) {
      setAuthError('Please enter your email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(emailInput.trim());
      setSuccessMessage('Password reset link sent to your registered inbox! (Mocked Sandbox Trigger)');
      setEmailInput('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to trigger reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Router matching with RBAC constraint verification
  const renderActiveView = () => {
    if (!currentUser) return null;

    // Direct RBAC Boundary checks: Redirect to Access Denied if unauthorized
    if (!canRoleAccessTab(currentUser.role, activeTab)) {
      return (
        <AccessDenied 
          onBackToDashboard={() => setActiveTab('dashboard')} 
          requiredRole={getRequiredAccessLevel(activeTab)}
          currentRole={currentUser.role}
        />
      );
    }

    // Role Specific Layout Routes
    switch (activeTab) {
      case 'dashboard':
        return <GlobalDashboardView key={`${currentUser.role}-dash`} />;
      
      // Fleet Manager views
      case 'vehicles':
        return <FleetManagerView initialSubTab="registry" />;
      case 'maintenance':
        return <FleetManagerView initialSubTab="maintenance" />;
      case 'documents':
        return <FleetManagerView initialSubTab="documents" />;
      
      // Driver Dispatcher views
      case 'trips':
        return <DriverDispatcherView />;
      
      // Safety Officer views
      case 'drivers':
        return <SafetyOfficerView />;
      
      // Financial Analyst views
      case 'expenses':
        return <FinancialAnalystView initialSubTab="expenses" />;
      case 'fuel':
        return <FinancialAnalystView initialSubTab="fuel" />;
      case 'reports':
        return <FinancialAnalystView initialSubTab="reports" />;
      
      default:
        return <GlobalDashboardView key={`${currentUser.role}-dash`} />;
    }
  };

  // ---------------- GLOBAL SPINNER DURING BOOT/AUTH RESUMES ----------------
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="text-center space-y-4 animate-pulse">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Securing TransitOps Environment</h3>
            <p className="text-[10px] text-slate-500 mt-1">Fetching profiles & verifying authorization sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATION FORMS ----------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden">
        
        {/* Modern ambient blurred background blobs */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-4 animate-pulse">
            <Truck className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Transit<span className="text-blue-500">Ops</span>
          </h2>
          <p className="mt-1.5 text-xs text-slate-400 font-medium">
            Smart Logistical Management & Operations Hub
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
          <div className="bg-slate-900 border border-slate-800/80 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
            
            {/* 1-Click Evaluation Presets */}
            {authScreen === 'login' && (
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase block mb-3 text-center">
                  Quick Access Testing Presets
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handlePresetLogin('manager@transitops.com')}
                    className="p-3 rounded-2xl border border-blue-900/40 bg-blue-950/10 hover:bg-blue-950/30 text-left transition-all group cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <p className="text-xs font-bold text-blue-400 flex items-center justify-between">
                      Fleet Manager <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono">James Carter (Manager)</span>
                  </button>

                  <button
                    onClick={() => handlePresetLogin('dispatcher@transitops.com')}
                    className="p-3 rounded-2xl border border-emerald-900/40 bg-emerald-950/10 hover:bg-emerald-950/30 text-left transition-all group cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                      Driver / Dispatcher <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono">Alexander Mercer (Dispatch)</span>
                  </button>

                  <button
                    onClick={() => handlePresetLogin('safety@transitops.com')}
                    className="p-3 rounded-2xl border border-amber-900/40 bg-amber-950/10 hover:bg-amber-950/30 text-left transition-all group cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <p className="text-xs font-bold text-amber-400 flex items-center justify-between">
                      Safety Officer <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono">Lois Lane (Safety Compliance)</span>
                  </button>

                  <button
                    onClick={() => handlePresetLogin('finance@transitops.com')}
                    className="p-3 rounded-2xl border border-indigo-900/40 bg-indigo-950/10 hover:bg-indigo-950/30 text-left transition-all group cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <p className="text-xs font-bold text-indigo-400 flex items-center justify-between">
                      Financial Analyst <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono">Bruce Wayne (Finance Logs)</span>
                  </button>
                </div>
              </div>
            )}

            {authScreen === 'login' && (
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest">Or Use Credentials</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            )}

            {/* Error and Success notifications */}
            {authError && (
              <div className="rounded-xl bg-red-950/20 border border-red-900/30 p-3 text-xs font-semibold text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span>{authError}</span>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl bg-green-950/20 border border-green-900/30 p-3 text-xs font-semibold text-green-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* LOGIN PANEL */}
            {authScreen === 'login' && (
              <form onSubmit={handleFormLogin} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-400 mb-1">Logistical Email Address</label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="operator@transitops.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => setAuthScreen('forgot_password')}
                      className="text-blue-400 hover:underline text-[10px]"
                    >
                      Forgot Credentials?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-11 text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-slate-350"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0"
                    />
                    <span>Remember Session</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 shadow-md shadow-blue-500/10 cursor-pointer text-xs flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Verifying Session...</span>
                    </>
                  ) : (
                    <span>Authenticate & Enter Hub</span>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 pt-2">
                  New operator?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthScreen('register');
                      setAuthError(null);
                    }}
                    className="text-blue-400 hover:underline"
                  >
                    Create Registered Account
                  </button>
                </p>
              </form>
            )}

            {/* REGISTRATION PANEL */}
            {authScreen === 'register' && (
              <form onSubmit={handleFormRegister} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-400 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="James Carter"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="operator@transitops.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Security Role Profile</label>
                  <div className="relative">
                    <UserCheck className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-3 text-white focus:outline-none"
                    >
                      <option value="fleet_manager">Fleet Manager</option>
                      <option value="driver_dispatcher">Driver / Dispatcher</option>
                      <option value="safety_officer">Safety Officer</option>
                      <option value="financial_analyst">Financial Analyst</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Account Password</label>
                  <div className="relative">
                    <Lock className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 shadow-md shadow-blue-500/10 cursor-pointer text-xs flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <span>Create Registered Account</span>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 pt-2">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthScreen('login');
                      setAuthError(null);
                    }}
                    className="text-blue-400 hover:underline"
                  >
                    Log In
                  </button>
                </p>
              </form>
            )}

            {/* FORGOT PASSWORD PANEL */}
            {authScreen === 'forgot_password' && (
              <form onSubmit={handleFormForgotPassword} className="space-y-4 text-xs font-medium">
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Specify your registered logistical email address below and we will dispatch a simulated credentials retrieval token.
                </p>

                <div>
                  <label className="block text-slate-400 mb-1">Company Email Address</label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3.5 h-4.5 w-4.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="operator@transitops.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-11 pr-4 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 shadow-md shadow-blue-500/10 cursor-pointer text-xs flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <span>Dispatch Recovery Link</span>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 pt-2">
                  Return to{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthScreen('login');
                      setAuthError(null);
                    }}
                    className="text-blue-400 hover:underline"
                  >
                    Credential Log In
                  </button>
                </p>
              </form>
            )}

          </div>

          {/* Engine telemetry indicator */}
          <p className="text-center text-[10px] text-slate-600 mt-6 font-mono">
            Security Status: {isRealFirebase ? '🔒 Real Cloud Firebase Mode Active' : '💾 Persistent Local-Storage Sandbox Enabled'}
          </p>
        </div>
      </div>
    );
  }

  // ---------------- MAIN LOGISTICAL PORTAL ----------------
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F1F5F9] text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Primary Container Frame */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Header Top Nav */}
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onRoleSwitch={handleRoleSwitch}
          onToggleSidebar={toggleSidebar}
        />

        {/* Content Board */}
        <main className="flex-1 overflow-y-auto px-6 py-6 focus:outline-none">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {renderActiveView()}
          </div>
        </main>
      </div>

    </div>
  );
}
