export type UserRole = 'fleet_manager' | 'driver_dispatcher' | 'safety_officer' | 'financial_analyst';

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: 'Active' | 'Suspended' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';
export type VehicleType = 'Semi-Truck' | 'Box Truck' | 'Flatbed' | 'Delivery Van' | 'Refrigerated Truck';

export interface Vehicle {
  id: string;
  registrationNumber: string; // Unique
  name: string;
  model: string;
  type: VehicleType;
  maxCapacity: number; // in kg
  odometer: number; // in km
  acquisitionCost: number; // in USD
  purchaseDate: string; // YYYY-MM-DD
  status: VehicleStatus;
}

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
export type LicenseCategory = 'Class A CDL' | 'Class B CDL' | 'Class C CDL';

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: LicenseCategory;
  expiryDate: string; // YYYY-MM-DD
  contact: string;
  safetyScore: number; // 0 to 100
  status: DriverStatus;
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number; // kg
  plannedDistance: number; // km
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  estimatedFuel: number; // Liters
  revenue?: number; // USD
  status: TripStatus;
  
  // Capture on complete
  finalOdometer?: number;
  fuelConsumed?: number; // Liters
  finalDistance?: number; // km
}

export type MaintenanceType = 'Routine' | 'Repair' | 'Inspection' | 'Emergency';
export type MaintenanceStatus = 'Active' | 'Completed';

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  type: MaintenanceType;
  cost: number; // USD
  description: string;
  status: MaintenanceStatus;
  invoiceUrl?: string; // Mock or visual url
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number; // USD
  date: string; // YYYY-MM-DD
}

export type ExpenseCategory = 'Fuel' | 'Toll' | 'Repair' | 'Insurance' | 'Maintenance' | 'Miscellaneous';

export interface Expense {
  id: string;
  vehicleId: string; // Associated vehicle
  category: ExpenseCategory;
  cost: number; // USD
  date: string; // YYYY-MM-DD
  description: string;
}

export type DocumentType = 'Registration' | 'Insurance' | 'Permit' | 'Inspection Certificate';

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  name: string;
  type: DocumentType;
  expiryDate: string; // YYYY-MM-DD
  status: 'Active' | 'Expiring' | 'Expired';
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  date: string;
  read: boolean;
}

export interface Report {
  id: string;
  title: string;
  type: 'Fuel' | 'Operational' | 'Maintenance';
  date: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}
