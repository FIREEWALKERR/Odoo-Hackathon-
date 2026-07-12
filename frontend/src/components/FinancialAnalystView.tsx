import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  BarChart3, 
  FileText, 
  Download, 
  Droplet, 
  DollarSign, 
  Calculator,
  Calendar,
  X,
  TrendingUp,
  Percent,
  Sliders,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { dbService } from '../lib/storage';
import { Expense, FuelLog, Vehicle, ExpenseCategory } from '../types';
import DashboardStats from './DashboardStats';
import { useConfirm } from './ConfirmProvider';

interface FinancialAnalystViewProps {
  initialSubTab?: 'expenses' | 'fuel' | 'reports';
}

export default function FinancialAnalystView({ initialSubTab }: FinancialAnalystViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>(() => dbService.getExpenses());
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => dbService.getFuelLogs());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => dbService.getVehicles());
  const { confirm } = useConfirm();

  // Navigation
  const [subTab, setSubTab] = useState<'expenses' | 'fuel' | 'reports'>('expenses');

  // Sync internal subtab when initialSubTab changes from parent
  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [vehicleFilter, setVehicleFilter] = useState<string>('All');

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);

  // Form Fields - Expense
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Toll');
  const [expCost, setExpCost] = useState<number>(50);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDesc, setExpDesc] = useState('');

  // Form Fields - Fuel Log
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState<number>(50);
  const [fuelCost, setFuelCost] = useState<number>(90);
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);

  // Report Generator State
  const [selectedReportType, setSelectedReportType] = useState<'fuel_efficiency' | 'operational_cost'>('operational_cost');

  // Feedback feedback
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const syncDB = () => {
    setExpenses(dbService.getExpenses());
    setFuelLogs(dbService.getFuelLogs());
    setVehicles(dbService.getVehicles());
  };

  // Financial KPIs
  const financialStats = useMemo(() => dbService.getGlobalMetrics(), [expenses, fuelLogs, vehicles]);

  const kpis = [
    {
      title: 'Total Operating Expenses',
      value: `$${financialStats.operationalCost.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-red-100 dark:bg-red-950/40',
      textColor: 'text-red-600 dark:text-red-400',
      description: 'Fuel, maintenance, insurance, toll',
      badge: { text: 'Running Bills', type: 'danger' as const }
    },
    {
      title: 'Fuel Refueling Expenses',
      value: `$${financialStats.fuelCost.toLocaleString()}`,
      icon: <Droplet className="h-5 w-5" />,
      color: 'bg-emerald-100 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      description: 'Total diesel/gas volume costs',
      badge: { text: 'Refuel Bills', type: 'success' as const }
    },
    {
      title: 'Maintenance & Repairs',
      value: `$${financialStats.maintenanceCost.toLocaleString()}`,
      icon: <Calculator className="h-5 w-5" />,
      color: 'bg-amber-100 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      description: 'Shop bills, parts, routine checks',
      badge: { text: 'Asset Costs', type: 'warning' as const }
    },
    {
      title: 'Toll & Other Fees',
      value: `$${(financialStats.operationalCost - financialStats.fuelCost - financialStats.maintenanceCost).toLocaleString()}`,
      icon: <Percent className="h-5 w-5" />,
      color: 'bg-indigo-100 dark:bg-indigo-950/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      description: 'Toll gates, insurance, misc fees',
      badge: { text: 'Overhead Costs', type: 'info' as const }
    }
  ];

  // Filters computed expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (categoryFilter !== 'All') {
      result = result.filter(e => e.category === categoryFilter);
    }
    if (vehicleFilter !== 'All') {
      result = result.filter(e => e.vehicleId === vehicleFilter);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, categoryFilter, vehicleFilter]);

  // Submit Expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!expVehicleId || !expDesc.trim()) {
      setFormError('Please choose vehicle and add expense description.');
      return;
    }

    try {
      dbService.addExpense({
        vehicleId: expVehicleId,
        category: expCategory,
        cost: Number(expCost),
        date: expDate,
        description: expDesc
      });
      triggerToast('Logged expense item in accounting ledgers.');
      syncDB();
      setShowExpenseModal(false);
      // Reset
      setExpDesc('');
      setExpVehicleId('');
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Submit Fuel Log
  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fuelVehicleId) {
      setFormError('Please select a vehicle.');
      return;
    }

    try {
      dbService.addFuelLog({
        vehicleId: fuelVehicleId,
        liters: Number(fuelLiters),
        cost: Number(fuelCost),
        date: fuelDate
      });
      triggerToast('Registered fuel refueling log.');
      syncDB();
      setShowFuelModal(false);
      setFuelVehicleId('');
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Expense Record',
      message: 'Are you sure you want to delete this expense record? This action is permanent.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (ok) {
      try {
        dbService.deleteExpense(id);
        triggerToast('Expense item removed.');
        syncDB();
      } catch (err: any) {
        triggerToast(err.message || 'Error occurred.');
      }
    }
  };

  // Delete Fuel Log
  const handleDeleteFuelLog = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Fuel Log',
      message: 'Are you sure you want to delete this fuel log record? This action is permanent.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (ok) {
      try {
        dbService.deleteFuelLog(id);
        triggerToast('Fuel log removed.');
        syncDB();
      } catch (err: any) {
        triggerToast(err.message || 'Error occurred.');
      }
    }
  };

  // ================= CALCULATE REPORTS DATA =================
  const fuelEfficiencyReportData = useMemo(() => {
    const trips = dbService.getTrips().filter(t => t.status === 'Completed');
    const logs: Record<string, { vehicleName: string; reg: string; distance: number; liters: number }> = {};

    vehicles.forEach(v => {
      logs[v.id] = { vehicleName: v.name, reg: v.registrationNumber, distance: 0, liters: 0 };
    });

    trips.forEach(t => {
      if (logs[t.vehicleId]) {
        logs[t.vehicleId].distance += t.finalDistance || t.plannedDistance;
        logs[t.vehicleId].liters += t.fuelConsumed || t.estimatedFuel;
      }
    });

    return Object.entries(logs).map(([vehicleId, item]) => {
      const efficiency = item.liters > 0 ? (item.distance / item.liters).toFixed(2) : '0.00';
      return {
        vehicleId,
        ...item,
        efficiency: Number(efficiency)
      };
    }).filter(i => i.distance > 0);
  }, [vehicles]);

  const operationalCostReportData = useMemo(() => {
    const categories = ['Fuel', 'Toll', 'Repair', 'Insurance', 'Maintenance', 'Miscellaneous'];
    return categories.map(cat => {
      const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.cost, 0);
      const percentage = financialStats.operationalCost > 0 ? Math.round((total / financialStats.operationalCost) * 100) : 0;
      return {
        category: cat,
        total,
        percentage
      };
    });
  }, [expenses, financialStats]);

  // ================= EXPORT CONTROLLERS =================

  // 1. CSV EXPORT
  const handleCSVExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let title = selectedReportType;

    if (selectedReportType === 'fuel_efficiency') {
      headers = ['Vehicle Name', 'Registration', 'Total Distance (km)', 'Total Fuel Consumed (L)', 'Fuel Efficiency (km/L)'];
      rows = fuelEfficiencyReportData.map(r => [r.vehicleName, r.reg, r.distance, r.liters, r.efficiency]);
    } else if (selectedReportType === 'operational_cost') {
      headers = ['Cost Category', 'Accumulated Expense ($)', 'Percentage Allocation (%)'];
      rows = operationalCostReportData.map(r => [r.category, r.total, r.percentage]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TransitOps_${title}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Spreadsheet CSV download triggered.');
  };

  // 2. PDF EXPORT (Using jsPDF)
  const handlePDFExport = () => {
    const doc = new jsPDF();
    const nowStr = new Date().toLocaleString();

    // Aesthetic enterprise headers
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('TransitOps Logistics Enterprise', 14, 20);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Report Compiler: Financial Analyst`, 14, 26);
    doc.text(`Generated Date: ${nowStr}`, 14, 31);
    
    // Draw divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 36, 196, 36);

    let y = 46;

    if (selectedReportType === 'fuel_efficiency') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Fuel Efficiency & Performance Audit', 14, y);
      y += 10;

      // Table headers
      doc.setFontSize(10);
      doc.text('Vehicle', 14, y);
      doc.text('Reg Number', 60, y);
      doc.text('Distance', 100, y);
      doc.text('Fuel Consumed', 130, y);
      doc.text('Efficiency', 165, y);
      
      doc.line(14, y + 2, 196, y + 2);
      y += 8;

      doc.setFont('Helvetica', 'normal');
      fuelEfficiencyReportData.forEach(r => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(r.vehicleName, 14, y);
        doc.text(r.reg, 60, y);
        doc.text(`${r.distance.toLocaleString()} km`, 100, y);
        doc.text(`${r.liters.toLocaleString()} L`, 130, y);
        doc.text(`${r.efficiency} km/L`, 165, y);
        y += 7;
      });

    } else if (selectedReportType === 'operational_cost') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Operating Cost Allocations Breakdown', 14, y);
      y += 10;

      // Headers
      doc.setFontSize(10);
      doc.text('Expense Category', 14, y);
      doc.text('Aggregate Cost Amount ($)', 80, y);
      doc.text('Share Percentage (%)', 150, y);

      doc.line(14, y + 2, 196, y + 2);
      y += 8;

      doc.setFont('Helvetica', 'normal');
      operationalCostReportData.forEach(r => {
        doc.text(r.category, 14, y);
        doc.text(`$${r.total.toLocaleString()}`, 80, y);
        doc.text(`${r.percentage}%`, 150, y);
        y += 7;
      });
    }

    doc.save(`TransitOps_${selectedReportType}_Audit.pdf`);
    triggerToast('PDF document compiled and downloaded successfully.');
  };

  return (
    <div className="space-y-6" id="finance-container">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-pulse">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Financial Controller ledgers</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Track operating margins, fuel costs, toll bills, maintenance budgets, and ROI audits</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 cursor-pointer"
            id="btn-add-expense"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
          <button
            onClick={() => setShowFuelModal(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 cursor-pointer"
            id="btn-add-fuel"
          >
            <Droplet className="h-4 w-4 text-emerald-500" /> Log Refuel
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <DashboardStats metrics={kpis} />

      {/* Navigation SubTabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800" id="finance-subtabs">
        <button
          onClick={() => setSubTab('expenses')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            subTab === 'expenses'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          id="tab-finance-expenses"
        >
          Operating Expenses
        </button>
        <button
          onClick={() => setSubTab('fuel')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            subTab === 'fuel'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          id="tab-finance-fuel"
        >
          Refueling logs
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            subTab === 'reports'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          id="tab-finance-reports"
        >
          Reports & Export Center
        </button>
      </div>

      {/* TAB PANEL 1: EXPENSES */}
      {subTab === 'expenses' && (
        <div className="space-y-4" id="panel-expenses-content">
          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center justify-between">
            <span className="text-xs font-semibold text-gray-950 dark:text-white">Filtered Ledger Entries</span>

            <div className="flex flex-wrap gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-750 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="All">All Categories</option>
                <option value="Fuel">Fuel</option>
                <option value="Toll">Toll</option>
                <option value="Repair">Repair</option>
                <option value="Insurance">Insurance</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-755 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="All">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 uppercase">
                    <th className="px-6 py-3.5">Expense Details</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Associated Vehicle</th>
                    <th className="px-6 py-3.5">Logging Date</th>
                    <th className="px-6 py-3.5 text-right">Cost ($)</th>
                    <th className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No expense logs match current queries.</td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => {
                      const v = vehicles.find(veh => veh.id === e.vehicleId);
                      return (
                        <tr key={e.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/10">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white">{e.description}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-gray-900 dark:text-gray-300">
                              {e.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {v ? `${v.name} (${v.registrationNumber})` : 'General Fleet'}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500">{e.date}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                            ${e.cost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-900"
                              title="Delete Record"
                              id={`btn-delete-expense-${e.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
      )}

      {/* TAB PANEL 2: FUEL LOGS */}
      {subTab === 'fuel' && (
        <div className="space-y-4" id="panel-fuel-content">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 uppercase">
                    <th className="px-6 py-3.5">Vehicle Carrier</th>
                    <th className="px-6 py-3.5">Registration</th>
                    <th className="px-6 py-3.5">Refueled Volume (L)</th>
                    <th className="px-6 py-3.5 text-right">Cost ($)</th>
                    <th className="px-6 py-3.5">Date refueled</th>
                    <th className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                  {fuelLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No fuel refuels logged yet.</td>
                    </tr>
                  ) : (
                    fuelLogs.map((fl) => {
                      const v = vehicles.find(veh => veh.id === fl.vehicleId);
                      return (
                        <tr key={fl.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/10">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                            {v ? v.name : 'Unknown Asset'}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500">{v ? v.registrationNumber : ''}</td>
                          <td className="px-6 py-4 font-mono text-gray-800 dark:text-gray-200">{fl.liters} Liters</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                            ${fl.cost}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500">{fl.date}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteFuelLog(fl.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-900"
                              title="Delete Fuel Log"
                              id={`btn-delete-fuel-${fl.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
      )}

      {/* TAB PANEL 3: REPORTS CENTER */}
      {subTab === 'reports' && (
        <div className="space-y-4" id="panel-reports-content">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950 space-y-4">
            
            {/* Report Selector Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-900">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold text-gray-500">Select Audit Report Type:</span>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value as any)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 font-bold dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  id="report-type-selector"
                >
                  <option value="operational_cost">Operational Cost Allocation</option>
                  <option value="fuel_efficiency">Fuel Efficiency Audit (km/L)</option>
                </select>
              </div>

              {/* Exports */}
              <div className="flex gap-2">
                <button
                  onClick={handleCSVExport}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 px-3 py-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 cursor-pointer"
                  id="btn-export-csv"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export CSV
                </button>
                <button
                  onClick={handlePDFExport}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white px-3 py-2 shadow-sm cursor-pointer"
                  id="btn-export-pdf"
                >
                  <Download className="h-4 w-4" /> Export Audit PDF
                </button>
              </div>
            </div>

            {/* Generated Report Frame */}
            <div className="rounded-xl border border-gray-50 bg-gray-50/50 p-4 dark:border-gray-900 dark:bg-gray-900/40">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase font-mono tracking-wide">
                    {selectedReportType.replace('_', ' ')} Statement
                  </h4>
                  <p className="text-[10px] text-gray-500">Generated dynamically from logistics ledger records.</p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Date: {new Date().toLocaleDateString()}</span>
              </div>

              {/* Report Tables Depending on Selection */}

              {/* 1. FUEL EFFICIENCY REPORT */}
              {selectedReportType === 'fuel_efficiency' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-100/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 uppercase">
                        <th className="px-4 py-2">Vehicle</th>
                        <th className="px-4 py-2">Reg Number</th>
                        <th className="px-4 py-2 text-right">Distance (km)</th>
                        <th className="px-4 py-2 text-right">Fuel Consumed (L)</th>
                        <th className="px-4 py-2 text-right">Efficiency (km/L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fuelEfficiencyReportData.map((r, idx) => (
                        <tr key={idx} className="border-b border-gray-50 dark:border-gray-900">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.vehicleName}</td>
                          <td className="px-4 py-3 font-mono text-gray-500">{r.reg}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.distance.toLocaleString()} km</td>
                          <td className="px-4 py-3 text-right font-mono">{r.liters.toLocaleString()} L</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-green-600 dark:text-green-400">
                            {r.efficiency} km/L
                          </td>
                        </tr>
                      ))}
                      {fuelEfficiencyReportData.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-400">Complete active trips to compile efficiency records.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. OPERATIONAL COST */}
              {selectedReportType === 'operational_cost' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-100/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 uppercase">
                        <th className="px-4 py-2">Cost Category</th>
                        <th className="px-4 py-2 text-right">Total Disbursed ($)</th>
                        <th className="px-4 py-2 text-right">Percentage Allocation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationalCostReportData.map((r, idx) => (
                        <tr key={idx} className="border-b border-gray-50 dark:border-gray-900">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.category}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">${r.total.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400">{r.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Record Fleet Operating Expense</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Log toll, repair, insurance, or miscellaneous billing items.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Select Associated Vehicle</label>
                <select
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Cost Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Toll">Toll Fees</option>
                  <option value="Repair">Repair Expense</option>
                  <option value="Insurance">Insurance premium</option>
                  <option value="Maintenance">Scheduled Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Cost Amount (USD)</label>
                <input
                  type="number"
                  value={expCost}
                  onChange={(e) => setExpCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Transaction Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Expense Description</label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. Toll fees Dallas express gate"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG REFUEL */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowFuelModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Record Fuel Refueling</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Registers refueling liters. Automatically creates a corresponding fuel expense entry.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleFuelSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Select Refueled Vehicle</label>
                <select
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Refueled Liters (L)</label>
                <input
                  type="number"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Refueling Price Cost (USD)</label>
                <input
                  type="number"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Transaction Date</label>
                <input
                  type="date"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                >
                  Record Refuel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
