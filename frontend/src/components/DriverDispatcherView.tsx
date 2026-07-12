import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  MapPin, 
  Truck, 
  User as UserIcon, 
  Play, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Scale, 
  AlertTriangle,
  Compass,
  FileSpreadsheet,
  Trash,
  X,
  ClipboardCheck,
  Fuel,
  Search
} from 'lucide-react';
import { dbService } from '../lib/storage';
import { Trip, TripStatus, Vehicle, Driver } from '../types';
import DashboardStats from './DashboardStats';
import { useConfirm } from './ConfirmProvider';

export default function DriverDispatcherView() {
  const [trips, setTrips] = useState<Trip[]>(() => dbService.getTrips());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => dbService.getVehicles());
  const [drivers, setDrivers] = useState<Driver[]>(() => dbService.getDrivers());
  const { confirm } = useConfirm();

  // Search/Filters/Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals state
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [tripToComplete, setTripToComplete] = useState<Trip | null>(null);

  // Form Fields - Trip
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState<number>(5000);
  const [plannedDistance, setPlannedDistance] = useState<number>(300);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedFuel, setEstimatedFuel] = useState<number>(100);

  // Form Fields - Complete Trip
  const [finalOdo, setFinalOdo] = useState<number>(0);
  const [fuelUsed, setFuelUsed] = useState<number>(0);
  const [actualDist, setActualDist] = useState<number>(0);

  // Error / Success
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const triggerAlert = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const syncDB = () => {
    setTrips(dbService.getTrips());
    setVehicles(dbService.getVehicles());
    setDrivers(dbService.getDrivers());
  };

  // KPIs
  const stats = useMemo(() => {
    const active = trips.filter(t => t.status === 'Dispatched').length;
    const pending = trips.filter(t => t.status === 'Draft').length;
    const completed = trips.filter(t => t.status === 'Completed').length;
    
    const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
    const availableDrivers = drivers.filter(d => d.status === 'Available').length;

    return { active, pending, completed, availableVehicles, availableDrivers };
  }, [trips, vehicles, drivers]);

  const metricCards = [
    {
      title: 'Active Trips',
      value: `${stats.active} Dispatched`,
      icon: <Compass className="h-5 w-5" />,
      color: 'bg-blue-100 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: 'Crews currently in transit',
      badge: { text: 'En Route', type: 'info' as const }
    },
    {
      title: 'Pending Dispatch',
      value: `${stats.pending} Drafts`,
      icon: <FileSpreadsheet className="h-5 w-5" />,
      color: 'bg-amber-100 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      description: 'Trip plans in draft format',
      badge: { text: 'Awaiting Crew', type: 'warning' as const }
    },
    {
      title: 'Available Vehicles',
      value: `${stats.availableVehicles} Trucks`,
      icon: <Truck className="h-5 w-5" />,
      color: 'bg-green-100 dark:bg-green-950/40',
      textColor: 'text-green-600 dark:text-green-400',
      description: 'Unassigned assets ready',
      badge: { text: 'Standby assets', type: 'success' as const }
    },
    {
      title: 'Available Crews',
      value: `${stats.availableDrivers} Drivers`,
      icon: <UserIcon className="h-5 w-5" />,
      color: 'bg-indigo-100 dark:bg-indigo-950/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      description: 'Crews ready for assign',
      badge: { text: 'Staff Active', type: 'success' as const }
    }
  ];

  // Filters
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        t => 
          t.source.toLowerCase().includes(term) || 
          t.destination.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    return result.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [trips, searchTerm, statusFilter]);

  // Open modal
  const openTripModal = (trip: Trip | null = null) => {
    setFormError('');
    if (trip) {
      setEditingTrip(trip);
      setSource(trip.source);
      setDestination(trip.destination);
      setVehicleId(trip.vehicleId);
      setDriverId(trip.driverId);
      setCargoWeight(trip.cargoWeight);
      setPlannedDistance(trip.plannedDistance);
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
      setEstimatedFuel(trip.estimatedFuel);
    } else {
      setEditingTrip(null);
      setSource('');
      setDestination('');
      setVehicleId('');
      setDriverId('');
      setCargoWeight(6000);
      setPlannedDistance(420);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      setEstimatedFuel(125);
    }
    setShowTripModal(true);
  };

  // Submit Trip Planner
  const handleTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!source.trim() || !destination.trim() || !vehicleId || !driverId) {
      setFormError('Please fill out origin, destination, vehicle, and driver.');
      return;
    }

    try {
      const v = vehicles.find(veh => veh.id === vehicleId);
      const d = drivers.find(drv => drv.id === driverId);

      if (v && cargoWeight > v.maxCapacity) {
        throw new Error(`Cargo Weight (${cargoWeight} kg) exceeds vehicle max capacity (${v.maxCapacity} kg).`);
      }

      if (editingTrip) {
        dbService.editTrip(editingTrip.id, {
          source,
          destination,
          vehicleId,
          driverId,
          cargoWeight: Number(cargoWeight),
          plannedDistance: Number(plannedDistance),
          startDate,
          endDate,
          estimatedFuel: Number(estimatedFuel)
        });
        triggerAlert(`Trip plan edited.`);
      } else {
        dbService.createTrip({
          source,
          destination,
          vehicleId,
          driverId,
          cargoWeight: Number(cargoWeight),
          plannedDistance: Number(plannedDistance),
          startDate,
          endDate,
          estimatedFuel: Number(estimatedFuel)
        });
        triggerAlert('Draft trip scheduled successfully.');
      }
      syncDB();
      setShowTripModal(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    }
  };

  // Dispatch Trip
  const handleDispatch = (id: string, origin: string, dest: string) => {
    try {
      dbService.dispatchTrip(id);
      triggerAlert(`Trip ${origin} -> ${dest} dispatched! Status changed to On Trip.`);
      syncDB();
    } catch (err: any) {
      alert(err.message || 'Could not dispatch.');
    }
  };

  // Cancel Trip
  const handleCancel = async (id: string) => {
    const ok = await confirm({
      title: 'Cancel Trip',
      message: 'Are you sure you want to cancel this trip? Drivers and vehicles will be returned to Available.',
      confirmText: 'Cancel Trip',
      cancelText: 'Keep Trip',
      type: 'warning'
    });
    if (ok) {
      try {
        dbService.cancelTrip(id);
        triggerAlert('Trip cancelled.');
        syncDB();
      } catch (err: any) {
        triggerAlert(err.message || 'Error occurred.');
      }
    }
  };

  // Delete Trip
  const handleDeleteTrip = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Trip Record',
      message: 'Are you sure you want to delete this trip record? This cannot be undone.',
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (ok) {
      try {
        dbService.deleteTrip(id);
        triggerAlert('Trip record deleted.');
        syncDB();
      } catch (err: any) {
        triggerAlert(err.message || 'Error occurred.');
      }
    }
  };

  // Launch complete dialog
  const openCompleteModal = (trip: Trip) => {
    setFormError('');
    setTripToComplete(trip);
    setActualDist(trip.plannedDistance);
    setFuelUsed(trip.estimatedFuel);
    
    // Autofill final odometer
    const v = vehicles.find(veh => veh.id === trip.vehicleId);
    setFinalOdo(v ? v.odometer + trip.plannedDistance : 100000);
    setShowCompleteModal(true);
  };

  // Submit complete
  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!tripToComplete) return;

    try {
      dbService.completeTrip(tripToComplete.id, finalOdo, fuelUsed, actualDist);
      triggerAlert(`Successfully completed trip from ${tripToComplete.source} to ${tripToComplete.destination}!`);
      syncDB();
      setShowCompleteModal(false);
      setTripToComplete(null);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6" id="dispatch-container">
      
      {/* Toast */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {successMsg}
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Trip Dispatcher Portal</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Plan routes, allocate drivers/vehicles, dispatch, and resolve active routes</p>
        </div>
        <button
          onClick={() => openTripModal(null)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 cursor-pointer"
          id="btn-schedule-trip"
        >
          <Plus className="h-4 w-4" /> Book Trip Route
        </button>
      </div>

      {/* Metrics */}
      <DashboardStats metrics={metricCards} />

      {/* Main List panel */}
      <div className="space-y-4">
        {/* Search / Filter header */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search trips by origin or destination city..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Route Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="All">All Routes</option>
              <option value="Draft">Drafts</option>
              <option value="Dispatched">Dispatched (Active)</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Trips Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 uppercase">
                  <th className="px-6 py-4">Routing Corridor</th>
                  <th className="px-6 py-4">Assigned Crew</th>
                  <th className="px-6 py-4">Assigned Asset</th>
                  <th className="px-6 py-4 text-right">Cargo Weight</th>
                  <th className="px-6 py-4 text-right">Planned Distance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Dispatch Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">No trips recorded matching parameters.</td>
                  </tr>
                ) : (
                  filteredTrips.map((t) => {
                    const v = vehicles.find(veh => veh.id === t.vehicleId);
                    const d = drivers.find(drv => drv.id === t.driverId);

                    const statusStyles = {
                      Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-800',
                      Dispatched: 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900',
                      Completed: 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900',
                      Cancelled: 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900'
                    };

                    return (
                      <tr key={t.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/10">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                            {t.source} <span className="text-gray-400 text-[10px]">➔</span> {t.destination}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {t.startDate} to {t.endDate}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{d ? d.name : 'Unassigned'}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{d ? d.licenseCategory : ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{v ? v.name : 'Unassigned'}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{v ? v.registrationNumber : ''}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-800 dark:text-gray-200">
                          {t.cargoWeight.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-800 dark:text-gray-200">
                          {t.plannedDistance.toLocaleString()} km
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusStyles[t.status]}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {t.status === 'Draft' && (
                              <>
                                <button
                                  onClick={() => handleDispatch(t.id, t.source, t.destination)}
                                  className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                                  id={`btn-dispatch-${t.id}`}
                                >
                                  <Play className="h-3 w-3 fill-current" /> Dispatch
                                </button>
                                <button
                                  onClick={() => openTripModal(t)}
                                  className="rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 px-2 py-1 text-[10px] font-semibold dark:border-gray-800 dark:text-gray-400 cursor-pointer"
                                  title="Edit Draft"
                                  id={`btn-edit-trip-${t.id}`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleCancel(t.id)}
                                  className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                                  title="Cancel Route"
                                  id={`btn-cancel-trip-${t.id}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {t.status === 'Dispatched' && (
                              <>
                                <button
                                  onClick={() => openCompleteModal(t)}
                                  className="rounded-lg bg-green-600 hover:bg-green-500 text-white px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                                  id={`btn-complete-trip-${t.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" /> Complete
                                </button>
                                <button
                                  onClick={() => handleCancel(t.id)}
                                  className="rounded-lg border border-red-200 hover:bg-red-50 text-red-600 px-2 py-1 text-[10px] font-bold dark:border-red-950/20 dark:text-red-400 cursor-pointer"
                                  id={`btn-kill-trip-${t.id}`}
                                >
                                  Abort Route
                                </button>
                              </>
                            )}

                            {t.status === 'Completed' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-green-600 font-bold text-[10px] flex items-center gap-1 justify-center">
                                  <CheckCircle className="h-3.5 w-3.5" /> Resolved
                                </span>
                                <button
                                  onClick={() => handleDeleteTrip(t.id)}
                                  className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                                  title="Delete Record"
                                  id={`btn-delete-trip-${t.id}`}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}

                            {t.status === 'Cancelled' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-semibold text-[10px] flex items-center gap-1 justify-center">
                                  <XCircle className="h-3.5 w-3.5" /> Cancelled
                                </span>
                                <button
                                  onClick={() => handleDeleteTrip(t.id)}
                                  className="rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                                  title="Delete Record"
                                  id={`btn-delete-trip-${t.id}`}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: TRIP PLANNER FORM */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowTripModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              {editingTrip ? 'Modify Trip Plan' : 'Coordinate New Cargo Trip Route'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fulfill cargo parameters and allocate compatible vehicles and CDL crew.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleTripSubmit} className="mt-5 space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Source */}
                <div>
                  <label className="block text-gray-500 mb-1">Origin Hub (City, State)</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Houston, TX"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-gray-500 mb-1">Destination Hub (City, State)</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Dallas, TX"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Allocating Vehicle */}
                <div>
                  <label className="block text-gray-500 mb-1">Allocate Compatible Fleet Asset</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">-- Assign Vehicle --</option>
                    
                    {/* Filter to only Available vehicles, or the currently assigned one */}
                    {vehicles
                      .filter(v => v.status === 'Available' || v.id === editingTrip?.vehicleId)
                      .map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.registrationNumber}) - Max {v.maxCapacity.toLocaleString()}kg
                        </option>
                      ))}
                  </select>
                </div>

                {/* Allocating Driver */}
                <div>
                  <label className="block text-gray-500 mb-1">Allocate CDL Driver Crew</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">-- Assign Driver --</option>
                    
                    {/* Filter to only Available drivers with active CDL, or currently assigned */}
                    {drivers
                      .filter(d => (d.status === 'Available' && new Date(d.expiryDate) >= new Date()) || d.id === editingTrip?.driverId)
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.licenseCategory}) - Safety Score: {d.safetyScore}%
                        </option>
                      ))}
                  </select>
                </div>

                {/* Cargo weight */}
                <div>
                  <label className="block text-gray-500 mb-1">Cargo Payload Weight (kg)</label>
                  <input
                    type="number"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Planned Distance */}
                <div>
                  <label className="block text-gray-500 mb-1">Planned Corridor Distance (km)</label>
                  <input
                    type="number"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-gray-500 mb-1">Planned Dispatch Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-gray-500 mb-1">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Fuel Estimate */}
                <div>
                  <label className="block text-gray-500 mb-1">Estimated Fuel Consumption (L)</label>
                  <input
                    type="number"
                    value={estimatedFuel}
                    onChange={(e) => setEstimatedFuel(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTripModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-500"
                >
                  {editingTrip ? 'Save Modifications' : 'Schedule Route Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETE TRIP FORM */}
      {showCompleteModal && tripToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setShowCompleteModal(false); setTripToComplete(null); }}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Resolve Delivery Route</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Input actual logistical records. Restores availability metrics.
            </p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Actual Final Odometer (km)</label>
                <input
                  type="number"
                  value={finalOdo}
                  onChange={(e) => setFinalOdo(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400">
                  Current vehicle mileage: {vehicles.find(v => v.id === tripToComplete.vehicleId)?.odometer.toLocaleString()} km
                </span>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Actual Fuel Consumed (Liters)</label>
                <input
                  type="number"
                  value={fuelUsed}
                  onChange={(e) => setFuelUsed(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-[10px] text-gray-400">Planned fuel estimate: {tripToComplete.estimatedFuel} Liters</span>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Actual Distance Covered (km)</label>
                <input
                  type="number"
                  value={actualDist}
                  onChange={(e) => setActualDist(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowCompleteModal(false); setTripToComplete(null); }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-green-600 px-4 py-2 text-white hover:bg-green-500 shadow-md"
                >
                  Submit & Restore Available
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
