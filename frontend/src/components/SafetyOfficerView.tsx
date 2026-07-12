import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  CheckCircle, 
  Mail, 
  Edit,
  AlertTriangle,
  History,
  Phone,
  Contact,
  X,
  UserCheck2,
  CalendarDays,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { dbService } from '../lib/storage';
import { Driver, LicenseCategory, DriverStatus } from '../types';
import DashboardStats from './DashboardStats';
import { useConfirm } from './ConfirmProvider';

export default function SafetyOfficerView() {
  const [drivers, setDrivers] = useState<Driver[]>(() => dbService.getDrivers());
  const { confirm } = useConfirm();

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modals state
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [driverForScore, setDriverForScore] = useState<Driver | null>(null);

  // Form Fields - Driver
  const [drvName, setDrvName] = useState('');
  const [drvLicense, setDrvLicense] = useState('');
  const [drvCategory, setDrvCategory] = useState<LicenseCategory>('Class A CDL');
  const [drvExpiry, setDrvExpiry] = useState('');
  const [drvContact, setDrvContact] = useState('');
  const [drvScore, setDrvScore] = useState<number>(90);
  const [drvStatus, setDrvStatus] = useState<DriverStatus>('Available');

  // Form Fields - Score Modifier
  const [newScore, setNewScore] = useState<number>(90);

  // Feedback
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const syncDB = () => {
    setDrivers(dbService.getDrivers());
  };

  // KPIs
  const stats = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let nearExpiry = 0;
    let suspended = 0;
    let sumScore = 0;

    drivers.forEach(d => {
      const expiry = new Date(d.expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) expired++;
      else if (diffDays <= 30) nearExpiry++;

      if (d.status === 'Suspended') suspended++;
      sumScore += d.safetyScore;
    });

    const avgScore = drivers.length > 0 ? Math.round(sumScore / drivers.length) : 100;

    return { expired, nearExpiry, suspended, avgScore };
  }, [drivers]);

  const kpis = [
    {
      title: 'Expired CDL Licenses',
      value: `${stats.expired} Drivers`,
      icon: <ShieldAlert className="h-5 w-5" />,
      color: 'bg-red-100 dark:bg-red-950/40',
      textColor: 'text-red-600 dark:text-red-400',
      description: 'Strictly prohibited from driving',
      badge: { 
        text: stats.expired > 0 ? 'Action Required' : 'All clear', 
        type: (stats.expired > 0 ? 'danger' : 'success') as 'danger' | 'success'
      }
    },
    {
      title: 'Licenses Near Expiry',
      value: `${stats.nearExpiry} Drivers`,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'bg-amber-100 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      description: 'Expires within 30 days',
      badge: { 
        text: stats.nearExpiry > 0 ? 'Email reminders sent' : 'Optimal', 
        type: (stats.nearExpiry > 0 ? 'warning' : 'success') as 'warning' | 'success'
      }
    },
    {
      title: 'Suspended Operators',
      value: `${stats.suspended} Suspended`,
      icon: <UserX className="h-5 w-5" />,
      color: 'bg-rose-100 dark:bg-rose-950/40',
      textColor: 'text-rose-600 dark:text-rose-400',
      description: 'Suspended due to safety score',
      badge: { text: 'Crews Flagged', type: 'danger' as const }
    },
    {
      title: 'Avg Fleet Safety Score',
      value: `${stats.avgScore}% Score`,
      icon: <ShieldCheck className="h-5 w-5" />,
      color: 'bg-green-100 dark:bg-green-950/40',
      textColor: 'text-green-600 dark:text-green-400',
      description: 'Goal: Minimum 80% average',
      badge: { 
        text: stats.avgScore > 80 ? 'Optimal' : 'Low', 
        type: (stats.avgScore > 80 ? 'success' : 'warning') as 'success' | 'warning'
      }
    }
  ];

  // Filtering
  const filteredDrivers = useMemo(() => {
    let result = [...drivers];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        d => 
          d.name.toLowerCase().includes(term) || 
          d.licenseNumber.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(d => d.status === statusFilter);
    }

    if (categoryFilter !== 'All') {
      result = result.filter(d => d.licenseCategory === categoryFilter);
    }

    return result;
  }, [drivers, searchTerm, statusFilter, categoryFilter]);

  // Handle Driver Submit
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!drvName.trim() || !drvLicense.trim() || !drvContact.trim()) {
      setFormError('Please complete name, CDL license, and contact details.');
      return;
    }

    try {
      if (editingDriver) {
        dbService.editDriver(editingDriver.id, {
          name: drvName,
          licenseNumber: drvLicense,
          licenseCategory: drvCategory,
          expiryDate: drvExpiry,
          contact: drvContact,
          safetyScore: Number(drvScore),
          status: drvStatus
        });
        triggerToast(`Driver compliance profiles updated: ${drvName}.`);
      } else {
        dbService.addDriver({
          name: drvName,
          licenseNumber: drvLicense,
          licenseCategory: drvCategory,
          expiryDate: drvExpiry,
          contact: drvContact,
          safetyScore: Number(drvScore),
          status: drvStatus
        });
        triggerToast(`Registered new commercial driver: ${drvName}.`);
      }
      syncDB();
      setShowDriverModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Error occurred.');
    }
  };

  // Suspend
  const handleSuspend = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Suspend Driver CDL License',
      message: `Are you sure you want to suspend driver ${name} from logging routes immediately?`,
      confirmText: 'Suspend Driver',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (ok) {
      dbService.suspendDriver(id);
      triggerToast(`Suspended driver: ${name}.`);
      syncDB();
    }
  };

  // Reinstate
  const handleReinstate = (id: string, name: string) => {
    dbService.reinstateDriver(id);
    triggerToast(`Reinstated driver: ${name} to Available.`);
    syncDB();
  };

  // Trigger simulated warning email
  const handleSendReminder = (name: string, expiry: string) => {
    triggerToast(`Sent renewal email alert to ${name} regarding license expiring ${expiry}.`);
    dbService.addAuditLog('Compliance Alert', `Dispatched automated license renewal warning email to driver ${name}`);
  };

  // Launch Score Modal
  const openScoreModal = (d: Driver) => {
    setFormError('');
    setDriverForScore(d);
    setNewScore(d.safetyScore);
    setShowScoreModal(true);
  };

  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForScore) return;

    try {
      dbService.editDriver(driverForScore.id, { safetyScore: Number(newScore) });
      
      // Auto-suspension check if safety score drops below 60
      if (newScore < 60 && driverForScore.status !== 'Suspended') {
        dbService.suspendDriver(driverForScore.id);
        triggerToast(`Updated safety score. Driver ${driverForScore.name} auto-suspended due to unsafe safety rating (${newScore}%).`);
      } else {
        triggerToast(`Adjusted safety score for ${driverForScore.name} to ${newScore}%.`);
      }
      
      syncDB();
      setShowScoreModal(false);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const openDriverModal = (d: Driver | null = null) => {
    setFormError('');
    if (d) {
      setEditingDriver(d);
      setDrvName(d.name);
      setDrvLicense(d.licenseNumber);
      setDrvCategory(d.licenseCategory);
      setDrvExpiry(d.expiryDate);
      setDrvContact(d.contact);
      setDrvScore(d.safetyScore);
      setDrvStatus(d.status);
    } else {
      setEditingDriver(null);
      setDrvName('');
      setDrvLicense('');
      setDrvCategory('Class A CDL');
      setDrvExpiry(new Date(Date.now() + 31536000000).toISOString().split('T')[0]); // +1 year
      setDrvContact('');
      setDrvScore(90);
      setDrvStatus('Available');
    }
    setShowDriverModal(true);
  };

  return (
    <div className="space-y-6" id="safety-container">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Safety & Compliance Auditor</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Track driver licenses, CDL categories, safety ratings, and suspension histories</p>
        </div>
        <button
          onClick={() => openDriverModal(null)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 cursor-pointer"
          id="btn-add-driver"
        >
          <UserPlus className="h-4 w-4" /> Add Driver Profile
        </button>
      </div>

      {/* KPIs */}
      <DashboardStats metrics={kpis} />

      {/* Driver List Section */}
      <div className="space-y-4">
        {/* Search / Filters Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search driver by name, CDL number..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="All">All License Types</option>
              <option value="Class A CDL">Class A CDL</option>
              <option value="Class B CDL">Class B CDL</option>
              <option value="Class C CDL">Class C CDL</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="Off Duty">Off Duty</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Drivers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrivers.map((d) => {
            const isExpired = new Date(d.expiryDate) < new Date();
            const isExpiring = !isExpired && (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;

            const scoreColors = d.safetyScore >= 85 
              ? 'text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400' 
              : d.safetyScore >= 70 
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400' 
                : 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400';

            return (
              <div 
                key={d.id} 
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between"
                id={`driver-card-${d.id}`}
              >
                <div>
                  {/* Status header */}
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                      d.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-200' :
                      d.status === 'On Trip' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      d.status === 'Suspended' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {d.status}
                    </span>
                    
                    <div className={`px-2 py-1 rounded-xl text-xs font-bold font-mono ${scoreColors}`}>
                      Safety: {d.safetyScore}%
                    </div>
                  </div>

                  {/* Profile info */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-bold flex items-center justify-center text-sm">
                      {d.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{d.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{d.licenseCategory} • {d.licenseNumber}</p>
                    </div>
                  </div>

                  {/* Expiration Details */}
                  <div className="mt-4 border-t border-gray-50 pt-3 dark:border-gray-900 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" /> License Expiration:
                      </span>
                      <span className={`font-mono font-bold ${
                        isExpired ? 'text-red-600' : isExpiring ? 'text-amber-500' : 'text-gray-800 dark:text-gray-300'
                      }`}>
                        {d.expiryDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> Direct Contact:
                      </span>
                      <span className="text-gray-800 dark:text-gray-300 font-mono">{d.contact}</span>
                    </div>
                  </div>

                  {/* Warnings warnings */}
                  {isExpired && (
                    <div className="mt-3 rounded-lg bg-red-50 p-2 text-[10px] text-red-700 dark:bg-red-950/20 dark:text-red-400 font-medium flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" /> Driver forbidden from scheduling routes.
                    </div>
                  )}

                  {isExpiring && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-2 text-[10px] text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 font-medium flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> CDL Expiration warnings.
                      </div>
                      <button
                        onClick={() => handleSendReminder(d.name, d.expiryDate)}
                        className="text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-0.5 font-bold text-[9px] cursor-pointer"
                      >
                        <Mail className="h-3 w-3" /> Email Alert
                      </button>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-900 flex gap-2">
                  <button
                    onClick={() => openDriverModal(d)}
                    className="flex-1 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-850 dark:hover:bg-gray-900 text-[10px] font-bold text-gray-700 dark:text-gray-300 py-2 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Profile
                  </button>

                  <button
                    onClick={() => openScoreModal(d)}
                    className="rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-gray-850 dark:hover:bg-gray-900 text-[10px] font-bold text-gray-700 dark:text-gray-300 px-3 py-2 flex items-center justify-center gap-1 cursor-pointer"
                    title="Edit Safety score"
                  >
                    Modify Rating
                  </button>

                  {d.status === 'Suspended' ? (
                    <button
                      onClick={() => handleReinstate(d.id, d.name)}
                      className="rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-900 text-[10px] font-bold text-green-700 dark:text-green-400 px-3 py-2 cursor-pointer"
                      id={`btn-reinstate-${d.id}`}
                    >
                      Reinstate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuspend(d.id, d.name)}
                      className={`rounded-xl px-3 py-2 text-[10px] font-bold cursor-pointer ${
                        d.status === 'On Trip' 
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-900 dark:text-gray-600 dark:border-gray-850'
                          : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'
                      }`}
                      disabled={d.status === 'On Trip'}
                      title={d.status === 'On Trip' ? 'Cannot suspend driver on trip' : 'Suspend Driver'}
                      id={`btn-suspend-${d.id}`}
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: REGISTER DRIVER */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDriverModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              {editingDriver ? `Edit Profile: ${editingDriver.name}` : 'Register New Commercial Operator'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Add or edit commercial driver licenses and safety profiles.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleDriverSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                  placeholder="e.g. Walter White"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">License Number</label>
                <input
                  type="text"
                  value={drvLicense}
                  onChange={(e) => setDrvLicense(e.target.value.toUpperCase())}
                  placeholder="e.g. DL-AZ987112"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">CDL Classification</label>
                <select
                  value={drvCategory}
                  onChange={(e) => setDrvCategory(e.target.value as LicenseCategory)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Class A CDL">Class A CDL (Commercial Semi-Trucks)</option>
                  <option value="Class B CDL">Class B CDL (Heavy Straight Trucks)</option>
                  <option value="Class C CDL">Class C CDL (Light Delivery Vehicles)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">License Expiry Date</label>
                <input
                  type="date"
                  value={drvExpiry}
                  onChange={(e) => setDrvExpiry(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={drvContact}
                  onChange={(e) => setDrvContact(e.target.value)}
                  placeholder="e.g. +1 (555) 012-3456"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Operator Safety Rating (0-100%)</label>
                <input
                  type="number"
                  value={drvScore}
                  onChange={(e) => setDrvScore(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Duty Status</label>
                <select
                  value={drvStatus}
                  onChange={(e) => setDrvStatus(e.target.value as DriverStatus)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFY SAFETY SCORE */}
      {showScoreModal && driverForScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setShowScoreModal(false); setDriverForScore(null); }}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Adjust Safety Score</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Audit the driving score for operator {driverForScore.name}. Scores under 60% automatically suspend operations.
            </p>

            <form onSubmit={handleScoreSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">New Safety Rating (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowScoreModal(false); setDriverForScore(null); }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                >
                  Confirm Adjusted Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
