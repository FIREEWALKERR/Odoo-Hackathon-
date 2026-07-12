import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Navigation, 
  Wrench, 
  FileText, 
  AlertTriangle, 
  Settings,
  HelpCircle,
  TrendingUp,
  Fuel
} from 'lucide-react';

interface SidebarProps {
  darkMode: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ darkMode, activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'Driver';

  // Determine tab permissions
  const hasAccess = (tab: string): boolean => {
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

  // Define full menu structure
  const menuItems = [
    { id: 'dashboard', label: 'Operations Desk', icon: LayoutDashboard, category: 'Core' },
    { id: 'vehicles', label: 'Vehicle Fleet', icon: Truck, category: 'Assets' },
    { id: 'drivers', label: 'Driver Compliance', icon: Users, category: 'Assets' },
    { id: 'trips', label: 'Trip Dispatches', icon: Navigation, category: 'Operations' },
    { id: 'maintenance', label: 'Maintenance Logs', icon: Wrench, category: 'Operations' },
    { id: 'expenses', label: 'Fuel & Expenses', icon: Fuel, category: 'Finance' },
    { id: 'reports', label: 'Reports & ROI', icon: TrendingUp, category: 'Finance' },
  ];

  // Filter items or show as disabled
  const allowedMenuItems = menuItems.filter(item => hasAccess(item.id));

  // Group by category
  const categories = Array.from(new Set(allowedMenuItems.map(item => item.category)));

  return (
    <aside id="sidebar-navigation" className="w-64 border-r border-[#1E293B] flex flex-col justify-between h-screen shrink-0 bg-[#0F172A] text-slate-200 z-30">
      {/* Branding Header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm shadow-md shadow-indigo-600/20">
            <Truck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">TransitOps</h1>
            <p className="text-[9px] text-indigo-400 font-medium tracking-widest uppercase">Smart Fleet Hub</p>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="px-3 py-4 space-y-4 flex-1 overflow-y-auto">
          {categories.map(category => (
            <div key={category} className="space-y-1">
              <span className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {category}
              </span>
              <div className="space-y-0.5">
                {allowedMenuItems
                  .filter(item => item.category === category)
                  .map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Branding or Settings */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
            {userProfile?.name?.substring(0, 2) || 'TO'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate leading-tight">{userProfile?.name || 'Arjun Mehta'}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{userProfile?.role || 'Fleet Manager'}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
          <span>v2.1.0-prod</span>
          <span className="text-indigo-400">Locked IST</span>
        </div>
      </div>
    </aside>
  );
};
