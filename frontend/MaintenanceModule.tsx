import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { MaintenanceLog, Vehicle } from '../types';
import { 
  Plus, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  X, 
  Search,
  Filter,
  AlertCircle,
  TrendingDown,
  Calendar
} from 'lucide-react';

interface MaintenanceModuleProps {
  darkMode: boolean;
}

export const MaintenanceModule: React.FC<MaintenanceModuleProps> = ({ darkMode }) => {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<MaintenanceLog['type']>('Oil Change');
  const [cost, setCost] = useState(6500);
  const [date, setDate] = useState('2026-07-12');
  const [status, setStatus] = useState<MaintenanceLog['status']>('Scheduled');
  const [notes, setNotes] = useState('');
  const [performedBy, setPerformedBy] = useState('Tata Commercial Services');

  const isManager = userProfile?.role === 'Fleet Manager';
  const isFinance = userProfile?.role === 'Financial Analyst' || userProfile?.role === 'Fleet Manager';

  useEffect(() => {
    const unsubLogs = onSnapshot(collection(db, 'maintenanceLogs'), (snap) => {
      const list: MaintenanceLog[] = [];
      snap.forEach(doc => list.push(doc.data() as MaintenanceLog));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setLogs(list);
      setLoading(false);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const list: Vehicle[] = [];
      snap.forEach(doc => list.push(doc.data() as Vehicle));
      setVehicles(list);
    });

    return () => {
      unsubLogs();
      unsubVehicles();
    };
  }, []);

  const handleOpenAdd = () => {
    setErrorMessage('');
    const firstAvail = vehicles[0]?.registrationNumber || '';
    setVehicleId(firstAvail);
    setType('Oil Change');
    setCost(5000);
    setDate('2026-07-12');
    setStatus('Scheduled');
    setNotes('Scheduled inspection and filter replacements.');
    setPerformedBy('Tata Authorized Workshop');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!vehicleId || !performedBy.trim() || !notes.trim()) {
      setErrorMessage('Please complete all form fields.');
      return;
    }

    if (cost <= 0) {
      setErrorMessage('Service cost must be a positive number.');
      return;
    }

    try {
      const id = `MNT-${1000 + logs.length + 1}`;
      const logData: MaintenanceLog = {
        id,
        vehicleId,
        type,
        cost,
        date,
        status,
        notes: notes.trim(),
        performedBy: performedBy.trim()
      };

      const batch = writeBatch(db);
      
      // Save maintenance log
      batch.set(doc(db, 'maintenanceLogs', id), logData);

      // Save corresponding general expense ledger
      const expId = `EXP-MNT-${id}`;
      batch.set(doc(db, 'expenses', expId), {
        id: expId,
        vehicleId,
        type: 'Maintenance',
        amount: cost,
        date,
        description: `Servicing reference ${id} (${type}) by ${performedBy}.`
      });

      // Downstream Status updates
      if (status === 'In-Progress') {
        batch.update(doc(db, 'vehicles', vehicleId), { status: 'In-Shop' });
      }

      await batch.commit();
      setShowModal(false);
    } catch (err: any) {
      console.error('Failed to schedule maintenance:', err);
      setErrorMessage(err.message || 'Firestore write error.');
    }
  };

  const handleStatusChange = async (log: MaintenanceLog, nextStatus: MaintenanceLog['status']) => {
    try {
      const batch = writeBatch(db);
      
      // Update log
      batch.update(doc(db, 'maintenanceLogs', log.id), { status: nextStatus });

      // Update vehicle status
      if (nextStatus === 'In-Progress') {
        batch.update(doc(db, 'vehicles', log.vehicleId), { status: 'In-Shop' });
      } else if (nextStatus === 'Completed') {
        batch.update(doc(db, 'vehicles', log.vehicleId), { 
          status: 'Available',
          lastServiceDate: new Date().toISOString().split('T')[0]
        });
      }

      await batch.commit();
    } catch (err) {
      console.error('Failed to transition maintenance state:', err);
    }
  };

  const formatIndianDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleAddDummyMaintenance = async () => {
    try {
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)]?.registrationNumber || 'DL-01-AB-9876';
      const mntTypes: MaintenanceLog['type'][] = ['Oil Change', 'Repair', 'Inspection', 'Brake Service', 'Tyre Replacement'];
      const mntType = mntTypes[Math.floor(Math.random() * mntTypes.length)];
      const randomCost = Math.floor(Math.random() * 15000) + 3000;
      const todayStr = '2026-07-12';
      const newMntId = `MNT-DUMMY-${Math.floor(100000 + Math.random() * 900000)}`;

      const dummyLog: MaintenanceLog = {
        id: newMntId,
        vehicleId: randomVehicle,
        type: mntType,
        cost: randomCost,
        date: todayStr,
        status: 'Completed',
        notes: `Simulated quick scheduled periodic workshop ${mntType} service and optimization.`,
        performedBy: 'Tata Authorized Heavy Workshop'
      };

      const batch = writeBatch(db);
      
      // Save maintenance log
      batch.set(doc(db, 'maintenanceLogs', newMntId), dummyLog);

      // Save corresponding general expense ledger
      const expId = `EXP-MNT-${newMntId}`;
      batch.set(doc(db, 'expenses', expId), {
        id: expId,
        vehicleId: randomVehicle,
        type: 'Maintenance',
        amount: randomCost,
        date: todayStr,
        description: `Servicing reference ${newMntId} (${mntType}) by Tata Authorized Heavy Workshop.`
      });

      await batch.commit();
    } catch (err) {
      console.error('Failed to add dummy maintenance:', err);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch = 
      log.vehicleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchType = typeFilter === 'All' || log.type === typeFilter;

    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Preventative Fleet Maintenance</h2>
          <p className="text-xs text-slate-500 mt-1">
            Conduct scheduling for oil services, heavy mechanical overhauls, tire changes, and log overall service history costs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={handleAddDummyMaintenance}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold shadow transition-all"
              title="Instantly generate a dummy maintenance service log"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Seed Demo Service</span>
            </button>
          )}

          {isManager && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Workshop</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid search and filters panel */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-3 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by plate number, repair workshop..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`border rounded-lg p-1.5 outline-none font-medium ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`border rounded-lg p-1.5 outline-none font-medium ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Types</option>
              <option value="Oil Change">Oil Change</option>
              <option value="Repair">Repair</option>
              <option value="Inspection">Inspection</option>
              <option value="Brake Service">Brake Service</option>
              <option value="Tyre Replacement">Tyre Replacement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            Syncing workshop logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 font-medium">
            No maintenance records match your filters.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const vehicleObj = vehicles.find(v => v.registrationNumber === log.vehicleId);
            return (
              <div
                key={log.id}
                className={`p-5 rounded-2xl border shadow-sm transition-all flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-none">{log.type}</h4>
                        <span className="text-[9px] text-slate-400 mt-1 block font-mono">Job ID: {log.id}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      log.status === 'In-Progress' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Road Asset</span>
                      <span className="font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap inline-block">
                        {log.vehicleId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Scheduled Date</span>
                      <span className="font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatIndianDate(log.date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Workshop Provider</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{log.performedBy}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Invoice cost</span>
                      <span className="font-mono font-bold text-indigo-500">{formatINR(log.cost)}</span>
                    </div>

                    <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-slate-950/40 text-[11px] text-slate-400 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold block text-slate-500 mb-0.5">Details:</span>
                      {log.notes}
                    </div>
                  </div>
                </div>

                {/* Status Transitions Controls */}
                {isManager && log.status !== 'Completed' && (
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-2">
                    {log.status === 'Scheduled' && (
                      <button
                        onClick={() => handleStatusChange(log, 'In-Progress')}
                        className="px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold text-[10px] flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        Start Servicing
                      </button>
                    )}
                    {log.status === 'In-Progress' && (
                      <button
                        onClick={() => handleStatusChange(log, 'Completed')}
                        className="px-2.5 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Job
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SCHEDULE MAINTENANCE FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">Schedule preventative Workshop Service</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Vehicle */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Road Asset (Required)</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Select Plate --</option>
                    {vehicles
                      .filter(v => v.status !== 'Retired')
                      .map(v => (
                        <option key={v.registrationNumber} value={v.registrationNumber}>
                          {v.registrationNumber} - {v.name} ({v.status})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Job Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Oil Change">Oil & Filters Change</option>
                    <option value="Repair">Engine / Gearbox Repair</option>
                    <option value="Inspection">Periodic Fitness Inspection</option>
                    <option value="Brake Service">Brakes Replacement</option>
                    <option value="Tyre Replacement">Tyres Rotation / Placement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Service Provider */}
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Workshop Vendor</label>
                  <input
                    type="text"
                    placeholder="Tata Authorized Service Center"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Invoice Amount (INR)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Service Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In-Progress">In-Progress (Send to shop now)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Log / Checklist Notes</label>
                <textarea
                  placeholder="Details of repair, component parts checked..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none h-16 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow shadow-indigo-600/20"
                >
                  Log Scheduled Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
