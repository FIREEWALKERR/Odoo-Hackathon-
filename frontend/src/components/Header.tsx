import React, { useState } from 'react';
import { 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Shuffle, 
  ShieldAlert, 
  Menu,
  Check,
  CheckCheck,
  Trash,
  Database
} from 'lucide-react';
import { User, UserRole } from '../types';
import { dbService, authService } from '../lib/storage';
import { useConfirm } from './ConfirmProvider';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onRoleSwitch: (role: UserRole) => void;
  onToggleSidebar: () => void;
}

export default function Header({
  currentUser,
  onLogout,
  onRoleSwitch,
  onToggleSidebar
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { confirm } = useConfirm();
  
  const notifications = dbService.getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dbService.markNotificationAsRead(id);
    // Trigger render by resetting notifications
    setShowNotifications(true);
  };

  const handleClearAll = () => {
    dbService.clearAllNotifications();
    setShowNotifications(false);
  };

  const handleClearDatabase = async () => {
    const ok = await confirm({
      title: 'Clear Operational Database',
      message: 'Are you sure you want to clear all operational data (vehicles, drivers, trips, maintenance, fuel, expenses)? This will start with an entirely clean slate.',
      confirmText: 'Clear All Data',
      cancelText: 'Keep Data',
      type: 'danger'
    });
    if (ok) {
      dbService.clearAllData();
      window.location.reload();
    }
  };

  const handleLoadDemoData = async () => {
    const ok = await confirm({
      title: 'Restore Demo Database',
      message: 'Do you want to restore the pre-populated demo database for testing and evaluation?',
      confirmText: 'Restore Demo Data',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (ok) {
      dbService.loadDemoData();
      window.location.reload();
    }
  };

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    fleet_manager: { label: 'Fleet Manager', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    driver_dispatcher: { label: 'Driver / Dispatcher', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    safety_officer: { label: 'Safety Officer', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    financial_analyst: { label: 'Financial Analyst', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      
      {/* Left section: Toggle sidebar + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          id="sidebar-toggle-btn"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="hidden flex-col sm:flex">
          <span className="font-mono text-[10px] tracking-wider text-slate-400 dark:text-slate-500 uppercase font-bold">Operations Hub</span>
          <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Transit<span className="text-blue-600 dark:text-blue-400">Ops</span></h1>
        </div>
      </div>

      {/* Center: Role Simulator Quick Access (High-visibility testing utility) */}
      {currentUser && (
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-0.5 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 max-w-full overflow-x-auto scrollbar-none">
          <span className="hidden px-2 py-1 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 md:inline-flex items-center gap-1 uppercase tracking-wider">
            <Shuffle className="h-3 w-3 text-slate-400" /> Switch Role:
          </span>
          <div className="flex gap-0.5">
            {(Object.keys(roleLabels) as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => onRoleSwitch(r)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-tight transition-all ${
                  currentUser.role === r
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
                id={`switch-role-${r}`}
              >
                {r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right Section: Notif + User details */}
      <div className="flex items-center gap-3">

        {/* Notifications */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-900"
              id="notifications-dropdown-btn"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-950">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <span className="font-semibold text-gray-900 dark:text-white">System Alerts</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-500 font-medium flex items-center gap-1"
                    >
                      <Trash className="h-3.5 w-3.5" /> Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                      <CheckCheck className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-1" />
                      <span className="text-xs">No active alerts or warnings</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-900">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 ${
                            !n.read ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''
                          }`}
                        >
                          <div className="mt-0.5">
                            {n.type === 'danger' && <ShieldAlert className="h-4.5 w-4.5 text-red-500" />}
                            {n.type === 'warning' && <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />}
                            {n.type === 'success' && <Check className="h-4.5 w-4.5 text-green-500" />}
                            {n.type === 'info' && <Bell className="h-4.5 w-4.5 text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">{n.title}</span>
                              {!n.read && (
                                <button
                                  onClick={(e) => handleMarkAsRead(n.id, e)}
                                  className="text-[10px] text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  Mark Read
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{n.message}</p>
                            <span className="mt-2 block text-[9px] text-gray-400 dark:text-gray-500">{n.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none"
              id="user-profile-menu-btn"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${roleLabels[currentUser.role]?.color}`}>
                  {roleLabels[currentUser.role]?.label}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1 shadow-xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-900 mb-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                </div>
                
                <button
                  onClick={handleLoadDemoData}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                  id="btn-load-demo-data"
                >
                  <Database className="h-4 w-4" /> Load Demo Data
                </button>

                <button
                  onClick={handleClearDatabase}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                  id="btn-clear-database"
                >
                  <Trash className="h-4 w-4" /> Clear All Data
                </button>

                <div className="border-t border-gray-100 dark:border-gray-900 my-1"></div>

                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  id="logout-btn"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
