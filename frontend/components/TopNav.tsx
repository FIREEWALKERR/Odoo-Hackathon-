import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Sun, Moon, LogOut, ShieldAlert, CheckCircle, AlertTriangle, UserCheck, RefreshCw, Search } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemNotification, UserRole } from '../types';

interface TopNavProps {
  darkMode: boolean;
  activeTab: string;
  setActiveTab: (val: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ darkMode, activeTab, setActiveTab }) => {
  const { userProfile, logout, quickLogin, seeding, triggerDatabaseSeeding } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [istTime, setIstTime] = useState('');

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setIstTime(new Intl.DateTimeFormat('en-IN', options).format(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to in-app notifications
  useEffect(() => {
    const q = query(collection(db, 'notifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SystemNotification[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SystemNotification);
      });
      // Sort by newest
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(list);
    }, (err) => {
      console.error('Error fetching notifications:', err);
    });

    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // In a real app we might delete, or update. Let's just mark read as true or delete. Let's update read: true
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Failed to update notification:', err);
    }
  };

  const handleRoleSwitch = async (role: UserRole) => {
    try {
      await quickLogin(role);
      setShowProfileMenu(false);
      // Reset active tab to home on role switch to avoid RBAC violations
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to switch roles:', err);
    }
  };

  return (
    <header id="top-navigation" className={`h-16 border-b flex items-center justify-between px-6 z-20 ${
      darkMode ? 'bg-[#0B0F19] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Search & Dynamic Clock */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64 md:w-80 sm:block hidden">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
          <input 
            type="text" 
            placeholder="Search Fleet, Drivers, or Trips..." 
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
              darkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            }`} 
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-medium shrink-0">
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
            IST
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-bold">{istTime || '14:24 PM'}</span>
        </div>
      </div>

      {/* Action controllers */}
      <div className="flex items-center gap-4">
        {/* Static Role Badge */}
        <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
          <span>Role:</span>
          <span>{userProfile?.role || 'Guest'}</span>
        </div>

        {/* Reseed Data utility */}
        <button 
          onClick={triggerDatabaseSeeding}
          disabled={seeding}
          className={`px-2.5 py-1 text-xs border rounded-md flex items-center gap-1.5 font-semibold tracking-wide transition ${
            darkMode 
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
          }`}
          title="Reset & Reseed Demo Data"
        >
          <RefreshCw className={`w-3 h-3 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Seeding...' : 'Reseed Demo'}</span>
        </button>



        {/* System alerts & notifications trigger */}
        <div className="relative">
          <button
            id="notification-trigger"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markAllAsRead();
            }}
            className={`p-2 rounded-lg border transition relative ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div id="notification-popover" className={`absolute right-0 mt-3 w-80 rounded-xl shadow-2xl border p-4 z-50 ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-sm">System Alerts</span>
                <span className="text-xs text-indigo-500 font-medium cursor-pointer" onClick={markAllAsRead}>Mark all read</span>
              </div>
              <div className="max-h-72 overflow-y-auto mt-2 space-y-2.5 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No active system alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => deleteNotification(n.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition relative group ${
                        !n.read 
                          ? (darkMode ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-100')
                          : (darkMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50/50 border-slate-100 text-slate-500')
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'danger' && <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                        {n.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                        {n.type === 'info' && <UserCheck className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-semibold text-xs leading-tight">{n.title}</div>
                          <div className="mt-1 leading-normal text-[11px]">{n.message}</div>
                          <div className="mt-1.5 text-[10px] text-slate-400 font-mono">
                            {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown info */}
        <div className="flex items-center gap-2 border-l pl-4 border-slate-200 dark:border-slate-800">
          <div className="text-right sm:block hidden">
            <div className="text-xs font-semibold leading-none">{userProfile?.name || 'Loading...'}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">{userProfile?.role}</div>
          </div>
          <button
            id="logout-button"
            onClick={logout}
            className={`p-2 rounded-lg border transition ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-red-400' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-red-500'
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
