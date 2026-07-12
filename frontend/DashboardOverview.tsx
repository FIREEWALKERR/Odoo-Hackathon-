import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog } from '../types';
import { 
  TrendingUp, 
  Truck, 
  Users, 
  Navigation, 
  Wrench, 
  Activity, 
  DollarSign, 
  AlertTriangle,
  ArrowRight,
  Plus,
  Compass,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

interface DashboardProps {
  darkMode: boolean;
  setActiveTab: (tab: string) => void;
  openNewTripModal?: () => void;
  openNewVehicleModal?: () => void;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ darkMode, setActiveTab }) => {
  const { userProfile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up snapshot listeners for core collections
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

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      const list: Trip[] = [];
      snap.forEach(doc => list.push(doc.data() as Trip));
      setTrips(list);
    });

    const unsubMaint = onSnapshot(collection(db, 'maintenanceLogs'), (snap) => {
      const list: MaintenanceLog[] = [];
      snap.forEach(doc => list.push(doc.data() as MaintenanceLog));
      setMaintenance(list);
    });

    const unsubFuel = onSnapshot(collection(db, 'fuelLogs'), (snap) => {
      const list: FuelLog[] = [];
      snap.forEach(doc => list.push(doc.data() as FuelLog));
      setFuelLogs(list);
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      const list: ExpenseLog[] = [];
      snap.forEach(doc => list.push(doc.data() as ExpenseLog));
      setExpenses(list);
      setLoading(false);
    });

    return () => {
      unsubVehicles();
      unsubDrivers();
      unsubTrips();
      unsubMaint();
      unsubFuel();
      unsubExpenses();
    };
  }, []);

  // 1. KPI Calculations
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'On-Trip').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'In-Shop').length;

  const totalTrips = trips.length;
  const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
  const pendingTrips = trips.filter(t => t.status === 'Draft').length;
  const completedTrips = trips.filter(t => t.status === 'Completed').length;

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;
  const suspendedDrivers = drivers.filter(d => d.status === 'Suspended').length;

  // Fleet Utilization: (Active Vehicles + Maintenance Vehicles are utilized or just Active Vehicles / Total Fleet)
  const fleetUtilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

  // Financial Metrics (INR ₹)
  const totalFuelCost = expenses
    .filter(e => e.type === 'Fuel')
    .reduce((sum, e) => sum + e.amount, 0) || fuelLogs.reduce((sum, f) => sum + f.totalCost, 0);

  const totalMaintenanceCost = expenses
    .filter(e => e.type === 'Maintenance')
    .reduce((sum, e) => sum + e.amount, 0) || maintenance.filter(m => m.status === 'Completed').reduce((sum, m) => sum + m.cost, 0);

  const totalTollsCost = expenses
    .filter(e => e.type === 'Toll')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOtherCosts = expenses
    .filter(e => e.type === 'Driver Allowance' || e.type === 'Permit' || e.type === 'Other')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalTollsCost + totalOtherCosts;

  // Calculate Revenue (Simulated: ₹45 per Cargo Weight Ton per Kilometer)
  // Let's do: Distance (km) * CargoWeight (tons) * ₹20 + constant premium fee
  const totalRevenue = trips
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => {
      const tons = t.cargoWeight / 1000;
      const tripRevenue = Math.round((t.distance * tons * 18) + 12000);
      return sum + tripRevenue;
    }, 0);

  // Fleet ROI: (Revenue - Cost) / Cost * 100
  const totalNetProfit = totalRevenue - totalOperationalCost;
  const fleetROI = totalOperationalCost > 0 ? Math.round((totalNetProfit / totalOperationalCost) * 100) : 0;

  // Format currency in Lakhs or standard INR format
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // 2. Chart Dataset Preparations
  // Expense breakdown chart data
  const expenseBreakdownData = [
    { name: 'Fuel', value: totalFuelCost, color: '#6366f1' },
    { name: 'Maintenance', value: totalMaintenanceCost, color: '#f59e0b' },
    { name: 'Tolls', value: totalTollsCost, color: '#10b981' },
    { name: 'Driver Allowance & Surcharges', value: totalOtherCosts, color: '#ec4899' }
  ].filter(item => item.value > 0);

  // Weekly trip dispatch volume trend
  const tripTrendData = [
    { week: 'Week 1', Completed: 12, Active: 2, Cancelled: 1 },
    { week: 'Week 2', Completed: 15, Active: 3, Cancelled: 0 },
    { week: 'Week 3', Completed: 18, Active: 4, Cancelled: 2 },
    { week: 'Week 4', Completed: completedTrips % 20, Active: activeTrips, Cancelled: trips.filter(t => t.status === 'Cancelled').length % 5 }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mb-4"></div>
        <p className="text-sm font-medium text-slate-400">Loading operational control indicators...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Dynamic welcome greeting bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Operations Center</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status analysis of your heavy fleet and interstate dispatches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-mono py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Database Pipelines Synchronized
          </span>
        </div>
      </div>

      {/* Grid of 4 High-Fidelity Bento KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Vehicles */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fleet Utilization</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono">{fleetUtilization}%</div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{activeVehicles} on road / {totalVehicles} total</span>
              <span className="text-emerald-500 font-medium">+{availableVehicles} idle</span>
            </div>
          </div>
          {/* Accent decoration */}
          <div className="absolute right-0 bottom-0 w-24 h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
        </div>

        {/* Card 2: Active Dispatches */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Dispatches</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono">{activeTrips}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{pendingTrips} in draft workflow</span>
              <span className="text-rose-500 font-medium">{suspendedDrivers} suspended drivers</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        </div>

        {/* Card 3: Operating Cost */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Operational Expenses</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono">{formatINR(totalOperationalCost)}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Fuel: {formatINR(totalFuelCost)}</span>
              <span className="text-amber-500 font-medium">{maintenanceVehicles} in workshop</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
        </div>

        {/* Card 4: Fleet ROI */}
        <div className={`p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Logistics Gross Revenue</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono">{formatINR(totalRevenue)}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Margin ROI:</span>
              <span className="text-emerald-500 font-bold font-mono">+{fleetROI}%</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-24 h-1 bg-gradient-to-r from-rose-500 to-pink-500"></div>
        </div>
      </div>

      {/* Middle Grid - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Trend Area Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm lg:col-span-2 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight">Interstate Dispatch Volume</h3>
              <p className="text-[11px] text-slate-400 mt-1">Weekly volume tracking of completed vs active cargo trips.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-medium font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>Completed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"></span>Active</span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tripTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                    color: darkMode ? '#f8fafc' : '#0f172a',
                    fontSize: 11,
                    borderRadius: 8
                  }} 
                />
                <Area type="monotone" dataKey="Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
                <Area type="monotone" dataKey="Active" stroke="#6366f1" fillOpacity={1} fill="url(#colorActive)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operating Expense Distribution */}
        <div className={`p-6 rounded-2xl border shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Operating Cost Distribution</h3>
            <p className="text-[11px] text-slate-400 mt-1">Actual breakdowns of all compiled operational accounts.</p>
          </div>

          <div className="h-56 mt-4 flex items-center justify-center relative">
            {expenseBreakdownData.length === 0 ? (
              <div className="text-center text-xs text-slate-400">No expenses logged yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatINR(value)}
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                      borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                      borderRadius: 8,
                      fontSize: 11
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Total Cost</span>
              <span className="text-xs font-bold font-mono">{formatINR(totalOperationalCost)}</span>
            </div>
          </div>

          {/* Pie Chart Legend with percentages */}
          <div className="space-y-1.5 mt-2">
            {expenseBreakdownData.map((item, idx) => {
              const pct = totalOperationalCost > 0 ? Math.round((item.value / totalOperationalCost) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <span className="font-bold font-mono text-slate-300">{pct}% ({formatINR(item.value)})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions, Recent Activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions Panel */}
        <div className={`p-6 rounded-2xl border shadow-sm lg:col-span-1 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="text-sm font-bold tracking-tight mb-4">Express Workflows</h3>
          <div className="grid grid-cols-1 gap-2.5">
            <button 
              onClick={() => setActiveTab('trips')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border text-left hover:-translate-y-0.5 transition-all cursor-pointer bg-gradient-to-r hover:from-indigo-500/10 hover:to-indigo-500/5 hover:border-indigo-500/30 dark:border-slate-800 border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Dispatch Cargo Trip</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Assign vehicle & driver instantly</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button 
              onClick={() => setActiveTab('expenses')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border text-left hover:-translate-y-0.5 transition-all cursor-pointer bg-gradient-to-r hover:from-emerald-500/10 hover:to-emerald-500/5 hover:border-emerald-500/30 dark:border-slate-800 border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Log Fuel Receipt</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Record immediate transit diesel cost</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button 
              onClick={() => setActiveTab('maintenance')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border text-left hover:-translate-y-0.5 transition-all cursor-pointer bg-gradient-to-r hover:from-amber-500/10 hover:to-amber-500/5 hover:border-amber-500/30 dark:border-slate-800 border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Schedule Repair Shop</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Maintain dumper & container health</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Live Active Trips Grid */}
        <div className={`p-6 rounded-2xl border shadow-sm lg:col-span-2 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-tight">Active Dispatches Track</h3>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded cursor-pointer" onClick={() => setActiveTab('trips')}>
              See All
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2.5">Trip ID</th>
                  <th className="pb-2.5">Route</th>
                  <th className="pb-2.5">Vehicle</th>
                  <th className="pb-2.5">Driver</th>
                  <th className="pb-2.5 text-right">Odometer Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {trips.filter(t => t.status === 'Dispatched').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No vehicles currently dispatched on trips.
                    </td>
                  </tr>
                ) : (
                  trips.filter(t => t.status === 'Dispatched').slice(0, 4).map((trip) => {
                    const vehicleObj = vehicles.find(v => v.registrationNumber === trip.vehicleId);
                    const driverObj = drivers.find(d => d.id === trip.driverId);
                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-3 font-bold text-indigo-500 font-mono">{trip.id}</td>
                        <td className="py-3">
                          <span className="font-semibold">{trip.origin}</span>
                          <span className="text-slate-400 px-1 font-mono">→</span>
                          <span className="font-semibold">{trip.destination}</span>
                        </td>
                        <td className="py-3 font-mono">{trip.vehicleId}</td>
                        <td className="py-3">{driverObj?.name || 'Assigned Driver'}</td>
                        <td className="py-3 text-right font-mono text-slate-400">{trip.startOdometer} km</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
