import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  Truck, 
  Users, 
  MapPin, 
  Wrench, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Activity,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  Briefcase,
  FileSpreadsheet
} from 'lucide-react';
import { dbService } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import DashboardStats from './DashboardStats';

export default function GlobalDashboardView() {
  const { currentUser } = useAuth();
  const currentRole = currentUser?.role || 'fleet_manager';

  const stats = useMemo(() => dbService.getGlobalMetrics(), []);
  const vehicles = useMemo(() => dbService.getVehicles(), []);
  const expenses = useMemo(() => dbService.getExpenses(), []);
  const trips = useMemo(() => dbService.getTrips(), []);
  const fuelLogs = useMemo(() => dbService.getFuelLogs(), []);
  const drivers = useMemo(() => dbService.getDrivers(), []);

  // Compute Safety Officer specific metrics
  const safetyData = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let nearExpiry = 0;
    let suspended = 0;
    let totalScore = 0;
    let scoredDriversCount = 0;

    drivers.forEach(d => {
      const expiry = new Date(d.expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired++;
      } else if (diffDays <= 30) {
        nearExpiry++;
      }

      if (d.status === 'Suspended') {
        suspended++;
      }

      if (d.safetyScore !== undefined) {
        totalScore += d.safetyScore;
        scoredDriversCount++;
      }
    });

    const averageScore = scoredDriversCount > 0 ? Math.round(totalScore / scoredDriversCount) : 0;

    // Safety distribution bar chart data
    const distribution = [
      { name: 'Excellent (90+)', count: drivers.filter(d => d.safetyScore >= 90).length, fill: '#10b981' },
      { name: 'Good (80-89)', count: drivers.filter(d => d.safetyScore >= 80 && d.safetyScore < 90).length, fill: '#3b82f6' },
      { name: 'Fair (70-79)', count: drivers.filter(d => d.safetyScore >= 70 && d.safetyScore < 80).length, fill: '#f59e0b' },
      { name: 'Critical (<70)', count: drivers.filter(d => d.safetyScore < 70).length, fill: '#ef4444' }
    ];

    return {
      expired,
      nearExpiry,
      suspended,
      averageScore,
      distribution
    };
  }, [drivers]);

  // Vehicle Status Pie Chart data
  const vehicleStatusData = useMemo(() => {
    const counts = vehicles.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Available', value: counts['Available'] || 0, color: '#10b981' },
      { name: 'On Trip', value: counts['On Trip'] || 0, color: '#3b82f6' },
      { name: 'In Shop', value: counts['In Shop'] || 0, color: '#f59e0b' },
      { name: 'Retired', value: counts['Retired'] || 0, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [vehicles]);

  // Operational Expenses Trend data (Last 6 logged days)
  const operationalExpensesTrend = useMemo(() => {
    const dateGroups: Record<string, { date: string; fuel: number; maintenance: number; total: number }> = {};

    expenses.forEach(e => {
      const date = e.date.substring(5, 10); // MM-DD
      if (!dateGroups[date]) dateGroups[date] = { date, fuel: 0, maintenance: 0, total: 0 };
      if (e.category === 'Fuel') {
        dateGroups[date].fuel += e.cost;
      } else if (e.category === 'Maintenance' || e.category === 'Repair') {
        dateGroups[date].maintenance += e.cost;
      }
      dateGroups[date].total += e.cost;
    });

    return Object.values(dateGroups)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);
  }, [expenses]);

  // Expense categories breakdown
  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.cost;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
  }, [expenses]);

  // Define role specific KPI metric list
  const metricCards = useMemo(() => {
    switch (currentRole) {
      case 'fleet_manager':
        return [
          {
            title: 'Active Vehicles',
            value: `${stats.activeVehicles} Vehicles`,
            icon: <Truck className="h-5 w-5" />,
            color: 'bg-blue-100 dark:bg-blue-950/40',
            textColor: 'text-blue-600 dark:text-blue-400',
            description: 'Vehicles currently on active transit route',
            badge: { text: 'On Road', type: 'info' as const }
          },
          {
            title: 'Available Vehicles',
            value: `${stats.availableVehicles} Vehicles`,
            icon: <CheckCircle className="h-5 w-5" />,
            color: 'bg-emerald-100 dark:bg-emerald-950/40',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            description: 'Vehicles ready to be dispatched',
            badge: { text: 'Standby Ready', type: 'success' as const }
          },
          {
            title: 'Vehicles In Maintenance',
            value: `${stats.inShopVehicles} Vehicles`,
            icon: <Wrench className="h-5 w-5" />,
            color: 'bg-amber-100 dark:bg-amber-950/40',
            textColor: 'text-amber-600 dark:text-amber-400',
            description: 'Vehicles currently in the garage shop',
            badge: { 
              text: stats.inShopVehicles > 2 ? 'High Load' : 'Nominal', 
              type: (stats.inShopVehicles > 2 ? 'warning' : 'success') as 'warning' | 'success'
            }
          },
          {
            title: 'Fleet Utilization Rate',
            value: `${stats.fleetUtilization}%`,
            icon: <Percent className="h-5 w-5" />,
            color: 'bg-indigo-100 dark:bg-indigo-950/40',
            textColor: 'text-indigo-600 dark:text-indigo-400',
            description: 'Active vs active-service vehicles',
            badge: { 
              text: stats.fleetUtilization > 65 ? 'Optimal' : 'Underutilized', 
              type: (stats.fleetUtilization > 65 ? 'success' : 'warning') as 'success' | 'warning'
            }
          },
          {
            title: 'Total Vehicles',
            value: `${stats.totalVehicles} Registered`,
            icon: <Truck className="h-5 w-5" />,
            color: 'bg-purple-100 dark:bg-purple-950/40',
            textColor: 'text-purple-600 dark:text-purple-400',
            description: 'Total active fleet vehicles registered',
            badge: { text: 'Asset Portfolio', type: 'info' as const }
          }
        ];

      case 'driver_dispatcher':
        return [
          {
            title: 'Active Trips',
            value: `${stats.activeTrips} Routes`,
            icon: <Activity className="h-5 w-5" />,
            color: 'bg-blue-100 dark:bg-blue-950/40',
            textColor: 'text-blue-600 dark:text-blue-400',
            description: 'Trips currently dispatched & in transit',
            badge: { text: 'En Route', type: 'info' as const }
          },
          {
            title: 'Pending Trips',
            value: `${stats.pendingTrips} Drafts`,
            icon: <Clock className="h-5 w-5" />,
            color: 'bg-amber-100 dark:bg-amber-950/40',
            textColor: 'text-amber-600 dark:text-amber-400',
            description: 'Trip plans currently in draft state',
            badge: { text: 'Awaiting Crew', type: 'warning' as const }
          },
          {
            title: 'Completed Trips',
            value: `${stats.completedTrips} Delivered`,
            icon: <CheckCircle className="h-5 w-5" />,
            color: 'bg-emerald-100 dark:bg-emerald-950/40',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            description: 'Trips successfully fulfilled',
            badge: { text: 'Archived', type: 'success' as const }
          },
          {
            title: 'Vehicles Available',
            value: `${stats.availableVehicles} Trucks`,
            icon: <Truck className="h-5 w-5" />,
            color: 'bg-indigo-100 dark:bg-indigo-950/40',
            textColor: 'text-indigo-600 dark:text-indigo-400',
            description: 'Unassigned operational fleet assets',
            badge: { text: 'Ready', type: 'success' as const }
          },
          {
            title: 'Drivers Available',
            value: `${stats.driversAvailable} On Duty`,
            icon: <Users className="h-5 w-5" />,
            color: 'bg-purple-100 dark:bg-purple-950/40',
            textColor: 'text-purple-600 dark:text-purple-400',
            description: 'Drivers clocked in & ready to deploy',
            badge: { text: 'Standby Staff', type: 'success' as const }
          }
        ];

      case 'safety_officer':
        return [
          {
            title: 'Expired License CDL',
            value: `${safetyData.expired} Drivers`,
            icon: <ShieldAlert className="h-5 w-5" />,
            color: 'bg-rose-100 dark:bg-rose-950/40',
            textColor: 'text-rose-600 dark:text-rose-400',
            description: 'Expired driver credentials - immediate block',
            badge: { text: 'CRITICAL', type: 'danger' as const }
          },
          {
            title: 'CDL Expiring Soon',
            value: `${safetyData.nearExpiry} Drivers`,
            icon: <AlertTriangle className="h-5 w-5" />,
            color: 'bg-amber-100 dark:bg-amber-950/40',
            textColor: 'text-amber-600 dark:text-amber-400',
            description: 'License validity expiring within 30 days',
            badge: { text: 'Action Required', type: 'warning' as const }
          },
          {
            title: 'Suspended Drivers',
            value: `${safetyData.suspended} Drivers`,
            icon: <ShieldAlert className="h-5 w-5" />,
            color: 'bg-slate-100 dark:bg-slate-900',
            textColor: 'text-slate-600 dark:text-slate-400',
            description: 'Drivers suspended due to score or status',
            badge: { text: 'Duty Restrict', type: 'warning' as const }
          },
          {
            title: 'Safety Score Average',
            value: `${safetyData.averageScore}%`,
            icon: <ShieldCheck className="h-5 w-5" />,
            color: 'bg-emerald-100 dark:bg-emerald-950/40',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            description: 'Overall safety rating average of driver fleet',
            badge: { 
              text: safetyData.averageScore >= 85 ? 'Excellent' : 'Review Required', 
              type: (safetyData.averageScore >= 85 ? 'success' : 'warning') as 'success' | 'warning'
            }
          }
        ];

      case 'financial_analyst':
        return [
          {
            title: 'Fuel Expenses',
            value: `$${stats.fuelCost.toLocaleString()}`,
            icon: <Activity className="h-5 w-5" />,
            color: 'bg-blue-100 dark:bg-blue-950/40',
            textColor: 'text-blue-600 dark:text-blue-400',
            description: 'Consolidated fuel refueling costs',
            badge: { text: 'Fuel Ledger', type: 'info' as const }
          },
          {
            title: 'Maintenance Cost',
            value: `$${stats.maintenanceCost.toLocaleString()}`,
            icon: <Wrench className="h-5 w-5" />,
            color: 'bg-amber-100 dark:bg-amber-950/40',
            textColor: 'text-amber-600 dark:text-amber-400',
            description: 'Consolidated repair & oil change expenses',
            badge: { text: 'Service Costs', type: 'warning' as const }
          },
          {
            title: 'Operational Cost',
            value: `$${stats.operationalCost.toLocaleString()}`,
            icon: <DollarSign className="h-5 w-5" />,
            color: 'bg-rose-100 dark:bg-rose-950/40',
            textColor: 'text-rose-600 dark:text-rose-400',
            description: 'Sum of all logged expenses & overhead',
            badge: { text: 'Outflow Log', type: 'danger' as const }
          },
          {
            title: 'Gross Revenue',
            value: `$${stats.revenue.toLocaleString()}`,
            icon: <TrendingUp className="h-5 w-5" />,
            color: 'bg-emerald-100 dark:bg-emerald-950/40',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            description: 'Total revenue earned from route bookings',
            badge: { text: 'Inflow Log', type: 'success' as const }
          },
          {
            title: 'Net Profit',
            value: `$${stats.profit.toLocaleString()}`,
            icon: <Briefcase className="h-5 w-5" />,
            color: stats.profit >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-rose-100 dark:bg-rose-950/40',
            textColor: stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
            description: 'Gross revenue minus operational costs',
            badge: { text: stats.profit >= 0 ? 'In the Green' : 'Deficit Alert', type: stats.profit >= 0 ? 'success' : 'danger' }
          },
          {
            title: 'Financial ROI',
            value: `${stats.roi}%`,
            icon: <Percent className="h-5 w-5" />,
            color: 'bg-purple-100 dark:bg-purple-950/40',
            textColor: 'text-purple-600 dark:text-purple-400',
            description: 'Profitability return of operational outlays',
            badge: { text: 'Performance ROI', type: 'info' as const }
          }
        ];

      default:
        return [];
    }
  }, [currentRole, stats, safetyData]);

  // Render correct title according to department officer
  const departmentTitles = {
    fleet_manager: { title: 'Fleet Asset Manager Panel', subtitle: 'Logistical oversight, maintenance monitoring, and vehicle status registries' },
    driver_dispatcher: { title: 'Dispatcher Operations Desk', subtitle: 'Real-time route assignment, CDL driver dispatching, and trip schedules' },
    safety_officer: { title: 'Safety Compliance Portal', subtitle: 'Safety score audits, CDL driver credential tracking, and compliance logs' },
    financial_analyst: { title: 'Financial Intelligence Center', subtitle: 'Consolidated profit/loss ledger, fuel metrics, and fleet ROI audits' }
  };

  const activeTitle = departmentTitles[currentRole as keyof typeof departmentTitles] || departmentTitles.fleet_manager;

  return (
    <div className="space-y-6" id="global-dashboard-container">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
            {activeTitle.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{activeTitle.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 self-start rounded-lg bg-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/30">
          <Clock className="h-4 w-4" /> Live System Connected
        </div>
      </div>

      {/* KPI Stats Grid */}
      <DashboardStats metrics={metricCards} />

      {/* Dashboard Custom Features & Charts depending on Role */}
      {currentRole === 'fleet_manager' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Vehicle Status Pie Chart */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Fleet Asset Deployment Ratio</h3>
            <div className="flex flex-col sm:flex-row h-72 items-center justify-center gap-6">
              <div className="h-52 w-52 text-xs font-mono">
                {vehicleStatusData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400">No active fleet registered</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vehicleStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {vehicleStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              {/* Pie Legend */}
              <div className="flex-1 space-y-2">
                {vehicleStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-1.5 dark:border-slate-900/40">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.value} {item.value === 1 ? 'Asset' : 'Assets'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2: High Utilization Assets List */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Core Assets Milestones</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 uppercase tracking-wider font-mono font-bold text-[10px]">
                    <th className="py-2.5">Vehicle</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5 text-right">Odometer (km)</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/30">
                  {vehicles.slice(0, 5).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{v.name} <span className="text-[10px] text-slate-400 block font-mono">{v.registrationNumber}</span></td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{v.type}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">{v.odometer.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500' :
                          v.status === 'On Trip' ? 'bg-blue-500/10 text-blue-500' :
                          v.status === 'In Shop' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">No registered vehicles available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentRole === 'driver_dispatcher' && (
        <div className="grid grid-cols-1 gap-6">
          {/* List of current Active / Pending Trips */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Dispatcher Flight Route Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 uppercase tracking-wider font-mono font-bold text-[10px]">
                    <th className="py-2.5">Route</th>
                    <th className="py-2.5">Date Span</th>
                    <th className="py-2.5 text-right">Cargo (kg)</th>
                    <th className="py-2.5 text-right">Distance (km)</th>
                    <th className="py-2.5 text-right">Allocated Value</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/30">
                  {trips.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {t.source} &rarr; {t.destination}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[10px]">{t.startDate} to {t.endDate}</td>
                      <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">{t.cargoWeight.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">{t.plannedDistance}</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-500">${(t.revenue || 0).toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          t.status === 'Dispatched' ? 'bg-blue-500/10 text-blue-500' :
                          t.status === 'Draft' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {trips.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">No active trips logged on server.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {currentRole === 'safety_officer' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Driver Compliance Summary */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Driver Compliance Audit</h3>
            <div className="space-y-4">
              {drivers.slice(0, 5).map((d) => {
                const now = new Date();
                const expiry = new Date(d.expiryDate);
                const isExpired = expiry < now;
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 dark:border-slate-900 bg-slate-50/20 dark:bg-slate-900/10 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {d.name}
                        {d.status === 'Suspended' && <span className="text-[9px] px-1 bg-red-500/10 text-red-500 rounded uppercase font-mono">Suspended</span>}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">CDL Expiry: <span className={isExpired ? 'text-rose-500 font-bold' : 'text-slate-400'}>{d.expiryDate}</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Safety Score</span>
                      <span className={`text-sm font-black ${
                        d.safetyScore >= 90 ? 'text-emerald-500' :
                        d.safetyScore >= 80 ? 'text-blue-500' :
                        d.safetyScore >= 70 ? 'text-amber-500' : 'text-rose-500'
                      }`}>{d.safetyScore}%</span>
                    </div>
                  </div>
                );
              })}
              {drivers.length === 0 && (
                <p className="text-center text-slate-400 text-xs py-4">No CDL drivers registered in database.</p>
              )}
            </div>
          </div>

          {/* Safety distribution Chart */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Driver Safety Rating Distribution</h3>
            <div className="h-72 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safetyData.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Operators">
                    {safetyData.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {currentRole === 'financial_analyst' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Operational Expenses trend */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Operational Costs Analysis</h3>
            <div className="h-72 w-full text-xs font-mono">
              {operationalExpensesTrend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">Insufficient ledger logs.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operationalExpensesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="fuel" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Fuel" />
                    <Bar dataKey="maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Maintenance" />
                    <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} name="Total Expense" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Expense Categories breakdown */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Consolidated Expense Category Breakdown</h3>
            <div className="h-72 w-full text-xs font-mono">
              {expenseBreakdown.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">No expense records logged</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Value ($)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
