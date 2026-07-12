import React, { useState } from 'react';
import { 
  BarChart3, 
  MapPin, 
  Truck, 
  History, 
  Droplet, 
  Wrench, 
  Bell, 
  User as UserIcon, 
  Lock, 
  ShieldCheck, 
  Calendar, 
  Plus, 
  CheckCircle, 
  Compass, 
  DollarSign, 
  Info,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../lib/storage';
import { Trip, FuelLog, MaintenanceLog, Vehicle } from '../types';

interface DriverViewProps {
  activeSubTab: string;
}

export default function DriverView({ activeSubTab }: DriverViewProps) {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const [trips, setTrips] = useState<Trip[]>(() => dbService.getTrips());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => dbService.getVehicles());
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => dbService.getFuelLogs());
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(() => dbService.getMaintenanceLogs());

  // Local notifications
  const [notifications, setNotifications] = useState(() => dbService.getNotifications());

  // Form states
  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Fuel form state
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);

  // Maintenance form state
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintType, setMaintType] = useState<'Routine' | 'Repair' | 'Inspection' | 'Emergency'>('Routine');
  const [maintCost, setMaintCost] = useState('');
  const [maintDesc, setMaintDesc] = useState('');

  // Trip complete modal state
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [finalOdom, setFinalOdom] = useState('');
  const [fuelCons, setFuelCons] = useState('');

  const syncState = () => {
    setTrips(dbService.getTrips());
    setVehicles(dbService.getVehicles());
    setFuelLogs(dbService.getFuelLogs());
    setMaintenanceLogs(dbService.getMaintenanceLogs());
    setNotifications(dbService.getNotifications());
  };

  // Find Driver ID mapping (Mock driver link based on email/name)
  // Usually the driver Sarah Jenkins or Alexander Mercer
  const getDriverId = () => {
    if (currentUser?.email.includes('sarah')) return 'd2';
    return 'd1'; // Fallback to Alexander Mercer
  };

  const driverId = getDriverId();

  // Filter lists for active driver
  const myTrips = trips.filter(t => t.driverId === driverId);
  const activeTrip = myTrips.find(t => t.status === 'Dispatched');
  const pendingTrip = myTrips.find(t => t.status === 'Draft');
  
  // Find associated active vehicle
  const myVehicleId = activeTrip?.vehicleId || pendingTrip?.vehicleId || 'v1';
  const myVehicle = vehicles.find(v => v.id === myVehicleId);

  // Profile Save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    if (!nameInput.trim()) {
      setProfileMsg({ type: 'error', text: 'Full Name is required.' });
      return;
    }
    try {
      await updateProfile(nameInput.trim(), phoneInput.trim());
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error saving profile.' });
    }
  };

  // Password Update
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'New password is required.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      await changePassword(newPassword);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Error updating password.' });
    }
  };

  // Trip Dispatch / Status controller
  const handleStartTrip = (id: string) => {
    try {
      dbService.dispatchTrip(id);
      syncState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;
    try {
      const odom = parseFloat(finalOdom);
      const fuel = parseFloat(fuelCons);

      if (isNaN(odom) || isNaN(fuel)) {
        alert("Please provide numeric values for odometer and fuel.");
        return;
      }

      const trip = trips.find(t => t.id === showCompleteModal);
      const dist = trip ? trip.plannedDistance : 300;

      dbService.completeTrip(showCompleteModal, odom, fuel, dist);
      setShowCompleteModal(null);
      setFinalOdom('');
      setFuelCons('');
      syncState();
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip.');
    }
  };

  // Add Fuel Log
  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const liters = parseFloat(fuelLiters);
      const cost = parseFloat(fuelCost);
      if (isNaN(liters) || isNaN(cost)) {
        alert("Please input numeric details.");
        return;
      }

      dbService.addFuelLog({
        vehicleId: myVehicleId,
        liters,
        cost,
        date: fuelDate
      });

      // Also create an associated expense in DB
      dbService.addExpense({
        vehicleId: myVehicleId,
        category: 'Fuel',
        cost,
        date: fuelDate,
        description: `Refueling - ${liters}L logged by Driver Alexander`
      });

      setShowFuelModal(false);
      setFuelLiters('');
      setFuelCost('');
      syncState();
    } catch (err: any) {
      alert(err.message || "Failed to log fuel.");
    }
  };

  // Request Maintenance
  const handleRequestMaint = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cost = parseFloat(maintCost) || 0;
      if (!maintDesc.trim()) {
        alert("Please write a brief description.");
        return;
      }

      dbService.addMaintenanceLog({
        vehicleId: myVehicleId,
        date: new Date().toISOString().split('T')[0],
        type: maintType,
        cost,
        description: maintDesc
      });

      setShowMaintModal(false);
      setMaintCost('');
      setMaintDesc('');
      syncState();
    } catch (err: any) {
      alert(err.message || "Failed to submit request.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Truck className="h-40 w-40" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                Driver Operations Portal
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight md:text-2xl">
              Welcome Back, <span className="text-blue-400">{currentUser?.name}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Alexander Mercer (ID: {driverId.toUpperCase()}) • Certified Class A Commercial Driver License (CDL)
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-700/50">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Safety Score</span>
              <span className="text-xl font-bold text-emerald-400">94 / 100</span>
            </div>
            <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-700/50">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Active Vehicle</span>
              <span className="text-xl font-bold text-blue-400">{myVehicle?.registrationNumber || 'TX-711-RE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Assigned Trip Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Compass className="h-5 w-5 text-blue-500" /> Current Active Trip Log
              </h3>

              {activeTrip ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <p className="text-xs text-slate-400">Route ID: {activeTrip.id.toUpperCase()}</p>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-1">
                        {activeTrip.source} ➔ {activeTrip.destination}
                      </h4>
                    </div>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 uppercase tracking-wide">
                      Active Route
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Vehicle</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{myVehicle?.name || 'Volvo FH16'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Cargo Weight</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeTrip.cargoWeight.toLocaleString()} kg</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Planned Dist.</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeTrip.plannedDistance} km</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Fuel Budget</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeTrip.estimatedFuel} L</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowCompleteModal(activeTrip.id)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 cursor-pointer text-xs"
                    >
                      Mark as Completed
                    </button>
                  </div>
                </div>
              ) : pendingTrip ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                  <Clock className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">New Trip Assigned (Draft)</h4>
                    <p className="text-[10px] text-slate-400">{pendingTrip.source} ➔ {pendingTrip.destination}</p>
                  </div>
                  <button
                    onClick={() => handleStartTrip(pendingTrip.id)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 cursor-pointer text-xs shadow-md"
                  >
                    Start Logged Trip
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <Compass className="h-10 w-10 mx-auto opacity-30 mb-2" />
                  <p className="text-xs">No active trip assignments right now.</p>
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowFuelModal(true)}
                className="p-4 rounded-3xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 text-left transition-all group dark:bg-blue-950/10 dark:border-blue-900/30 dark:hover:bg-blue-950/20"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-3">
                  <Droplet className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400">Log Fuel Fill</h4>
                <p className="text-[10px] text-slate-400 mt-1">Register Liters and Costs instantly.</p>
              </button>

              <button
                onClick={() => setShowMaintModal(true)}
                className="p-4 rounded-3xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100 hover:border-amber-200 text-left transition-all group dark:bg-amber-950/10 dark:border-amber-900/30 dark:hover:bg-amber-950/20"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3">
                  <Wrench className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">Request Repair</h4>
                <p className="text-[10px] text-slate-400 mt-1">Report active vehicle issues.</p>
              </button>
            </div>
          </div>

          {/* Quick Metrics & Document Expirations */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                Assigned Truck Status
              </h3>
              {myVehicle ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                      <Truck className="h-6 w-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{myVehicle.name}</p>
                      <p className="text-[10px] text-slate-400">License: {myVehicle.registrationNumber}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Model Class:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{myVehicle.model}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{myVehicle.type}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Odometer:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{myVehicle.odometer.toLocaleString()} km</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Payload Limit:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{(myVehicle.maxCapacity/1000).toFixed(1)} Tons</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No vehicle linked.</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Licensing & Compliance
              </h3>
              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex gap-3 dark:bg-emerald-950/15 dark:border-emerald-900/30">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Class A CDL</h4>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Active • Expires 2027-11-15</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNED TRIPS TAB */}
      {activeSubTab === 'assigned_trips' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-black text-slate-950 dark:text-white mb-4">Dispatched & Active Trips</h2>
          
          {myTrips.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">No assigned trip records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Trip ID</th>
                    <th className="py-3 px-4">Origin / Destination</th>
                    <th className="py-3 px-4">Cargo Load</th>
                    <th className="py-3 px-4">Date Interval</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {myTrips.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">{t.id.toUpperCase()}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{t.source}</span>
                        <span className="text-slate-400 mx-2">➔</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{t.destination}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">{t.cargoWeight.toLocaleString()} kg</td>
                      <td className="py-3.5 px-4 text-slate-500">{t.startDate} to {t.endDate}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          t.status === 'Completed' ? 'bg-green-150 text-green-700 dark:bg-green-950/20' :
                          t.status === 'Dispatched' ? 'bg-blue-150 text-blue-700 dark:bg-blue-950/20' :
                          t.status === 'Cancelled' ? 'bg-red-150 text-red-700 dark:bg-red-950/20' :
                          'bg-amber-150 text-amber-700 dark:bg-amber-950/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {t.status === 'Draft' && (
                          <button
                            onClick={() => handleStartTrip(t.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-lg text-[10px]"
                          >
                            Start Trip
                          </button>
                        )}
                        {t.status === 'Dispatched' && (
                          <button
                            onClick={() => setShowCompleteModal(t.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg text-[10px]"
                          >
                            Mark Completed
                          </button>
                        )}
                        {t.status === 'Completed' && (
                          <span className="text-[11px] text-slate-400 flex items-center justify-end gap-1 font-medium">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Done
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSIGNED VEHICLE */}
      {activeSubTab === 'assigned_vehicle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-black text-slate-950 dark:text-white">Active Vehicle Registry Details</h2>
            {myVehicle ? (
              <div className="space-y-4">
                <div className="flex h-40 bg-slate-100 rounded-2xl items-center justify-center dark:bg-slate-850">
                  <Truck className="h-20 w-20 text-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Registration Plate</span>
                    <strong className="text-slate-800 dark:text-white text-sm">{myVehicle.registrationNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Model / Specifications</span>
                    <strong className="text-slate-800 dark:text-white text-sm">{myVehicle.name} ({myVehicle.model})</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-10 text-center">No vehicle assigned.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-4">Vehicle Health Status Logs</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-850 dark:border-slate-800 text-xs">
                <span className="font-bold text-emerald-600 block mb-1">✓ Fleet Clearance Active</span>
                This truck was fully inspected and cleared by mechanical dispatch operators. Next routine service due in 3,500 km.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRIP HISTORY */}
      {activeSubTab === 'trip_history' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-black text-slate-950 dark:text-white mb-4">Your Past Trips</h2>
          <div className="space-y-3">
            {myTrips.filter(t => t.status === 'Completed').map(t => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-850 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{t.source} ➔ {t.destination}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Completed {t.endDate} • Logged distance: {t.finalDistance || t.plannedDistance} km</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-600 font-mono font-bold block">COMPLETED</span>
                  <span className="text-[10px] text-slate-400">Refueled: {t.fuelConsumed}L</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUEL LOGS */}
      {activeSubTab === 'fuel_logs' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-slate-950 dark:text-white">Active Fuel Ledgers</h2>
            <button
              onClick={() => setShowFuelModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Log
            </button>
          </div>

          <div className="space-y-3">
            {fuelLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-850 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">Refueled: {log.liters} Liters</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Date: {log.date}</p>
                </div>
                <strong className="text-slate-800 dark:text-slate-100 text-sm font-black">${log.cost}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAINTENANCE REQUEST */}
      {activeSubTab === 'maintenance' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-slate-950 dark:text-white">Active Maintenance Log Requests</h2>
            <button
              onClick={() => setShowMaintModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Request Service
            </button>
          </div>

          <div className="space-y-3">
            {maintenanceLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-850 dark:border-slate-800 flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-white">{log.description}</h4>
                  <p className="text-[10px] text-slate-400">Type: <span className="font-semibold text-slate-600">{log.type}</span> • Submitted: {log.date}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                  log.status === 'Completed' ? 'bg-green-150 text-green-700' : 'bg-amber-150 text-amber-700'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeSubTab === 'notifications' && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-black text-slate-950 dark:text-white mb-4">Notifications Log</h2>
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-150 dark:bg-slate-850 dark:border-slate-800 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-white flex justify-between">
                  <span>{n.title}</span>
                  <span className="text-[10px] font-medium text-slate-400">{n.date}</span>
                </h4>
                <p className="text-slate-500 mt-1">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile form */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-4 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-500" /> Update Profile Information
            </h2>
            
            {profileMsg.text && (
              <div className={`mb-4 rounded-xl p-3 text-xs font-semibold ${
                profileMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Company Email</label>
                <input
                  type="email"
                  value={currentUser?.email}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 py-2.5 px-3 text-slate-500 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white font-bold py-3 shadow-md cursor-pointer text-xs"
              >
                Save Updates
              </button>
            </form>
          </div>

          {/* Password update form */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-black text-slate-950 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" /> Update Security Credentials
            </h2>

            {passwordMsg.text && (
              <div className={`mb-4 rounded-xl p-3 text-xs font-semibold ${
                passwordMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSave} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-slate-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 shadow-md cursor-pointer text-xs"
              >
                Change Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL DIALOGS ----------------- */}

      {/* Trip Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-950 dark:text-white mb-4">Complete Assigned Trip</h3>
            <form onSubmit={handleCompleteTripSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Final Odometer Reading (km)</label>
                <input
                  type="number"
                  required
                  value={finalOdom}
                  onChange={(e) => setFinalOdom(e.target.value)}
                  placeholder="e.g. 145390"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Total Fuel Consumed (Liters)</label>
                <input
                  type="number"
                  required
                  value={fuelCons}
                  onChange={(e) => setFuelCons(e.target.value)}
                  placeholder="e.g. 115"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(null)}
                  className="rounded-xl border border-slate-200 text-slate-500 py-2 px-4 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 cursor-pointer"
                >
                  Submit Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Log Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-950 dark:text-white mb-4">Register Fuel Fill-up</h3>
            <form onSubmit={handleAddFuel} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Liters Pumped</label>
                <input
                  type="number"
                  required
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Total Refueling Cost (USD)</label>
                <input
                  type="number"
                  required
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                  placeholder="e.g. 260"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Log Date</label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="rounded-xl border border-slate-200 text-slate-500 py-2 px-4 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 cursor-pointer"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Request Modal */}
      {showMaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h3 className="text-sm font-black text-slate-950 dark:text-white mb-4">Request Vehicle Maintenance</h3>
            <form onSubmit={handleRequestMaint} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Service Category</label>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Routine">Routine Inspection</option>
                  <option value="Repair">Active Breakdown / Repair</option>
                  <option value="Inspection">Safety certification check</option>
                  <option value="Emergency">Emergency Assist</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Estimated Cost (USD - Optional)</label>
                <input
                  type="number"
                  value={maintCost}
                  onChange={(e) => setMaintCost(e.target.value)}
                  placeholder="e.g. 350"
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Issue Description & Remarks</label>
                <textarea
                  required
                  rows={3}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Describe vehicle symptoms or regular check details..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus:outline-none resize-none"
                ></textarea>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="rounded-xl border border-slate-200 text-slate-500 py-2 px-4 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 cursor-pointer"
                >
                  Request Dispatcher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
