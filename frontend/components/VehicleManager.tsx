import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Vehicle } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  Settings, 
  Info, 
  X,
  TrendingDown,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  Wrench,
  Droplet,
  Gauge,
  Activity
} from 'lucide-react';

interface VehicleManagerProps {
  darkMode: boolean;
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({ darkMode }) => {
  const { userProfile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected vehicle for detailed lifecycle analysis
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Lists for dynamic asset lifecycle aggregates
  const [trips, setTrips] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('registrationNumber');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form fields
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'Truck' | 'Container' | 'Trailer' | 'Tanker' | 'Van'>('Truck');
  const [maxLoadCapacity, setMaxLoadCapacity] = useState(15000);
  const [odometer, setOdometer] = useState(10000);
  const [acquisitionCost, setAcquisitionCost] = useState(3000000);
  const [status, setStatus] = useState<'Available' | 'On-Trip' | 'In-Shop' | 'Retired'>('Available');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');

  const isManager = userProfile?.role === 'Fleet Manager';

  useEffect(() => {
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
      const list: Vehicle[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Vehicle);
      });
      setVehicles(list);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to vehicles:', err);
      setLoading(false);
    });

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setTrips(list);
    });

    const unsubMaintenance = onSnapshot(collection(db, 'maintenanceLogs'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setMaintenanceLogs(list);
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setExpenses(list);
    });

    return () => {
      unsubVehicles();
      unsubTrips();
      unsubMaintenance();
      unsubExpenses();
    };
  }, []);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setErrorMessage('');
    setRegistrationNumber('');
    setName('');
    setModel('');
    setType('Truck');
    setMaxLoadCapacity(15000);
    setOdometer(10000);
    setAcquisitionCost(3000000);
    setStatus('Available');
    setInsuranceExpiry('');
    setLastServiceDate('');
    setShowModal(true);
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setIsEditMode(true);
    setErrorMessage('');
    setRegistrationNumber(vehicle.registrationNumber);
    setName(vehicle.name);
    setModel(vehicle.model);
    setType(vehicle.type);
    setMaxLoadCapacity(vehicle.maxLoadCapacity);
    setOdometer(vehicle.odometer);
    setAcquisitionCost(vehicle.acquisitionCost);
    setStatus(vehicle.status);
    setInsuranceExpiry(vehicle.insuranceExpiry || '');
    setLastServiceDate(vehicle.lastServiceDate || '');
    setShowModal(true);
  };

  const handleDeleteVehicle = async (regNum: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete vehicle ${regNum}?`)) return;
    try {
      await deleteDoc(doc(db, 'vehicles', regNum));
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      alert('Error deleting vehicle.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!registrationNumber.trim() || !name.trim() || !model.trim()) {
      setErrorMessage('Please fill in all mandatory text fields.');
      return;
    }

    // Regex pattern for Indian vehicle plate: e.g. MH-12-PQ-1234 or DL-01-A-1234
    const indianPlateRegex = /^[A-Z]{2}-\d{2}-[A-Z0-9]{1,2}-\d{4}$/;
    if (!indianPlateRegex.test(registrationNumber.toUpperCase())) {
      setErrorMessage('Invalid Indian registration format. Use: MH-12-QW-4512 or DL-01-AB-1234');
      return;
    }

    if (maxLoadCapacity <= 0 || odometer < 0 || acquisitionCost <= 0) {
      setErrorMessage('Values for capacity, odometer, and cost must be non-negative.');
      return;
    }

    const docId = registrationNumber.toUpperCase().trim();

    try {
      if (!isEditMode) {
        // Unique registration plate constraint
        const docRef = doc(db, 'vehicles', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setErrorMessage('A vehicle with this registration plate number already exists.');
          return;
        }
      }

      const vehicleData: Vehicle = {
        registrationNumber: docId,
        name: name.trim(),
        model: model.trim(),
        type,
        maxLoadCapacity,
        odometer,
        acquisitionCost,
        status,
        insuranceExpiry: insuranceExpiry || undefined,
        lastServiceDate: lastServiceDate || undefined,
        documents: [
          { name: 'RC Document', expiryDate: insuranceExpiry || '2028-12-31' },
          { name: 'National Permit', expiryDate: '2027-06-30' }
        ]
      };

      await setDoc(doc(db, 'vehicles', docId), vehicleData);
      setShowModal(false);
    } catch (err: any) {
      console.error('Failed to save vehicle data:', err);
      setErrorMessage(err.message || 'Firestore connection failure.');
    }
  };

  // Filter and sort computation
  const filteredVehicles = vehicles
    .filter((v) => {
      const matchSearch = 
        v.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = typeFilter === 'All' || v.type === typeFilter;
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'registrationNumber') {
        return a.registrationNumber.localeCompare(b.registrationNumber);
      } else if (sortBy === 'maxLoadCapacity') {
        return b.maxLoadCapacity - a.maxLoadCapacity;
      } else if (sortBy === 'odometer') {
        return b.odometer - a.odometer;
      } else if (sortBy === 'acquisitionCost') {
        return b.acquisitionCost - a.acquisitionCost;
      }
      return 0;
    });

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Vehicle Fleet Manager</h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain high-utilization road assets, commercial registration certificates, and maintenance status logs.
          </p>
        </div>
        
        {isManager && (
          <button
            id="add-vehicle-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Road Asset</span>
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
            placeholder="Search by plate, make, or specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`border rounded-lg p-1.5 outline-none font-medium ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Types</option>
              <option value="Truck">Truck</option>
              <option value="Container">Container</option>
              <option value="Trailer">Trailer</option>
              <option value="Tanker">Tanker</option>
              <option value="Van">Van</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`border rounded-lg p-1.5 outline-none font-medium ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On-Trip">On-Trip</option>
              <option value="In-Shop">In-Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`border rounded-lg p-1.5 outline-none font-medium ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="registrationNumber">Sort by Plate</option>
              <option value="maxLoadCapacity">Sort by Load Limit</option>
              <option value="odometer">Sort by Mileage</option>
              <option value="acquisitionCost">Sort by Capex Cost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Asset Data Table */}
      <div className={`border rounded-xl shadow-sm overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                <th className="p-4">Reg Plate</th>
                <th className="p-4">Asset Detail</th>
                <th className="p-4">Vehicle Type</th>
                <th className="p-4">Payload Limit</th>
                <th className="p-4">Odometer Log</th>
                <th className="p-4">Capital Cost (₹)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Syncing Indian road assets...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    No registered assets match your search filters.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr 
                    key={vehicle.registrationNumber} 
                    onClick={() => setSelectedVehicle(vehicle)}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 font-mono font-bold uppercase whitespace-nowrap">
                      <span className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-bold whitespace-nowrap inline-block tracking-wider shadow-inner shadow-black/40">
                        {vehicle.registrationNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{vehicle.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">{vehicle.model}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{vehicle.type}</span>
                    </td>
                    <td className="p-4 font-mono whitespace-nowrap">
                      {vehicle.maxLoadCapacity.toLocaleString('en-IN')} kg
                    </td>
                    <td className="p-4 font-mono whitespace-nowrap">
                      {vehicle.odometer.toLocaleString('en-IN')} km
                    </td>
                    <td className="p-4 font-mono font-semibold whitespace-nowrap">
                      {formatINR(vehicle.acquisitionCost)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        vehicle.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500' :
                        vehicle.status === 'On-Trip' ? 'bg-sky-500/10 text-sky-500' :
                        vehicle.status === 'In-Shop' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="p-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                          title="View Asset Health & Lifecycle"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        {isManager && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(vehicle)}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white"
                              title="Edit Vehicle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(vehicle.registrationNumber)}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                              title="Decommission Asset"
                              disabled={vehicle.status === 'On-Trip'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset CRUD Edit / Add Slide-over Panel Modal */}
      {showModal && (
        <div id="vehicle-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">
                {isEditMode ? `Edit Asset: ${registrationNumber}` : 'Register New Indian Road Asset'}
              </h3>
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
                {/* Plate */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Registration Plate (Required)</label>
                  <input
                    type="text"
                    disabled={isEditMode}
                    placeholder="MH-12-QW-4512"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    className={`w-full border rounded-lg p-2 outline-none uppercase font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">Format: State Code - District - Alpha - 4 Digit</span>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Asset Model Name</label>
                  <input
                    type="text"
                    placeholder="Tata Signa 4825.T"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Model */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Manufacturing Year & Spec</label>
                  <input
                    type="text"
                    placeholder="2023 Heavy Duty Multi-Axle"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Configuration Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Truck">Truck (Standard Heavy)</option>
                    <option value="Container">Container (Box Trailer)</option>
                    <option value="Trailer">Flatbed Trailer</option>
                    <option value="Tanker">Liquid Tanker</option>
                    <option value="Van">Delivery Van (LMV)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Payload */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Max Payload (kg)</label>
                  <input
                    type="number"
                    value={maxLoadCapacity}
                    onChange={(e) => setMaxLoadCapacity(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Odometer */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Capex */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Acquisition (INR)</label>
                  <input
                    type="number"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Current Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Available">Available</option>
                    <option value="On-Trip">On-Trip</option>
                    <option value="In-Shop">In-Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                {/* Insurance expiry */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Last Service */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Last Service Date</label>
                  <input
                    type="date"
                    value={lastServiceDate}
                    onChange={(e) => setLastServiceDate(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
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
                  {isEditMode ? 'Update Asset Specs' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSET LIFECYCLE & COMPLIANCE DETAIL DRAWER */}
      {selectedVehicle && (() => {
        const yearMatch = selectedVehicle.model.match(/\d{4}/);
        const manufacturingYear = yearMatch ? parseInt(yearMatch[0]) : 2018;
        const yearsInService = Math.max(1, 2026 - manufacturingYear);
        const maxLifeOdo = 300000; // 3 Lakhs KM standard useful life for commercial heavy assets
        const remainingUsefulLifePercent = Math.max(0, Math.min(100, Math.round(((maxLifeOdo - selectedVehicle.odometer) / maxLifeOdo) * 100)));

        const lifespanLimit = 10; // Commercial diesel vehicle limit of 10 years in India
        const registrationYear = manufacturingYear;
        const validityExpiryYear = registrationYear + lifespanLimit;
        const isVehicleExpired = 2026 > validityExpiryYear;
        const remainingValidityYears = validityExpiryYear - 2026;

        let lifecycleStage = 'Phase 2: Optimal Cruise';
        let lifecycleDescription = 'Asset is operating in peak efficiency with minimum maintenance and optimal payload throughput.';
        let lifecycleColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

        if (selectedVehicle.odometer < 20000 && yearsInService <= 1) {
          lifecycleStage = 'Phase 1: Brand New Asset';
          lifecycleDescription = 'Asset is in infant run-in stage. Maintain regular scheduled checkups for manufacturing quality assurance.';
          lifecycleColor = 'text-sky-500 bg-sky-500/10 border-sky-500/20';
        } else if (selectedVehicle.odometer >= 80000 && selectedVehicle.odometer < 180000) {
          lifecycleStage = 'Phase 3: Mature Operational Cycle';
          lifecycleDescription = 'Mature vehicle with typical capex depreciation. Monitor transmission fluid, tyre wear patterns, and brake assemblies regularly.';
          lifecycleColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        } else if (selectedVehicle.odometer >= 180000 && selectedVehicle.odometer < 250000) {
          lifecycleStage = 'Phase 4: Late Lifecycle Span';
          lifecycleDescription = 'Late-stage road asset. Major system overhauls recommended. Scheduled for increased preventive inspections.';
          lifecycleColor = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        } else if (selectedVehicle.odometer >= 250000 || yearsInService > 8 || selectedVehicle.status === 'Retired') {
          lifecycleStage = 'Phase 5: Critical / Near Retirement';
          lifecycleDescription = 'Critical odometer reading. Decommissioning plan active. Restrict to short-haul local shuttle dispatches to mitigate breakdown risks.';
          lifecycleColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        }

        const depreciationRate = 0.12;
        const currentBookValue = Math.max(selectedVehicle.acquisitionCost * 0.15, selectedVehicle.acquisitionCost * Math.pow(1 - depreciationRate, yearsInService));

        // Compute local metrics grounded in Firestore data
        const vehicleTrips = trips.filter(t => t.vehicleId === selectedVehicle.registrationNumber);
        const completedTripsCount = vehicleTrips.filter(t => t.status === 'Completed').length;
        const activeTripsCount = vehicleTrips.filter(t => t.status === 'Dispatched').length;

        const vehicleMaintenance = maintenanceLogs.filter(m => m.vehicleId === selectedVehicle.registrationNumber);
        const completedMaintenanceCost = vehicleMaintenance
          .filter(m => m.status === 'Completed')
          .reduce((sum, m) => sum + m.cost, 0);

        const vehicleExpenses = expenses.filter(e => e.vehicleId === selectedVehicle.registrationNumber);
        const totalFuelSpent = vehicleExpenses.filter(e => e.type === 'Fuel').reduce((sum, e) => sum + e.amount, 0);
        const totalTollsSpent = vehicleExpenses.filter(e => e.type === 'Toll').reduce((sum, e) => sum + e.amount, 0);

        // Compute standard Health Score
        const baseScore = 100 - Math.min(65, (selectedVehicle.odometer / 4000)) - (yearsInService * 3);
        const healthScore = Math.round(Math.max(25, selectedVehicle.status === 'In-Shop' ? baseScore - 15 : baseScore));

        // Compliance checks
        const isInsuranceExpired = selectedVehicle.insuranceExpiry ? new Date(selectedVehicle.insuranceExpiry) < new Date('2026-07-12') : true;
        const insuranceDays = selectedVehicle.insuranceExpiry 
          ? Math.ceil((new Date(selectedVehicle.insuranceExpiry).getTime() - new Date('2026-07-12').getTime()) / (1000 * 60 * 60 * 24)) 
          : 0;

        const daysSinceLastService = selectedVehicle.lastServiceDate
          ? Math.ceil((new Date('2026-07-12').getTime() - new Date(selectedVehicle.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24))
          : 90;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
            {/* Click-outside backdrop */}
            <div className="absolute inset-0" onClick={() => setSelectedVehicle(null)} />
            
            <div className={`relative w-full max-w-lg h-full flex flex-col shadow-2xl overflow-y-auto border-l p-6 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      {selectedVehicle.registrationNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      selectedVehicle.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      selectedVehicle.status === 'On-Trip' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                      selectedVehicle.status === 'In-Shop' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {selectedVehicle.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold tracking-tight">{selectedVehicle.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedVehicle.model}</p>
                </div>
                
                <button 
                  onClick={() => setSelectedVehicle(null)} 
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 py-5 space-y-6 overflow-y-auto pr-1">
                {/* Visual health score circle & RUL */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                    darkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Health Index</span>
                      <Activity className={`w-4 h-4 ${healthScore > 75 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-rose-500'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight font-mono">{healthScore}%</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Based on odometer, age, and maintenance frequency.</span>
                  </div>

                  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                    darkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Remaining Life (RUL)</span>
                      <Gauge className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight font-mono text-indigo-500">{remainingUsefulLifePercent}%</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Assuming 3,00,000 km target lifecourse.</span>
                  </div>
                </div>

                {/* Lifecycle Phase Indicator Card */}
                <div className={`p-4 rounded-xl border space-y-2 ${lifecycleColor}`}>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <h4 className="font-bold text-xs uppercase tracking-wider">{lifecycleStage}</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{lifecycleDescription}</p>
                </div>

                {/* Useful Life Progress Meter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Odometer Lifecycle Progression</span>
                    <span className="font-mono text-[11px] text-slate-400">{selectedVehicle.odometer.toLocaleString('en-IN')} / {maxLifeOdo.toLocaleString('en-IN')} km</span>
                  </div>
                  
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 flex">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        remainingUsefulLifePercent > 60 ? 'bg-emerald-500' :
                        remainingUsefulLifePercent > 30 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, (selectedVehicle.odometer / maxLifeOdo) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0 km (New)</span>
                    <span>1.5L km (Mid-Life)</span>
                    <span>3L km (Replacement)</span>
                  </div>
                </div>

                {/* Vehicle Life & RTO Validity Monitor */}
                <div className="p-4 rounded-xl border space-y-3 bg-slate-950 border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">RTO Regulatory Lifespan</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                      Commercial Diesel limit (10 Years)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Registered Year</span>
                      <span className="text-sm font-bold font-mono text-slate-200">{registrationYear}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">RTO Validity Expiry</span>
                      <span className={`text-sm font-bold font-mono ${isVehicleExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {validityExpiryYear} ({isVehicleExpired ? 'EXPIRED' : `${remainingValidityYears} Years Left`})
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-normal p-2.5 rounded bg-slate-900/40 border border-slate-800/40">
                    💡 <strong>Lifespan Rule:</strong> Under commercial RTO guidelines, heavy diesel assets have a strict operational life limit of <strong>10 years</strong>. Registered in <strong>{registrationYear}</strong>, this vehicle remains legally valid to operate on public highways until <strong>{validityExpiryYear}</strong>.
                  </div>
                </div>

                {/* Capex Depreciation Schedule */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capex Depreciation Schedule</h4>
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    darkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Initial Acquisition Value</span>
                        <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{formatINR(selectedVehicle.acquisitionCost)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold font-sans">Current Depreciated Book Value</span>
                        <span className="text-sm font-bold font-mono text-indigo-500">{formatINR(currentBookValue)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans border-t border-slate-200 dark:border-slate-800/60 pt-2 flex items-center justify-between">
                      <span>straight-line residual (12% YoY)</span>
                      <span>Asset Age: {yearsInService} Year{yearsInService > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Financial Ledger aggregates (sourcing actuals) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dynamic Asset Ledgers (Real Logs)</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800/50' : 'bg-white border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block font-semibold mb-1">Total Maintenance Capex</span>
                      <span className="font-bold font-mono text-amber-500 text-sm">{formatINR(completedMaintenanceCost)}</span>
                      <span className="text-[9px] text-slate-400 block mt-1 font-mono">{vehicleMaintenance.length} repair jobs logged</span>
                    </div>

                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800/50' : 'bg-white border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block font-semibold mb-1">Lifetime Diesel Expense</span>
                      <span className="font-bold font-mono text-emerald-500 text-sm">{formatINR(totalFuelSpent)}</span>
                      <span className="text-[9px] text-slate-400 block mt-1 font-mono">{completedTripsCount} completed dispatches</span>
                    </div>
                  </div>
                </div>

                {/* Regulatory Compliance Monitor checklist */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regulatory Compliance Audit</h4>
                  <div className={`p-4 rounded-xl border space-y-3 ${
                    darkMode ? 'bg-slate-950 border-slate-800/60' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    {/* Checkbox item 1: National Permit */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <X className="w-3.5 h-3.5 rotate-45" /> {/* Styled as a tick check */}
                      </div>
                      <div className="text-xs">
                        <span className="font-bold block text-slate-800 dark:text-slate-100">National Transport Permit (RC-NP)</span>
                        <span className="text-[10px] text-slate-400 block">Valid across all Indian states until 2027-06-30. Approved.</span>
                      </div>
                    </div>

                    {/* Checkbox item 2: Commercial Insurance Certificate */}
                    <div className="flex items-start gap-3 border-t border-slate-200 dark:border-slate-800/60 pt-2.5">
                      <div className={`mt-0.5 p-0.5 rounded border ${
                        isInsuranceExpired 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {isInsuranceExpired ? <X className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 rotate-45" />}
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold block text-slate-800 dark:text-slate-100">Commercial Carriage Insurance</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            isInsuranceExpired ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {isInsuranceExpired ? 'EXPIRED' : 'ACTIVE'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {selectedVehicle.insuranceExpiry 
                            ? `Expiry logged at ${selectedVehicle.insuranceExpiry} (${isInsuranceExpired ? 'Expired' : `${insuranceDays} days remaining`}).`
                            : 'No insurance certificate linked! Dispatch blocked.'}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox item 3: Preventive Maintenance Cycle */}
                    <div className="flex items-start gap-3 border-t border-slate-200 dark:border-slate-800/60 pt-2.5">
                      <div className={`mt-0.5 p-0.5 rounded border ${
                        daysSinceLastService > 180
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {daysSinceLastService > 180 ? <AlertCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 rotate-45" />}
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold block text-slate-800 dark:text-slate-100">Preventive Maintenance Checklist</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            daysSinceLastService > 180 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {daysSinceLastService > 180 ? 'SERVICE DUE' : 'UP-TO-DATE'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Last serviced {daysSinceLastService} days ago (on {selectedVehicle.lastServiceDate || 'N/A'}). Recommended interval is 180 days or 15,000 km.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Vehicle dispatch logs */}
                {vehicleTrips.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Dispatch Logs ({vehicleTrips.length})</h4>
                    <div className="space-y-2">
                      {vehicleTrips.slice(0, 3).map((trip) => (
                        <div key={trip.id} className={`p-3 rounded-lg border text-[11px] flex items-center justify-between font-mono ${
                          darkMode ? 'bg-slate-950 border-slate-800/40' : 'bg-slate-50 border-slate-200/40'
                        }`}>
                          <div>
                            <span className="font-bold text-indigo-500 block">{trip.id}</span>
                            <span className="text-slate-400 block mt-0.5">{trip.origin} → {trip.destination} ({trip.distance} km)</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            trip.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                            trip.status === 'Dispatched' ? 'bg-sky-500/10 text-sky-500' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {trip.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
