import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Wrench, 
  Trash2, 
  Edit2, 
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileText,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Calendar,
  X,
  PlusCircle,
  TrendingUp,
  SlidersHorizontal,
  FileCheck,
  Truck
} from 'lucide-react';
import { dbService } from '../lib/storage';
import { Vehicle, VehicleType, VehicleStatus, MaintenanceLog, MaintenanceType, VehicleDocument, DocumentType } from '../types';
import DashboardStats from './DashboardStats';
import { useConfirm } from './ConfirmProvider';

interface FleetManagerViewProps {
  initialSubTab?: 'registry' | 'maintenance' | 'documents';
}

export default function FleetManagerView({ initialSubTab }: FleetManagerViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'registry' | 'maintenance' | 'documents'>('registry');
  const { confirm } = useConfirm();

  // Sync internal subtab when initialSubTab changes from parent
  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => dbService.getVehicles());
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>(() => dbService.getMaintenanceLogs());
  const [documents, setDocuments] = useState<VehicleDocument[]>(() => dbService.getDocuments());

  // Search/Filters/Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'odometer' | 'capacity' | 'registrationNumber'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedVehicleForMaint, setSelectedVehicleForMaint] = useState<string>('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedVehicleForDoc, setSelectedVehicleForDoc] = useState<string>('');

  // Form Fields - Vehicle
  const [vehReg, setVehReg] = useState('');
  const [vehName, setVehName] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehType, setVehType] = useState<VehicleType>('Semi-Truck');
  const [vehCapacity, setVehCapacity] = useState<number>(10000);
  const [vehOdometer, setVehOdometer] = useState<number>(50000);
  const [vehCost, setVehCost] = useState<number>(60000);
  const [vehDate, setVehDate] = useState('2024-01-01');
  const [vehStatus, setVehStatus] = useState<VehicleStatus>('Available');

  // Form Fields - Maintenance
  const [maintType, setMaintType] = useState<MaintenanceType>('Routine');
  const [maintCost, setMaintCost] = useState<number>(350);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Fields - Document Upload
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<DocumentType>('Registration');
  const [docExpiry, setDocExpiry] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Validation/Error feedback
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Sync state functions
  const syncDB = () => {
    setVehicles(dbService.getVehicles());
    setMaintenance(dbService.getMaintenanceLogs());
    setDocuments(dbService.getDocuments());
  };

  // KPI calculations
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === 'Available').length;
    const inShop = vehicles.filter(v => v.status === 'In Shop').length;
    const active = vehicles.filter(v => v.status === 'On Trip').length;
    const retired = vehicles.filter(v => v.status === 'Retired').length;
    const activeCapacity = vehicles.filter(v => v.status !== 'Retired').length;
    const utilization = activeCapacity > 0 ? Math.round((active / activeCapacity) * 100) : 0;

    return { total, available, inShop, active, retired, utilization };
  }, [vehicles]);

  const kpis = [
    {
      title: 'Active Fleet',
      value: `${stats.active} Routes`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-blue-100 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
      description: 'Vehicles currently on route',
      badge: { text: `${stats.utilization}% Utilization`, type: 'info' as const }
    },
    {
      title: 'Available Standby',
      value: `${stats.available} Assets`,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'bg-green-100 dark:bg-green-950/40',
      textColor: 'text-green-600 dark:text-green-400',
      description: 'Ready to be dispatched',
      badge: { text: 'Normal capacity', type: 'success' as const }
    },
    {
      title: 'Under Repair',
      value: `${stats.inShop} in shop`,
      icon: <Wrench className="h-5 w-5" />,
      color: 'bg-amber-100 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      description: 'Active maintenance tickets',
      badge: { 
        text: stats.inShop > 2 ? 'High queue' : 'Healthy', 
        type: (stats.inShop > 2 ? 'warning' : 'success') as 'warning' | 'success'
      }
    },
    {
      title: 'Total Registry',
      value: `${stats.total} Vehicles`,
      icon: <Truck className="h-5 w-5" />,
      color: 'bg-indigo-100 dark:bg-indigo-950/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      description: `Retired: ${stats.retired}`,
      badge: { text: 'Registry Count', type: 'info' as const }
    }
  ];

  // Search/Filter/Sort computation
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        v => 
          v.name.toLowerCase().includes(term) || 
          v.registrationNumber.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== 'All') {
      result = result.filter(v => v.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(v => v.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [vehicles, searchTerm, typeFilter, statusFilter, sortBy, sortOrder]);

  // Pagination slice
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVehicles, currentPage]);

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage) || 1;

  // Handle open modal for vehicle
  const openVehicleModal = (veh: Vehicle | null = null) => {
    setFormError('');
    if (veh) {
      setEditingVehicle(veh);
      setVehReg(veh.registrationNumber);
      setVehName(veh.name);
      setVehModel(veh.model);
      setVehType(veh.type);
      setVehCapacity(veh.maxCapacity);
      setVehOdometer(veh.odometer);
      setVehCost(veh.acquisitionCost);
      setVehDate(veh.purchaseDate);
      setVehStatus(veh.status);
    } else {
      setEditingVehicle(null);
      setVehReg('');
      setVehName('');
      setVehModel('');
      setVehType('Semi-Truck');
      setVehCapacity(10000);
      setVehOdometer(20000);
      setVehCost(45000);
      setVehDate(new Date().toISOString().split('T')[0]);
      setVehStatus('Available');
    }
    setShowVehicleModal(true);
  };

  // Submit vehicle
  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!vehReg.trim() || !vehName.trim() || !vehModel.trim()) {
      setFormError('Please fill out registration, name, and model.');
      return;
    }

    try {
      if (editingVehicle) {
        dbService.editVehicle(editingVehicle.id, {
          registrationNumber: vehReg,
          name: vehName,
          model: vehModel,
          type: vehType,
          maxCapacity: Number(vehCapacity),
          odometer: Number(vehOdometer),
          acquisitionCost: Number(vehCost),
          purchaseDate: vehDate,
          status: vehStatus
        });
        triggerToast(`Vehicle '${vehName}' edited successfully.`);
      } else {
        dbService.addVehicle({
          registrationNumber: vehReg,
          name: vehName,
          model: vehModel,
          type: vehType,
          maxCapacity: Number(vehCapacity),
          odometer: Number(vehOdometer),
          acquisitionCost: Number(vehCost),
          purchaseDate: vehDate,
          status: vehStatus
        });
        triggerToast(`Vehicle '${vehName}' added successfully.`);
      }
      syncDB();
      setShowVehicleModal(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Vehicle',
      message: `Are you sure you want to delete vehicle ${name}? This action is irreversible.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (ok) {
      try {
        dbService.deleteVehicle(id);
        triggerToast(`Removed vehicle ${name} from registry.`);
        syncDB();
      } catch (err: any) {
        triggerToast(err.message || 'Could not delete vehicle.');
      }
    }
  };

  // Retire vehicle
  const handleRetireVehicle = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Retire Vehicle',
      message: `Are you sure you want to Retire vehicle ${name}? Retired vehicles cannot be assigned to any future trip routes.`,
      confirmText: 'Retire',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (ok) {
      try {
        dbService.retireVehicle(id);
        triggerToast(`Retired vehicle ${name}.`);
        syncDB();
      } catch (err: any) {
        triggerToast(err.message || 'Could not retire vehicle.');
      }
    }
  };

  // Submit Maintenance
  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedVehicleForMaint) {
      setFormError('Please select a vehicle.');
      return;
    }
    if (!maintDesc.trim()) {
      setFormError('Please describe the repair or routine work.');
      return;
    }

    try {
      const v = vehicles.find(veh => veh.id === selectedVehicleForMaint);
      dbService.addMaintenanceLog({
        vehicleId: selectedVehicleForMaint,
        date: maintDate,
        type: maintType,
        cost: Number(maintCost),
        description: maintDesc
      });
      triggerToast(`Vehicle '${v?.name}' is now locked in maintenance shop.`);
      syncDB();
      setShowMaintenanceModal(false);
      // reset
      setMaintDesc('');
      setSelectedVehicleForMaint('');
    } catch (err: any) {
      setFormError(err.message || 'Error occurred.');
    }
  };

  // Close Maintenance Log
  const handleCloseMaint = async (id: string) => {
    const ok = await confirm({
      title: 'Resolve Maintenance',
      message: 'Mark this maintenance session as resolved? Vehicle status will be returned to Available.',
      confirmText: 'Resolve',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (ok) {
      try {
        dbService.closeMaintenance(id);
        triggerToast('Maintenance resolved successfully.');
        syncDB();
      } catch (err: any) {
        triggerToast(err.message || 'Error occurred.');
      }
    }
  };

  // Simulated Drag-and-Drop file uploads
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFileName(e.dataTransfer.files[0].name);
      setDocName(e.dataTransfer.files[0].name.split('.')[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      setDocName(e.target.files[0].name.split('.')[0]);
    }
  };

  // Submit Document
  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedVehicleForDoc) {
      setFormError('Please select associated vehicle.');
      return;
    }
    if (!docName.trim() || !docExpiry) {
      setFormError('Please enter document name and expiration date.');
      return;
    }

    try {
      dbService.addDocument({
        vehicleId: selectedVehicleForDoc,
        name: docName,
        type: docType,
        expiryDate: docExpiry,
        status: new Date(docExpiry) < new Date() ? 'Expired' : 'Active'
      });
      triggerToast('Document added to vehicle records.');
      syncDB();
      setShowDocModal(false);
      // Reset
      setDocName('');
      setSelectedVehicleForDoc('');
      setUploadedFileName('');
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6" id="fleet-manager-container">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-bounce">
          {successToast}
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Fleet Asset Manager</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add, track, maintain, and verify logistics vehicle assets</p>
        </div>
        
        {/* Actions Bar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openVehicleModal(null)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 transition-all cursor-pointer"
            id="btn-add-vehicle"
          >
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
          <button
            onClick={() => {
              setSelectedVehicleForMaint('');
              setShowMaintenanceModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 cursor-pointer"
            id="btn-open-maint"
          >
            <Wrench className="h-4 w-4 text-amber-500" /> Book Maintenance
          </button>
          <button
            onClick={() => {
              setSelectedVehicleForDoc('');
              setShowDocModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 cursor-pointer"
            id="btn-upload-document"
          >
            <PlusCircle className="h-4 w-4 text-purple-500" /> Upload Document
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <DashboardStats metrics={kpis} />

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800" id="fleet-subtabs">
        <button
          onClick={() => setActiveSubTab('registry')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeSubTab === 'registry'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          id="tab-fleet-registry"
        >
          Vehicle Registry
        </button>
        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeSubTab === 'maintenance'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          id="tab-fleet-maintenance"
        >
          Maintenance History
        </button>
        <button
          onClick={() => setActiveSubTab('documents')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeSubTab === 'documents'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
          id="tab-fleet-documents"
        >
          Documents ({documents.length})
        </button>
      </div>

      {/* Registry Panel */}
      {activeSubTab === 'registry' && (
        <div className="space-y-4" id="subtab-registry-content">
          
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search by registration, carrier name, or model..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-950 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
              />
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filter Type:
              </div>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="All">All Types</option>
                <option value="Semi-Truck">Semi-Truck</option>
                <option value="Box Truck">Box Truck</option>
                <option value="Flatbed">Flatbed</option>
                <option value="Delivery Van">Delivery Van</option>
                <option value="Refrigerated Truck">Refrigerated Truck</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="In Shop">In Shop</option>
                <option value="Retired">Retired</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="name">Sort by Name</option>
                <option value="odometer">Sort by Mileage</option>
                <option value="capacity">Sort by capacity</option>
                <option value="registrationNumber">Sort by Reg. Number</option>
              </select>

              {/* Asc/Desc */}
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-850"
              >
                {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
              </button>
            </div>
          </div>

          {/* Vehicle List Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 uppercase">
                    <th className="px-6 py-4">Reg No.</th>
                    <th className="px-6 py-4">Vehicle Details</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Odometer</th>
                    <th className="px-6 py-4 text-right">Max Load Limit</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900 text-xs">
                  {paginatedVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No logistical vehicles found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((v) => {
                      // Status colors
                      const statStyles = {
                        Available: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
                        'On Trip': 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
                        'In Shop': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                        Retired: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      };

                      return (
                        <tr key={v.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/10">
                          <td className="px-6 py-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {v.registrationNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white">{v.name}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{v.model}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{v.type}</td>
                          <td className="px-6 py-4 text-right font-mono text-gray-800 dark:text-gray-200">
                            {v.odometer.toLocaleString()} km
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-gray-800 dark:text-gray-200">
                            {v.maxCapacity.toLocaleString()} kg
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statStyles[v.status]}`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openVehicleModal(v)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-blue-400"
                                title="Edit Vehicle"
                                id={`btn-edit-vehicle-${v.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRetireVehicle(v.id, v.name)}
                                className={`rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 ${
                                  v.status === 'Retired' ? 'opacity-30 cursor-not-allowed' : 'hover:text-amber-500'
                                }`}
                                disabled={v.status === 'Retired'}
                                title="Retire Asset"
                                id={`btn-retire-vehicle-${v.id}`}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteVehicle(v.id, v.name)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-red-400"
                                title="Delete Asset"
                                id={`btn-delete-vehicle-${v.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Showing Page {currentPage} of {totalPages} ({filteredVehicles.length} vehicles total)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
                  id="btn-pagination-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
                  id="btn-pagination-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Maintenance Subtab */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-4" id="subtab-maintenance-content">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white mb-4">Undergoing Repairs / Routine Maintenance</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 uppercase">
                    <th className="px-6 py-3">Vehicle</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Maintenance Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Cost ($)</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Operation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                  {maintenance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">No maintenance records logged in the fleet.</td>
                    </tr>
                  ) : (
                    maintenance.map((m) => {
                      const v = vehicles.find(veh => veh.id === m.vehicleId);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/10">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white">{v ? v.name : 'Unknown Vehicle'}</div>
                            <div className="text-[10px] font-mono text-gray-500">{v ? v.registrationNumber : ''}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{m.date}</td>
                          <td className="px-6 py-4">
                            <span className="rounded-md bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-semibold dark:bg-amber-950/20 dark:text-amber-400">
                              {m.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{m.description}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                            ${m.cost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              m.status === 'Active' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' 
                                : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                            }`}>
                              {m.status === 'Active' ? 'In Shop' : 'Completed'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {m.status === 'Active' ? (
                              <button
                                onClick={() => handleCloseMaint(m.id)}
                                className="rounded-lg bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1 text-[10px] font-bold border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900 cursor-pointer"
                                id={`btn-resolve-maint-${m.id}`}
                              >
                                Mark Ready
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px] flex items-center justify-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" /> Resolved
                              </span>
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
        </div>
      )}

      {/* Documents Subtab */}
      {activeSubTab === 'documents' && (
        <div className="space-y-4" id="subtab-documents-content">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white mb-4">Fleet Documents Ledger</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const v = vehicles.find(veh => veh.id === doc.vehicleId);
                const isExpired = doc.status === 'Expired';
                const isExpiring = doc.status === 'Expiring';

                return (
                  <div key={doc.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900 flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{doc.name}</span>
                      </div>
                      <p className="text-[10px] font-mono text-gray-500">{doc.type} • {v ? v.name : 'Unassigned'}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Calendar className="h-3 w-3" /> Expires: {doc.expiryDate}
                      </div>
                    </div>

                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      isExpired 
                        ? 'bg-red-50 text-red-600 border border-red-200' 
                        : isExpiring 
                          ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                          : 'bg-green-50 text-green-600 border border-green-200'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                );
              })}
              {documents.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center col-span-full">No fleet documents registered yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT VEHICLE */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowVehicleModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              {editingVehicle ? `Edit Asset: ${editingVehicle.name}` : 'Register New Fleet Asset'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complete logistics specifications and odometer indices.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleVehicleSubmit} className="mt-5 space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Reg */}
                <div>
                  <label className="block text-gray-500 mb-1">Registration Number (Unique)</label>
                  <input
                    type="text"
                    value={vehReg}
                    onChange={(e) => setVehReg(e.target.value.toUpperCase())}
                    placeholder="e.g. TX-442-BA"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-gray-500 mb-1">Vehicle Carrier Name</label>
                  <input
                    type="text"
                    value={vehName}
                    onChange={(e) => setVehName(e.target.value)}
                    placeholder="e.g. Volvo Heavy FH16"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-gray-500 mb-1">Model Year / Chassis</label>
                  <input
                    type="text"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    placeholder="e.g. 2024 Transcontinental"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-gray-500 mb-1">Classification Type</label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value as VehicleType)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="Semi-Truck">Semi-Truck</option>
                    <option value="Box Truck">Box Truck</option>
                    <option value="Flatbed">Flatbed</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Refrigerated Truck">Refrigerated Truck</option>
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-gray-500 mb-1">Maximum Load Capacity (kg)</label>
                  <input
                    type="number"
                    value={vehCapacity}
                    onChange={(e) => setVehCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Odometer */}
                <div>
                  <label className="block text-gray-500 mb-1">Initial Odometer Reading (km)</label>
                  <input
                    type="number"
                    value={vehOdometer}
                    onChange={(e) => setVehOdometer(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-gray-500 mb-1">Acquisition Cost (USD)</label>
                  <input
                    type="number"
                    value={vehCost}
                    onChange={(e) => setVehCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-gray-500 mb-1">Acquisition Date</label>
                  <input
                    type="date"
                    value={vehDate}
                    onChange={(e) => setVehDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-gray-500 mb-1">Initial Fleet Status</label>
                  <select
                    value={vehStatus}
                    onChange={(e) => setVehStatus(e.target.value as VehicleStatus)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-500 shadow-md"
                >
                  {editingVehicle ? 'Save Modifications' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOOK MAINTENANCE */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowMaintenanceModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Book Vehicle Maintenance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lock vehicle to 'In Shop' state and records cost logistics.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleMaintenanceSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Select Fleet Vehicle</label>
                <select
                  value={selectedVehicleForMaint}
                  onChange={(e) => setSelectedVehicleForMaint(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired' && v.status !== 'In Shop').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Service category</label>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value as MaintenanceType)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Routine">Routine Inspection</option>
                  <option value="Repair">Chassis / Engine Repair</option>
                  <option value="Inspection">Emissions / Safety Inspection</option>
                  <option value="Emergency">Roadside Assistance / Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Estimated / Actual Cost ($)</label>
                <input
                  type="number"
                  value={maintCost}
                  onChange={(e) => setMaintCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Work Description Notes</label>
                <textarea
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Describe details of tire replacement, engine issues, oil type..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                >
                  Confirm Shop Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDocModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Upload Fleet Document</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Add commercial registrations, insurance papers, or certifications.</p>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleDocSubmit} className="mt-4 space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-500 mb-1">Associated Vehicle</label>
                <select
                  value={selectedVehicleForDoc}
                  onChange={(e) => setSelectedVehicleForDoc(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Registration">Commercial Vehicle Registration</option>
                  <option value="Insurance">Asset Insurance Policy</option>
                  <option value="Permit">Interstate Carrier Permit</option>
                  <option value="Inspection Certificate">State Safety / Emissions Certificate</option>
                </select>
              </div>

              {/* Drag and Drop File Upload Area */}
              <div>
                <label className="block text-gray-500 mb-1">Simulated Upload File</label>
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50/20' 
                      : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <UploadCloud className="h-8 w-8 text-gray-400 mb-1.5" />
                  <p className="text-center text-[11px] text-gray-600 dark:text-gray-400">
                    Drag & Drop document PDF/JPG here, or{' '}
                    <label className="text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">
                      browse files
                      <input 
                        type="file" 
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.png"
                        className="hidden" 
                      />
                    </label>
                  </p>
                  <span className="text-[9px] text-gray-400 mt-1">Supports PDF, PNG up to 10MB</span>

                  {uploadedFileName && (
                    <div className="mt-3 flex items-center gap-1.5 rounded bg-blue-100/60 dark:bg-blue-900/40 px-2 py-1 text-[10px] text-blue-700 dark:text-blue-300">
                      <FileCheck className="h-3.5 w-3.5" />
                      <span className="font-mono max-w-[180px] truncate">{uploadedFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Document Title / File Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Liability Insurance Q4 2026"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
                >
                  Register Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
