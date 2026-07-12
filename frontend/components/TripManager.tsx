import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { Trip, Vehicle, Driver } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Check, 
  X, 
  MapPin, 
  Truck, 
  User, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CornerDownRight,
  TrendingUp,
  Scale
} from 'lucide-react';

interface TripManagerProps {
  darkMode: boolean;
}

export const TripManager: React.FC<TripManagerProps> = ({ darkMode }) => {
  const { userProfile } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal forms
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Dispatch Form fields
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState(10000);
  const [cargoType, setCargoType] = useState('E-commerce Logistics');
  const [origin, setOrigin] = useState('Mumbai, MH');
  const [destination, setDestination] = useState('Delhi, NCR');
  const [distance, setDistance] = useState(1400);
  const [notes, setNotes] = useState('');

  // Complete Form fields
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [fuelConsumed, setFuelConsumed] = useState<number>(0);
  const [tollCost, setTollCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);

  const isManager = userProfile?.role === 'Fleet Manager';
  const isDriver = userProfile?.role === 'Driver';

  // Current date mock
  const todayDateStr = '2026-07-12';

  useEffect(() => {
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      const list: Trip[] = [];
      snap.forEach(doc => list.push(doc.data() as Trip));
      list.sort((a, b) => b.id.localeCompare(a.id));
      setTrips(list);
      setLoading(false);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const list: Vehicle[] = [];
      snap.forEach(doc => list.push(doc.data() as Vehicle));
      setVehicles(list);
    });

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      const list: Driver[] = [];
      snap.forEach(doc => list.push(doc.data() as Driver));
      setDrivers(list);
    });

    return () => {
      unsubTrips();
      unsubVehicles();
      unsubDrivers();
    };
  }, []);

  const handleOpenDispatch = () => {
    setErrorMessage('');
    // Pick first available vehicle & driver as defaults
    const availableV = vehicles.find(v => v.status === 'Available');
    const activeD = drivers.find(d => d.status === 'Active' && new Date(d.licenseExpiry) >= new Date(todayDateStr));
    
    setVehicleId(availableV?.registrationNumber || '');
    setDriverId(activeD?.id || '');
    setCargoWeight(8000);
    setCargoType('FMCG Consumables');
    setOrigin('Mumbai, MH');
    setDestination('Pune, MH');
    setDistance(150);
    setNotes('High priority logistics delivery.');
    setShowDispatchModal(true);
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!vehicleId || !driverId || !origin.trim() || !destination.trim() || distance <= 0) {
      setErrorMessage('Please complete all form specifications.');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.registrationNumber === vehicleId);
    const selectedDriver = drivers.find(d => d.id === driverId);

    if (!selectedVehicle) {
      setErrorMessage('Selected road asset is invalid.');
      return;
    }

    if (!selectedDriver) {
      setErrorMessage('Selected heavy driver is invalid.');
      return;
    }

    // 1. CARGO WEIGHT VALIDATION
    if (cargoWeight > selectedVehicle.maxLoadCapacity) {
      setErrorMessage(`🚨 WEIGHT DISCREPANCY: Cargo weight (${cargoWeight} kg) exceeds vehicle payload limit (${selectedVehicle.maxLoadCapacity} kg). Select a larger multi-axle truck or reduce cargo.`);
      return;
    }

    // 2. LICENSE EXPIRY VALIDATION
    const isLicenseExpired = new Date(selectedDriver.licenseExpiry) < new Date(todayDateStr);
    if (isLicenseExpired) {
      setErrorMessage(`🚨 DISPATCH BLOCKED: Driver ${selectedDriver.name} license is EXPIRED (${selectedDriver.licenseExpiry})! Suspension workflow active.`);
      return;
    }

    // 3. SUSPENDED STATUS VALIDATION
    if (selectedDriver.status === 'Suspended') {
      setErrorMessage(`🚨 DISPATCH BLOCKED: Driver ${selectedDriver.name} is currently suspended due to critical safety score compliance violations.`);
      return;
    }

    // Check if driver is already allocated on an active trip
    const activeTripWithDriver = trips.find(t => t.driverId === driverId && t.status === 'Dispatched');
    if (activeTripWithDriver) {
      setErrorMessage(`🚨 DRIVER ALLOCATED: Driver ${selectedDriver.name} is already operating active Trip ${activeTripWithDriver.id}! They cannot be allocated to another trip until the current trip is completed.`);
      return;
    }

    // 4. VEHICLE STATUS CHECK
    if (selectedVehicle.status !== 'Available') {
      setErrorMessage(`🚨 ASSET BLOCKED: Vehicle ${selectedVehicle.registrationNumber} is currently ${selectedVehicle.status} and unavailable.`);
      return;
    }

    // Check if vehicle is already allocated on an active trip
    const activeTripWithVehicle = trips.find(t => t.vehicleId === vehicleId && t.status === 'Dispatched');
    if (activeTripWithVehicle) {
      setErrorMessage(`🚨 ASSET ALLOCATED: Vehicle ${vehicleId} is already dispatched on active Trip ${activeTripWithVehicle.id} (${activeTripWithVehicle.origin} → ${activeTripWithVehicle.destination})! It cannot be allocated again until that trip is completed.`);
      return;
    }

    try {
      const tripId = `TRIP-${2026}${100 + trips.length + 1}`;
      const startOdometer = selectedVehicle.odometer;
      const fuelEstimated = Math.round(distance / 4); // Estimating 4km/l

      const tripData: Trip = {
        id: tripId,
        vehicleId,
        driverId,
        cargoWeight,
        cargoType,
        origin,
        destination,
        distance,
        status: 'Dispatched',
        dispatchTime: new Date().toISOString().replace('T', ' ').split('.')[0],
        startOdometer,
        fuelEstimated,
        notes,
        timeline: [
          { status: 'Draft', timestamp: new Date().toISOString(), note: 'Logistics cargo load verified.' },
          { status: 'Dispatched', timestamp: new Date().toISOString(), note: `Dispatched in vehicle ${vehicleId} with driver ${selectedDriver.name}.` }
        ]
      };

      const batch = writeBatch(db);
      
      // Update Trip
      batch.set(doc(db, 'trips', tripId), tripData);
      
      // Update Vehicle status to On-Trip
      batch.update(doc(db, 'vehicles', vehicleId), { status: 'On-Trip' });

      await batch.commit();
      setShowDispatchModal(false);
    } catch (err: any) {
      console.error('Failed to dispatch trip:', err);
      setErrorMessage(err.message || 'Firestore write error.');
    }
  };

  const handleOpenComplete = (trip: Trip) => {
    setActiveTrip(trip);
    setErrorMessage('');
    // Set default fields based on trip distance
    setEndOdometer(trip.startOdometer + trip.distance);
    setFuelConsumed(trip.fuelEstimated);
    setTollCost(Math.round(trip.distance * 1.5)); // ₹1.5 toll per km
    setOtherCost(1500); // Allowances
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!activeTrip) return;

    if (endOdometer <= activeTrip.startOdometer) {
      setErrorMessage(`🚨 ODOMETER FAULT: End odometer (${endOdometer} km) must exceed start odometer (${activeTrip.startOdometer} km).`);
      return;
    }

    if (fuelConsumed <= 0) {
      setErrorMessage('Please specify positive fuel consumed.');
      return;
    }

    try {
      const completionTime = new Date().toISOString().replace('T', ' ').split('.')[0];
      const costFuel = fuelConsumed * 95.0; // ₹95/liter in India

      // 1. Compile final trip updates
      const finalTimeline = [
        ...(activeTrip.timeline || []),
        { status: 'Completed', timestamp: completionTime, note: `Trip completed. Final odometer ${endOdometer} km logged.` }
      ];

      const tripUpdates = {
        status: 'Completed',
        completionTime,
        endOdometer,
        fuelConsumed,
        costFuel,
        costTolls: tollCost,
        costOther: otherCost,
        timeline: finalTimeline
      };

      const batch = writeBatch(db);

      // Update Trip
      batch.update(doc(db, 'trips', activeTrip.id), tripUpdates);

      // Update Vehicle status back to Available & increment odometer
      batch.update(doc(db, 'vehicles', activeTrip.vehicleId), {
        status: 'Available',
        odometer: endOdometer,
        lastServiceDate: completionTime.split(' ')[0]
      });

      // Write Fuel Log
      const fuelLogId = `FUEL-LOG-${activeTrip.id}`;
      batch.set(doc(db, 'fuelLogs', fuelLogId), {
        id: fuelLogId,
        vehicleId: activeTrip.vehicleId,
        tripId: activeTrip.id,
        date: completionTime.split(' ')[0],
        liters: fuelConsumed,
        costPerLiter: 95.0,
        totalCost: costFuel,
        odometer: endOdometer,
        location: activeTrip.destination
      });

      // Write Toll Expense
      if (tollCost > 0) {
        const tollExpId = `EXP-TOLL-${activeTrip.id}`;
        batch.set(doc(db, 'expenses', tollExpId), {
          id: tollExpId,
          vehicleId: activeTrip.vehicleId,
          tripId: activeTrip.id,
          type: 'Toll',
          amount: tollCost,
          date: completionTime.split(' ')[0],
          description: `Fastag Auto toll on completed trip ${activeTrip.id}.`
        });
      }

      // Write Allowance Expense
      if (otherCost > 0) {
        const allowanceExpId = `EXP-ALLOW-${activeTrip.id}`;
        batch.set(doc(db, 'expenses', allowanceExpId), {
          id: allowanceExpId,
          vehicleId: activeTrip.vehicleId,
          tripId: activeTrip.id,
          type: 'Driver Allowance',
          amount: otherCost,
          date: completionTime.split(' ')[0],
          description: `Batta/Allowance for trip ${activeTrip.id}.`
        });
      }

      // Fuel Expense
      const fuelExpId = `EXP-FUEL-${activeTrip.id}`;
      batch.set(doc(db, 'expenses', fuelExpId), {
        id: fuelExpId,
        vehicleId: activeTrip.vehicleId,
        tripId: activeTrip.id,
        type: 'Fuel',
        amount: costFuel,
        date: completionTime.split(' ')[0],
        description: `Diesel fuel consumption ledger for trip ${activeTrip.id}.`
      });

      await batch.commit();
      setShowCompleteModal(false);
    } catch (err: any) {
      console.error('Failed to complete trip:', err);
      setErrorMessage(err.message || 'Firestore write error.');
    }
  };

  const handleCancelTrip = async (trip: Trip) => {
    if (!window.confirm(`Are you sure you want to cancel Trip ${trip.id}?`)) return;
    try {
      const batch = writeBatch(db);
      
      // Update Trip Status
      const finalTimeline = [
        ...(trip.timeline || []),
        { status: 'Cancelled', timestamp: new Date().toISOString(), note: 'Trip cancelled by Fleet Manager.' }
      ];
      batch.update(doc(db, 'trips', trip.id), {
        status: 'Cancelled',
        timeline: finalTimeline
      });

      // Release Vehicle
      batch.update(doc(db, 'vehicles', trip.vehicleId), { status: 'Available' });

      await batch.commit();
    } catch (err) {
      console.error('Failed to cancel trip:', err);
    }
  };

  // Filter trips
  const filteredTrips = trips.filter((t) => {
    const matchSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicleId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'All' || t.status === statusFilter;

    // If Driver role, restrict view to only their assigned trips
    if (isDriver) {
      // Find matching driver profiles
      const driverProfile = drivers.find(d => d.phone === userProfile?.phone || d.name.includes(userProfile?.name || ''));
      if (driverProfile) {
        return matchSearch && matchStatus && t.driverId === driverProfile.id;
      }
    }

    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Cargo Dispatch & Workflows</h2>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch trucks with automated load-weight validation, monitor transit progress, and complete electronic cargo manifests.
          </p>
        </div>

        {isManager && (
          <button
            onClick={handleOpenDispatch}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch Cargo Load</span>
          </button>
        )}
      </div>

      {/* Grid search and filters panel */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-3 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search trips by ID, route, vehicle plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1">
          {['All', 'Dispatched', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                statusFilter === status
                  ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                  : (darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600')
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Trip Dispatches Table */}
      <div className={`border rounded-xl shadow-sm overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                <th className="p-4">Trip ID</th>
                <th className="p-4">Logistics Route</th>
                <th className="p-4">Road Asset</th>
                <th className="p-4">Cargo manifest</th>
                <th className="p-4">Odometer Track</th>
                <th className="p-4">Fuel logs</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading commercial trip logs...
                  </td>
                </tr>
              ) : filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    No active trip records found.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const driverObj = drivers.find(d => d.id === trip.driverId);
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-4 font-mono font-bold text-indigo-500">{trip.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{trip.origin}</span>
                          <span className="text-slate-400 font-mono font-normal">→</span>
                          <span>{trip.destination}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">Distance: {trip.distance} km</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{trip.vehicleId}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{driverObj?.name || 'Assigned Driver'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{trip.cargoType}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <Scale className="w-3 h-3 text-slate-400" />
                          <span>Payload: {trip.cargoWeight.toLocaleString('en-IN')} kg</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono">
                        <div>Start: {trip.startOdometer} km</div>
                        {trip.endOdometer && <div className="text-slate-400 text-[10px] mt-0.5">End: {trip.endOdometer} km</div>}
                      </td>
                      <td className="p-4 font-mono">
                        <div>Est: {trip.fuelEstimated} L</div>
                        {trip.fuelConsumed && <div className="text-emerald-500 font-semibold text-[10px] mt-0.5">Act: {trip.fuelConsumed} L</div>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          trip.status === 'Dispatched' ? 'bg-sky-500/10 text-sky-500' :
                          trip.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-rose-500/10 text-rose-500'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {trip.status === 'Dispatched' && (isManager || isDriver) ? (
                          <button
                            onClick={() => handleOpenComplete(trip)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                          >
                            Complete Trip
                          </button>
                        ) : trip.status === 'Dispatched' && isManager ? (
                          <button
                            onClick={() => handleCancelTrip(trip)}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded"
                            title="Cancel Trip"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH CARGO LOAD MODAL */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">Dispatch Logistics Cargo Load</h3>
              <button onClick={() => setShowDispatchModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Available Vehicle</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Choose Truck / Container --</option>
                    {vehicles
                      .filter(v => v.status === 'Available' && !trips.some(t => t.vehicleId === v.registrationNumber && t.status === 'Dispatched'))
                      .map(v => (
                        <option key={v.registrationNumber} value={v.registrationNumber}>
                          {v.registrationNumber} - {v.name} (Max Payload: {v.maxLoadCapacity} kg)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Driver Selection */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Active Driver</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers
                      .filter(d => d.status === 'Active' && !trips.some(t => t.driverId === d.id && t.status === 'Dispatched'))
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Safety Score: {d.safetyScore}, Expiry: {d.licenseExpiry})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cargo Type */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Cargo Type</label>
                  <input
                    type="text"
                    placeholder="Electronics / Heavy Steel"
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Cargo Weight */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Cargo Load Weight (kg)</label>
                  <input
                    type="number"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Origin */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Origin City</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Destination City</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Distance */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Distance (km)</label>
                  <input
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Special Delivery Instructions</label>
                <textarea
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
                  onClick={() => setShowDispatchModal(false)}
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
                  Dispatch Cargo Load
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE TRIP MANIFEST MODAL */}
      {showCompleteModal && activeTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">Complete Cargo Trip Manifest</h3>
              <button onClick={() => setShowCompleteModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-dashed text-[11px] space-y-1 bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800">
                <div className="flex justify-between font-bold">
                  <span>Trip Reference ID:</span>
                  <span className="font-mono text-indigo-500">{activeTrip.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Route:</span>
                  <span>{activeTrip.origin} → {activeTrip.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Odometer:</span>
                  <span className="font-mono">{activeTrip.startOdometer} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Fuel:</span>
                  <span className="font-mono">{activeTrip.fuelEstimated} Liters</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Final Odometer */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Final Odometer Reading (km)</label>
                  <input
                    type="number"
                    value={endOdometer}
                    onChange={(e) => setEndOdometer(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Actual Fuel Consumed */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Actual Fuel Consumed (Liters)</label>
                  <input
                    type="number"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fastag Tolls */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Highway Toll Fees (INR ₹)</label>
                  <input
                    type="number"
                    value={tollCost}
                    onChange={(e) => setTollCost(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Driver Allowance */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Driver Batta & Allowances (INR ₹)</label>
                  <input
                    type="number"
                    value={otherCost}
                    onChange={(e) => setOtherCost(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className={`px-4 py-2 border rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow shadow-emerald-600/20"
                >
                  Confirm Cargo Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
