import React from 'react';
import { 
  BarChart3, 
  Truck, 
  Wrench, 
  ClipboardList, 
  Users, 
  MapPin, 
  FileText, 
  Compass, 
  Bell, 
  User as UserIcon, 
  CreditCard, 
  MessageSquare, 
  Settings, 
  History, 
  Droplet, 
  Calendar,
  Layers,
  TrendingUp,
  X,
  ShieldCheck,
  LogOut,
  Navigation
} from 'lucide-react';
import { User, UserRole } from '../types';
import { ROLE_NAVIGATION, NavItem } from '../lib/rbac';

interface SidebarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  isOpen,
  onClose
}: SidebarProps) {
  if (!currentUser) return null;

  // Role themes for elegant visual indicator
  const roleThemes: Record<UserRole, { color: string; bg: string; activeBorder: string }> = {
    fleet_manager: { color: 'text-blue-400', bg: 'bg-blue-600/10', activeBorder: 'border-blue-500' },
    driver_dispatcher: { color: 'text-emerald-400', bg: 'bg-emerald-600/10', activeBorder: 'border-emerald-500' },
    safety_officer: { color: 'text-amber-400', bg: 'bg-amber-600/10', activeBorder: 'border-amber-500' },
    financial_analyst: { color: 'text-indigo-400', bg: 'bg-indigo-600/10', activeBorder: 'border-indigo-500' }
  };

  const activeTheme = roleThemes[currentUser.role] || roleThemes.fleet_manager;

  // Icon mapping helper
  const getIconForTab = (id: string) => {
    switch (id) {
      case 'dashboard': return <BarChart3 className="h-5 w-5" />;
      case 'fleet': return <Layers className="h-5 w-5" />;
      case 'vehicles': case 'assigned_vehicle': return <Truck className="h-5 w-5" />;
      case 'maintenance': return <Wrench className="h-5 w-5" />;
      case 'documents': case 'invoices': return <ClipboardList className="h-5 w-5" />;
      case 'drivers': return <Users className="h-5 w-5" />;
      case 'customers': return <Users className="h-5 w-5" />;
      case 'routes': return <MapPin className="h-5 w-5" />;
      case 'trips': case 'assigned_trips': case 'my_trips': return <Compass className="h-5 w-5" />;
      case 'bookings': return <Calendar className="h-5 w-5" />;
      case 'reports': return <FileText className="h-5 w-5" />;
      case 'analytics': return <BarChart3 className="h-5 w-5" />;
      case 'revenue': case 'payments': return <CreditCard className="h-5 w-5" />;
      case 'notifications': return <Bell className="h-5 w-5" />;
      case 'users': return <Users className="h-5 w-5" />;
      case 'settings': return <Settings className="h-5 w-5" />;
      case 'trip_history': return <History className="h-5 w-5" />;
      case 'fuel_logs': return <Droplet className="h-5 w-5" />;
      case 'profile': return <UserIcon className="h-5 w-5" />;
      case 'support': return <MessageSquare className="h-5 w-5" />;
      case 'tracking': return <Navigation className="h-5 w-5" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  const navItems = ROLE_NAVIGATION[currentUser.role] || [];

  // Group items by category to make a highly structured, dense layout
  const categories = Array.from(new Set(navItems.map(item => item.category)));

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/80 bg-[#0F172A] dark:bg-slate-950 transition-transform lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-xl`}
      >
        {/* Header brand details */}
        <div className="flex h-16 items-center justify-between bg-[#1E293B] border-b border-slate-800 px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500 text-white font-black text-lg">
              T
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">TransitOps</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info Capsule */}
        <div className="border-b border-slate-800/80 p-4 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/50 text-slate-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Security</p>
              <p className="text-sm font-bold text-white truncate max-w-[140px]">{currentUser.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs grouped by Category */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-4">
          {categories.map((cat) => (
            <div key={cat} className="space-y-0.5">
              <div className="px-6 py-1 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                {cat}
              </div>
              {navItems.filter(item => item.category === cat).map((item) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 px-6 py-2 text-xs font-medium transition-colors text-left border-r-4 ${
                      isSelected 
                        ? `${activeTheme.bg} ${activeTheme.color} ${activeTheme.activeBorder}` 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white border-transparent'
                    }`}
                    id={`sidebar-tab-${item.id}`}
                  >
                    <div className="w-5 flex justify-center">
                      {getIconForTab(item.id)}
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout section */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/20">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition-colors cursor-pointer"
            id="sidebar-logout-btn"
          >
            <LogOut className="h-5 w-5 text-slate-500 group-hover:text-red-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
