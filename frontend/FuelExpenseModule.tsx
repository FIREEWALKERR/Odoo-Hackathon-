import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { FuelLog, ExpenseLog, Vehicle, Trip } from '../types';
import { 
  Plus, 
  Fuel, 
  DollarSign, 
  Download, 
  Trash2, 
  X, 
  Search,
  Filter,
  AlertCircle,
  FileText
} from 'lucide-react';

interface FuelExpenseModuleProps {
  darkMode: boolean;
}

export const FuelExpenseModule: React.FC<FuelExpenseModuleProps> = ({ darkMode }) => {
  const { userProfile } = useAuth();
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Table Tabs
  const [activeTab, setActiveTab] = useState<'expenses' | 'fuel'>('expenses');

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Expense Form fields
  const [vReg, setVReg] = useState('');
  const [tripId, setTripId] = useState('');
  const [expType, setExpType] = useState<ExpenseLog['type']>('Permit');
  const [amount, setAmount] = useState(2500);
  const [expDate, setExpDate] = useState('2026-07-12');
  const [description, setDescription] = useState('NHAI interstate permit tax');

  // Fuel Form fields
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelTripId, setFuelTripId] = useState('');
  const [fuelDate, setFuelDate] = useState('2026-07-12');
  const [fuelLiters, setFuelLiters] = useState(80);
  const [fuelPrice, setFuelPrice] = useState(95); // Default ₹95/l in India
  const [fuelOdometer, setFuelOdometer] = useState(24000);
  const [fuelLocation, setFuelLocation] = useState('Jaipur, RJ (NH-48)');

  const isFinanceOrManager = userProfile?.role === 'Financial Analyst' || userProfile?.role === 'Fleet Manager';
  const isDriver = userProfile?.role === 'Driver';

  useEffect(() => {
    const unsubFuel = onSnapshot(collection(db, 'fuelLogs'), (snap) => {
      const list: FuelLog[] = [];
      snap.forEach(doc => list.push(doc.data() as FuelLog));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setFuelLogs(list);
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      const list: ExpenseLog[] = [];
      snap.forEach(doc => list.push(doc.data() as ExpenseLog));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(list);
      setLoading(false);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const list: Vehicle[] = [];
      snap.forEach(doc => list.push(doc.data() as Vehicle));
      setVehicles(list);
    });

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      const list: Trip[] = [];
      snap.forEach(doc => list.push(doc.data() as Trip));
      setTrips(list);
    });

    return () => {
      unsubFuel();
      unsubExpenses();
      unsubVehicles();
      unsubTrips();
    };
  }, []);

  const handleOpenExpense = () => {
    setErrorMessage('');
    setVReg(vehicles[0]?.registrationNumber || '');
    setTripId('');
    setExpType('Permit');
    setAmount(2000);
    setExpDate('2026-07-12');
    setDescription('RTO Checkpost interstate toll clearance');
    setShowExpenseModal(true);
  };

  const handleOpenFuel = () => {
    setErrorMessage('');
    setFuelVehicleId(vehicles[0]?.registrationNumber || '');
    setFuelTripId('');
    setFuelDate('2026-07-12');
    setFuelLiters(100);
    setFuelPrice(95);
    setFuelOdometer(vehicles[0]?.odometer || 15000);
    setFuelLocation('Mumbai, MH Highway Hub');
    setShowFuelModal(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (amount <= 0 || !description.trim()) {
      setErrorMessage('Please check your amount or write a brief description.');
      return;
    }

    try {
      const id = `EXP-LEDG-${1000 + expenses.length + 1}`;
      const expenseData: ExpenseLog = {
        id,
        vehicleId: vReg || undefined,
        tripId: tripId || undefined,
        type: expType,
        amount,
        date: expDate,
        description: description.trim()
      };

      await setDoc(doc(db, 'expenses', id), expenseData);
      setShowExpenseModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Firestore write error');
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (fuelLiters <= 0 || fuelPrice <= 0 || fuelOdometer <= 0 || !fuelLocation.trim()) {
      setErrorMessage('Fill in all numeric fuel variables correctly.');
      return;
    }

    try {
      const id = `FUEL-LOG-${2000 + fuelLogs.length + 1}`;
      const totalCost = fuelLiters * fuelPrice;

      const fuelLog: FuelLog = {
        id,
        vehicleId: fuelVehicleId,
        tripId: fuelTripId || undefined,
        date: fuelDate,
        liters: fuelLiters,
        costPerLiter: fuelPrice,
        totalCost,
        odometer: fuelOdometer,
        location: fuelLocation.trim()
      };

      const batch = writeBatch(db);

      // Save Fuel log
      batch.set(doc(db, 'fuelLogs', id), fuelLog);

      // Save general expense counterpart
      const expId = `EXP-FUEL-LOG-${id}`;
      batch.set(doc(db, 'expenses', expId), {
        id: expId,
        vehicleId: fuelVehicleId,
        tripId: fuelTripId || undefined,
        type: 'Fuel',
        amount: totalCost,
        date: fuelDate,
        description: `Diesel refill ${fuelLiters} Liters @ ₹${fuelPrice}/L at ${fuelLocation}.`
      });

      // Update Vehicle odometer if higher than current odometer
      const currentVeh = vehicles.find(v => v.registrationNumber === fuelVehicleId);
      if (currentVeh && fuelOdometer > currentVeh.odometer) {
        batch.update(doc(db, 'vehicles', fuelVehicleId), { odometer: fuelOdometer });
      }

      await batch.commit();
      setShowFuelModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Firestore write error');
    }
  };

  const handleAddDummyBill = async () => {
    try {
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)]?.registrationNumber || 'DL-01-AB-9876';
      const randomAmount = Math.floor(Math.random() * 8000) + 1500;
      const randomLiters = Math.floor(Math.random() * 120) + 40;
      const todayStr = '2026-07-12';
      
      const newExpId = `EXP-DUMMY-${Math.floor(100000 + Math.random() * 900000)}`;
      const dummyExp: ExpenseLog = {
        id: newExpId,
        vehicleId: randomVehicle,
        type: Math.random() > 0.5 ? 'Fuel' : 'Toll',
        amount: randomAmount,
        date: todayStr,
        description: Math.random() > 0.5 
          ? `Diesel Refill of ${randomLiters}L at BPCL Highway pump.`
          : `Fastag Auto-toll deduction at NH-8 checkpost toll gate.`
      };

      await setDoc(doc(db, 'expenses', newExpId), dummyExp);

      if (dummyExp.type === 'Fuel') {
        const newFuelId = `FUEL-DUMMY-${Math.floor(100000 + Math.random() * 900000)}`;
        const dummyFuel: FuelLog = {
          id: newFuelId,
          vehicleId: randomVehicle,
          date: todayStr,
          liters: randomLiters,
          costPerLiter: 95.0,
          totalCost: randomAmount,
          odometer: 125000,
          location: 'BPCL Highway Plaza, NH-48'
        };
        await setDoc(doc(db, 'fuelLogs', newFuelId), dummyFuel);
      }
    } catch (err) {
      console.error('Failed to add dummy bill:', err);
    }
  };

  // CSV EXPORTER - Highly customized and professional client-side CSV generator!
  const exportToCSV = () => {
    let headers = '';
    let rows: string[][] = [];
    let filename = '';

    if (activeTab === 'expenses') {
      headers = 'Expense ID,Date,Type,Vehicle Plate,Trip Ref,Amount (₹),Description\r\n';
      rows = filteredExpenses.map(e => [
        e.id,
        formatIndianDate(e.date),
        e.type,
        e.vehicleId || 'N/A',
        e.tripId || 'N/A',
        e.amount.toString(),
        `"${e.description.replace(/"/g, '""')}"`
      ]);
      filename = 'TransitOps_Expense_Ledger.csv';
    } else {
      headers = 'Fuel Log ID,Date,Vehicle Plate,Trip Ref,Liters,Cost/L (₹),Total Cost (₹),Odometer,Location\r\n';
      rows = filteredFuelLogs.map(f => [
        f.id,
        formatIndianDate(f.date),
        f.vehicleId,
        f.tripId || 'N/A',
        f.liters.toString(),
        f.costPerLiter.toString(),
        f.totalCost.toString(),
        f.odometer.toString(),
        `"${f.location.replace(/"/g, '""')}"`
      ]);
      filename = 'TransitOps_Diesel_Logs.csv';
    }

    const csvContent = headers + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculations for total operations cost summary
  const totalFuelCost = expenses.filter(e => e.type === 'Fuel').reduce((sum, e) => sum + e.amount, 0) || fuelLogs.reduce((sum, f) => sum + f.totalCost, 0);
  const totalMaintenance = expenses.filter(e => e.type === 'Maintenance').reduce((sum, e) => sum + e.amount, 0);
  const totalTolls = expenses.filter(e => e.type === 'Toll').reduce((sum, e) => sum + e.amount, 0);
  const totalOthers = expenses.filter(e => e.type !== 'Fuel' && e.type !== 'Maintenance' && e.type !== 'Toll').reduce((sum, e) => sum + e.amount, 0);
  const totalOperationalLedger = totalFuelCost + totalMaintenance + totalTolls + totalOthers;

  // Filter datasets
  const filteredExpenses = expenses.filter((e) => {
    const matchSearch = 
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vehicleId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.tripId || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = typeFilter === 'All' || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const filteredFuelLogs = fuelLogs.filter((f) => {
    const matchSearch = 
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.vehicleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.tripId || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Fuel Ledger & Expenses Control</h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile interstate NH Fastag toll fees, track diesel liters consumption efficacy, and export fiscal CSV audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Seed Demo Bill */}
          <button
            onClick={handleAddDummyBill}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold shadow transition-all"
            title="Instantly generate a dummy fuel or toll bill"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seed Demo Bill</span>
          </button>

          {/* CSV Download */}
          <button
            onClick={exportToCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
              darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {isFinanceOrManager && (
            <button
              onClick={handleOpenExpense}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          )}

          {(isFinanceOrManager || isDriver) && (
            <button
              onClick={handleOpenFuel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow shadow-emerald-600/20"
            >
              <Fuel className="w-4 h-4" />
              <span>Log Fuel Refill</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Financial Totals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Operations Costs</div>
          <div className="text-xl font-bold font-mono mt-1 text-indigo-500">{formatINR(totalOperationalLedger)}</div>
        </div>
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fuel Costs (Diesel)</div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-200">{formatINR(totalFuelCost)}</div>
        </div>
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">National Highway Tolls</div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-200">{formatINR(totalTolls)}</div>
        </div>
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Servicing & Workshop</div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-200">{formatINR(totalMaintenance)}</div>
        </div>
      </div>

      {/* Selector Tabs & Searches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('expenses'); setSearchTerm(''); }}
            className={`pb-3.5 text-xs font-bold px-4 border-b-2 transition ${
              activeTab === 'expenses' 
                ? 'border-indigo-600 text-indigo-500' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Fiscal Ledger Accounts
          </button>
          <button
            onClick={() => { setActiveTab('fuel'); setSearchTerm(''); }}
            className={`pb-3.5 text-xs font-bold px-4 border-b-2 transition ${
              activeTab === 'fuel' 
                ? 'border-indigo-600 text-indigo-500' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Diesel Fill Logbook
          </button>
        </div>

        {/* Local Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'expenses' ? "Filter transaction ledger..." : "Filter fuel logbook..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-850'
            }`}
          />
        </div>
      </div>

      {/* DATA VIEWS TABLES */}
      {activeTab === 'expenses' ? (
        /* EXPENSE LEDGER TABLE */
        <div className={`border rounded-xl shadow-sm overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Booking Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Vehicle Plate</th>
                  <th className="p-4">Trip Link</th>
                  <th className="p-4">Amount (₹)</th>
                  <th className="p-4">Ledger Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Loading ledger logs...</td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">No ledger transactions found.</td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-4 font-mono font-bold text-slate-400">{exp.id}</td>
                      <td className="p-4 font-mono">{formatIndianDate(exp.date)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          exp.type === 'Fuel' ? 'bg-indigo-500/10 text-indigo-500' :
                          exp.type === 'Maintenance' ? 'bg-amber-500/10 text-amber-500' :
                          exp.type === 'Toll' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {exp.type}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-semibold uppercase whitespace-nowrap">{exp.vehicleId || 'Shared'}</td>
                      <td className="p-4 font-mono text-indigo-500 font-bold">{exp.tripId || 'Corporate overhead'}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{formatINR(exp.amount)}</td>
                      <td className="p-4 text-slate-400">{exp.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FUEL LOGS TABLE */
        <div className={`border rounded-xl shadow-sm overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Purchase Date</th>
                  <th className="p-4">Vehicle Plate</th>
                  <th className="p-4">Trip Link</th>
                  <th className="p-4">Liters</th>
                  <th className="p-4">Rate (₹/L)</th>
                  <th className="p-4">Bill Amount</th>
                  <th className="p-4">Odometer Log</th>
                  <th className="p-4">Fueling Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredFuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">No diesel refill logs recorded.</td>
                  </tr>
                ) : (
                  filteredFuelLogs.map((fuel) => (
                    <tr key={fuel.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="p-4 font-mono font-bold text-slate-400">{fuel.id}</td>
                      <td className="p-4 font-mono">{formatIndianDate(fuel.date)}</td>
                      <td className="p-4 font-mono font-bold uppercase whitespace-nowrap">{fuel.vehicleId}</td>
                      <td className="p-4 font-mono text-indigo-500 font-semibold">{fuel.tripId || 'N/A'}</td>
                      <td className="p-4 font-mono">{fuel.liters} Liters</td>
                      <td className="p-4 font-mono">₹{fuel.costPerLiter}</td>
                      <td className="p-4 font-mono font-bold text-emerald-500">{formatINR(fuel.totalCost)}</td>
                      <td className="p-4 font-mono">{fuel.odometer.toLocaleString('en-IN')} km</td>
                      <td className="p-4 text-slate-400">{fuel.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE LOG MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">Log operational ledger expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Vehicle Link */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Vehicle (Optional)</label>
                  <select
                    value={vReg}
                    onChange={(e) => setVReg(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- No Specific Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.registrationNumber} value={v.registrationNumber}>{v.registrationNumber}</option>
                    ))}
                  </select>
                </div>

                {/* Trip Link */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Trip (Optional)</label>
                  <select
                    value={tripId}
                    onChange={(e) => setTripId(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- No Specific Trip --</option>
                    {trips.slice(0, 20).map(t => (
                      <option key={t.id} value={t.id}>{t.id} ({t.origin} → {t.destination})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Expense Type */}
                <div className="col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Expense category</label>
                  <select
                    value={expType}
                    onChange={(e) => setExpType(e.target.value as any)}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Permit">State Border RTO Permit</option>
                    <option value="Toll">NHAI Fastag Manual Refill</option>
                    <option value="Driver Allowance">Driver Batta / Daily Allowance</option>
                    <option value="Maintenance">Ad-hoc Roadside Breakdown Repairs</option>
                    <option value="Other">Miscellaneous corporate overhead</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Amount (INR)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Transaction Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none font-mono ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Transaction description / Ledger details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none h-16 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
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
                  Log Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG FUEL REFILL MODAL */}
      {showFuelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border p-6 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold tracking-tight">Log diesel fuel purchase manifest</h3>
              <button onClick={() => setShowFuelModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleFuelSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Fuel Vehicle Link */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Vehicle (Mandatory)</label>
                  <select
                    value={fuelVehicleId}
                    onChange={(e) => {
                      setFuelVehicleId(e.target.value);
                      const selectedV = vehicles.find(v => v.registrationNumber === e.target.value);
                      if (selectedV) setFuelOdometer(selectedV.odometer);
                    }}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- Select Plate --</option>
                    {vehicles.map(v => (
                      <option key={v.registrationNumber} value={v.registrationNumber}>{v.registrationNumber} ({v.name})</option>
                    ))}
                  </select>
                </div>

                {/* Fuel Trip Link */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Link to active dispatch Trip (Optional)</label>
                  <select
                    value={fuelTripId}
                    onChange={(e) => setFuelTripId(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="">-- No Active Trip link --</option>
                    {trips.filter(t => t.status === 'Dispatched' || t.status === 'Completed').slice(0, 15).map(t => (
                      <option key={t.id} value={t.id}>{t.id} ({t.origin} → {t.destination})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Liters */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Refuel Liters (L)</label>
                  <input
                    type="number"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Price/L */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Diesel Rate (₹/L)</label>
                  <input
                    type="number"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Total Calc preview */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Calculated Total</label>
                  <div className="p-2 border rounded-lg bg-slate-150 dark:bg-slate-950/40 text-emerald-500 font-bold font-mono text-[11px] leading-tight text-center">
                    ₹{(fuelLiters * fuelPrice).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Odometer */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    value={fuelOdometer}
                    onChange={(e) => setFuelOdometer(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Fueling Date */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date of Fuel Purchase</label>
                  <input
                    type="date"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className={`w-full border rounded-lg p-2 outline-none font-mono ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Filling Station Location (Indian Highway RTO Hub)</label>
                <input
                  type="text"
                  placeholder="Bharat Petroleum Station (NH-8), Gurgaon"
                  value={fuelLocation}
                  onChange={(e) => setFuelLocation(e.target.value)}
                  className={`w-full border rounded-lg p-2 outline-none ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
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
                  Commit Fuel Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
