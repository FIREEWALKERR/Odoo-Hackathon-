import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../../../src/context/AuthContext';
import { Sidebar } from '../../../src/components/Sidebar';
import { TopNav } from '../../../src/components/TopNav';
import { DashboardOverview } from '../../../src/components/DashboardOverview';
import { VehicleManager } from '../../../src/components/VehicleManager';
import { DriverManager } from '../../../src/components/DriverManager';
import { TripManager } from '../../../src/components/TripManager';
import { MaintenanceModule } from '../../../src/components/MaintenanceModule';
import { FuelExpenseModule } from '../../../src/components/FuelExpenseModule';
import { ReportsAnalytics } from '../../../src/components/ReportsAnalytics';
import { UnauthorizedAccess } from '../../../src/components/UnauthorizedAccess';
import { Login } from '../../../src/components/Login';
import { Loader2 } from 'lucide-react';

function DashboardLayout() {
  const { currentUser, userProfile, loading } = useAuth();
  const darkMode = true;
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-xs font-mono text-slate-400">Verifying secure operations session...</p>
      </div>
    );
  }

  // Enforce secure client-side role based route guards
  const hasRouteAccess = (tab: string): boolean => {
    const role = userProfile?.role;
    if (!role) return false;
    if (role === 'Fleet Manager') return true;

    switch (tab) {
      case 'dashboard':
        return true;
      case 'vehicles':
        return role === 'Safety Officer' || role === 'Financial Analyst';
      case 'drivers':
        return role === 'Safety Officer';
      case 'trips':
        return role === 'Driver' || role === 'Safety Officer';
      case 'maintenance':
        return role === 'Financial Analyst';
      case 'expenses':
        return role === 'Financial Analyst' || role === 'Driver';
      case 'reports':
        return role === 'Financial Analyst' || role === 'Safety Officer';
      default:
        return false;
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F1F5F9] text-slate-800'}`}>
      {/* Dynamic responsive sidebar */}
      <Sidebar darkMode={darkMode} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main active work viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopNav darkMode={darkMode} activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Render screens based on tab selection with active route guarding */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!hasRouteAccess(activeTab) ? (
            <UnauthorizedAccess darkMode={darkMode} setActiveTab={setActiveTab} />
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardOverview darkMode={darkMode} setActiveTab={setActiveTab} />}
              {activeTab === 'vehicles' && <VehicleManager darkMode={darkMode} />}
              {activeTab === 'drivers' && <DriverManager darkMode={darkMode} />}
              {activeTab === 'trips' && <TripManager darkMode={darkMode} />}
              {activeTab === 'maintenance' && <MaintenanceModule darkMode={darkMode} />}
              {activeTab === 'expenses' && <FuelExpenseModule darkMode={darkMode} />}
              {activeTab === 'reports' && <ReportsAnalytics darkMode={darkMode} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardLayout />
    </AuthProvider>
  );
}
