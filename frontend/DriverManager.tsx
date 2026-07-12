import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { Driver } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  Phone, 
  Calendar, 
  Award,
  X,
  AlertCircle
} from 'lucide-react';

interface DriverManagerProps {
  darkMode: boolean;
}

export const DriverManager: React.FC<DriverManagerProps> = ({ darkMode }) => {
  const { userProfile } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState<'LMV' | 'HMV' | 'TRANS'>('HMV');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [safetyScore, setSafetyScore] = useState(85);
  const [status, setStatus] = useState<'Active' | 'Suspended' | 'Inactive'>('Active');

  const isManager = userProfile?.role === 'Fleet Manager';
  const isSafetyOfficer = userProfile?.role === 'Safety Officer' || userProfile?.role === 'Fleet Manager';

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Driver);
      });
      setDrivers(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching drivers:', err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setErrorMessage('');
    setId(`driver_id_${100 + drivers.length + 1}`);
    setName('');
    setLicenseNumber('');
    setLicenseCategory('HMV');
    setLicenseExpiry('');
    setPhone('');
    setEmergencyContact('');
    setSafetyScore(90);
    setStatus('Active');
    setShowModal(true);
  };

  const handleOpenEditModal = (driver: Driver) => {
    setIsEditMode(true);
    setErrorMessage('');
    setId(driver.id);
    setName(driver.name);
    setLicenseNumber(driver.licenseNumber);
    setLicenseCategory(driver.licenseCategory);
    setLicenseExpiry(driver.licenseExpiry);
    setPhone(driver.phone);
    setEmergencyContact(driver.emergencyContact);
    setSafetyScore(driver.safetyScore);
    setStatus(driver.status);
    setShowModal(true);
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!window.confirm('Are you sure you want to remove this driver profile?')) return;
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
    } catch (err) {
      console.error('Error deleting driver:', err);
    }
  };

  const handleToggleSuspension = async (driver: Driver) => {
    const nextStatus = driver.status === 'Suspended' ? 'Active' : 'Suspended';
    const nextScore = driver.status === 'Suspended' ? 75 : 55; // Lower safety score on suspension
    try {
      await updateDoc(doc(db, 'drivers', driver.id), {
        status: nextStatus,
        safetyScore: nextScore
      });
    } catch (err) {
      console.error('Failed to change driver status:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !licenseNumber.trim() || !phone.trim() || !licenseExpiry) {
      setErrorMessage('Please fill in all mandatory text fields.');
      return;
    }

    if (safetyScore < 0 || safetyScore > 100) {
      setErrorMessage('Safety score must be a percentage value from 0 to 100.');
      return;
    }

    // Phone format validation (simple validation for 10-digit Indian numbers)
    const phoneClean = phone.replace(/[^0-9]/g, '');
    if (phoneClean.length < 10) {
      setErrorMessage('Please input a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      const driverData: Driver = {
        id,
        name: name.trim(),
        licenseNumber: licenseNumber.toUpperCase().trim(),
        licenseCategory,
        licenseExpiry,
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
        safetyScore,
        status
      };

      await setDoc(doc(db, 'drivers', id), driverData);
      setShowModal(false);
    } catch (err: any) {
      console.error('Failed to save driver:', err);
      setErrorMessage(err.message || 'Firestore write failure.');
    }
  };

  // Filter & sort drivers
  const filteredDrivers = drivers
    .filter((d) => {
      const matchSearch = 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm);
      
      const matchStatus = statusFilter === 'All' || d.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || d.licenseCategory === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'safetyScore') {
        return b.safetyScore - a.safetyScore;
      } else if (sortBy === 'licenseExpiry') {
        return new Date(a.licenseExpiry).getTime() - new Date(b.licenseExpiry).getTime();
      }
      return 0;
    });

  // Check if a license is expired relative to current simulated time (July 12, 2026)
  const isLicenseExpired = (expiry: string): boolean => {
    const today = new Date('2026-07-12');
    const expiryDate = new Date(expiry);
    return expiryDate < today;
  };

  // Indian Date Format (DD/MM/YYYY)
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

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Driver Registry & Safety Compliance</h2>
          <p className="text-xs text-slate-500 mt-1">
            Conduct license auditing, track real-time driving safety scoring, and manage active heavy-vehicle licenses.
          </p>
        </div>

        {isManager && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Driver</span>
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
            placeholder="Search by driver name, HMV/TRANS license, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
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
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`border rounded-lg p-1.5 outline-none font-medium ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Categories</option>
              <option value="HMV">HMV (Heavy Motor Vehicle)</option>
              <option value="TRANS">TRANS (Transport/Hazardous)</option>
              <option value="LMV">LMV (Light Motor Vehicle)</option>
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
              <option value="name">Sort by Name</option>
              <option value="safetyScore">Sort by Safety Score</option>
              <option value="licenseExpiry">Sort by License Expiry</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Drivers List View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            Syncing compliance registry...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            No registered drivers match your query parameters.
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const expired = isLicenseExpired(driver.licenseExpiry);
            const scoreColor = 
              driver.safetyScore >= 85 ? 'text-emerald-500 bg-emerald-500/10' :
              driver.safetyScore >= 70 ? 'text-amber-500 bg-amber-500/10' :
              'text-rose-500 bg-rose-500/10 border-rose-500/20';

            return (
              <div 
                key={driver.id} 
                className={`p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Upper Details */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                        {driver.name.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-tight">{driver.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                          <span>ID: {driver.id}</span>
                          <span>•</span>
                          <span className="font-bold uppercase text-indigo-400">{driver.licenseCategory}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      driver.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                      driver.status === 'Suspended' ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {driver.status}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">License Plate</span>
                      <span className="font-mono font-medium">{driver.licenseNumber}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">License Expiry</span>
                      <span className={`font-mono font-semibold flex items-center gap-1 ${expired ? 'text-rose-500 font-bold' : ''}`}>
                        {expired && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        {formatIndianDate(driver.licenseExpiry)}
                        {expired && <span className="text-[9px] uppercase font-bold">(Expired)</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mobile Contact</span>
                      <span className="font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {driver.phone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Safety compliance score</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[10px] flex items-center gap-1 ${scoreColor}`}>
                        <Award className="w-3 h-3 shrink-0" />
                        {driver.safetyScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lower Action Row */}
                {(isManager || isSafetyOfficer) && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1">
                      {isSafetyOfficer && (
                        <button
                          onClick={() => handleToggleSuspension(driver)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                            driver.status === 'Suspended' 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {driver.status === 'Suspended' ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Reactivate Driver</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Suspend Driver</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isManager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(driver)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Modify Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500"
                          title="Deboard Driver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Driver CRUD form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">
                {isEditMode ? `Modify Profile: ${name}` : 'Onboard Commercial Driver'}
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
                {/* ID */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Driver Employee ID</label>
                  <input
                    type="text"
                    disabled={isEditMode}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Driver Full Name</label>
                  <input
                    type="text"
                    placeholder="Amit Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* License Number */}
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Commercial License Number (DL)</label>
                  <input
                    type="text"
                    placeholder="DL-1420110034567"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* License Category */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">DL Category</label>
                  <select
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="HMV">HMV (Heavy Class)</option>
                    <option value="TRANS">TRANS (Transport/Hazmat)</option>
                    <option value="LMV">LMV (Light Cargo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* License Expiry */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">License Expiration Date</label>
                  <input
                    type="date"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Safety Score */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Safety Score (0-100)</label>
                  <input
                    type="number"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mobile Number (Primary)</label>
                  <input
                    type="text"
                    placeholder="+91 9812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Emergency Contact (Next of Kin)</label>
                  <input
                    type="text"
                    placeholder="+91 9988776655"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Operational Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Active">Active Duty</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive/Resigned</option>
                </select>
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
                  {isEditMode ? 'Update Profile' : 'Onboard Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
