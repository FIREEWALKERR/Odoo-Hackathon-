import { 
  User, 
  UserRole, 
  Vehicle, 
  Driver, 
  Trip, 
  MaintenanceLog, 
  FuelLog, 
  Expense, 
  VehicleDocument, 
  SystemNotification, 
  Report, 
  AuditLog 
} from '../types';
import { isRealFirebase, firestoreDb } from './firebase';

// Storage Keys
const KEYS = {
  USERS: 'transitops_users',
  CURRENT_USER: 'transitops_current_user',
  VEHICLES: 'transitops_vehicles',
  DRIVERS: 'transitops_drivers',
  TRIPS: 'transitops_trips',
  MAINTENANCE: 'transitops_maintenance',
  FUEL: 'transitops_fuel',
  EXPENSES: 'transitops_expenses',
  DOCUMENTS: 'transitops_documents',
  NOTIFICATIONS: 'transitops_notifications',
  REPORTS: 'transitops_reports',
  AUDIT_LOGS: 'transitops_audit_logs',
  THEME: 'transitops_theme'
};

// Seed Data
const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'James Carter', email: 'manager@transitops.com', role: 'fleet_manager' },
  { id: 'u2', name: 'Alexander Mercer', email: 'dispatcher@transitops.com', role: 'driver_dispatcher' },
  { id: 'u3', name: 'Lois Lane', email: 'safety@transitops.com', role: 'safety_officer' },
  { id: 'u4', name: 'Bruce Wayne', email: 'finance@transitops.com', role: 'financial_analyst' }
];

const DEFAULT_VEHICLES: Vehicle[] = [];
const DEFAULT_DRIVERS: Driver[] = [];
const DEFAULT_TRIPS: Trip[] = [];
const DEFAULT_MAINTENANCE: MaintenanceLog[] = [];
const DEFAULT_FUEL: FuelLog[] = [];
const DEFAULT_EXPENSES: Expense[] = [];
const DEFAULT_DOCUMENTS: VehicleDocument[] = [];
const DEFAULT_NOTIFICATIONS: SystemNotification[] = [];
const DEFAULT_REPORTS: Report[] = [];
const DEFAULT_AUDIT_LOGS: AuditLog[] = [];

// Demo Seed Data (for optional reloading)
const SEED_VEHICLES: Vehicle[] = [
  { id: 'v1', registrationNumber: 'TX-882-AB', name: 'Volvo FH16', model: '2023 Heavy Carrier', type: 'Semi-Truck', maxCapacity: 25000, odometer: 145000, acquisitionCost: 125000, purchaseDate: '2023-04-12', status: 'Available' },
  { id: 'v2', registrationNumber: 'CA-945-XY', name: 'Freightliner Cascadia', model: '2022 Interstate', type: 'Semi-Truck', maxCapacity: 22000, odometer: 182300, acquisitionCost: 110000, purchaseDate: '2022-08-19', status: 'On Trip' },
  { id: 'v3', registrationNumber: 'NY-102-DF', name: 'Isuzu NPR-HD', model: '2021 Box Pro', type: 'Box Truck', maxCapacity: 8000, odometer: 95400, acquisitionCost: 55000, purchaseDate: '2021-11-05', status: 'In Shop' },
  { id: 'v4', registrationNumber: 'FL-445-ZZ', name: 'Ford F-550', model: '2020 Flatbed Utility', type: 'Flatbed', maxCapacity: 12000, odometer: 210000, acquisitionCost: 65000, purchaseDate: '2020-02-14', status: 'Retired' },
  { id: 'v5', registrationNumber: 'IL-339-GG', name: 'Mercedes-Benz Sprinter', model: '2024 Cargo Jet', type: 'Delivery Van', maxCapacity: 3500, odometer: 12000, acquisitionCost: 48000, purchaseDate: '2024-01-10', status: 'Available' },
  { id: 'v6', registrationNumber: 'TX-711-RE', name: 'Peterbilt 579', model: '2023 Reefer King', type: 'Refrigerated Truck', maxCapacity: 20000, odometer: 87000, acquisitionCost: 145000, purchaseDate: '2023-07-22', status: 'Available' }
];

const SEED_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Alexander Mercer', licenseNumber: 'DL-TX98234', licenseCategory: 'Class A CDL', expiryDate: '2027-11-15', contact: '+1 (555) 019-2834', safetyScore: 94, status: 'Available' },
  { id: 'd2', name: 'Sarah Jenkins', licenseNumber: 'DL-CA54321', licenseCategory: 'Class A CDL', expiryDate: '2026-12-10', contact: '+1 (555) 014-9922', safetyScore: 98, status: 'On Trip' },
  { id: 'd3', name: 'Marcus Brody', licenseNumber: 'DL-NY77112', licenseCategory: 'Class B CDL', expiryDate: '2026-07-25', contact: '+1 (555) 017-1188', safetyScore: 82, status: 'Available' },
  { id: 'd4', name: 'Frank Castle', licenseNumber: 'DL-IL00088', licenseCategory: 'Class A CDL', expiryDate: '2026-05-14', contact: '+1 (555) 011-0077', safetyScore: 71, status: 'Off Duty' },
  { id: 'd5', name: 'Jimmy McGill', licenseNumber: 'DL-NM44552', licenseCategory: 'Class C CDL', expiryDate: '2028-03-30', contact: '+1 (555) 018-4422', safetyScore: 45, status: 'Suspended' }
];

const SEED_TRIPS: Trip[] = [
  { id: 't1', source: 'Houston, TX', destination: 'Dallas, TX', vehicleId: 'v2', driverId: 'd2', cargoWeight: 18000, plannedDistance: 390, startDate: '2026-07-10', endDate: '2026-07-12', estimatedFuel: 120, revenue: 3200, status: 'Dispatched' },
  { id: 't2', source: 'Los Angeles, CA', destination: 'Phoenix, AZ', vehicleId: 'v1', driverId: 'd1', cargoWeight: 22000, plannedDistance: 590, startDate: '2026-07-14', endDate: '2026-07-16', estimatedFuel: 190, revenue: 4800, status: 'Draft' },
  { id: 't3', source: 'Chicago, IL', destination: 'Detroit, MI', vehicleId: 'v6', driverId: 'd3', cargoWeight: 12000, plannedDistance: 450, startDate: '2026-07-05', endDate: '2026-07-06', estimatedFuel: 140, revenue: 3800, status: 'Completed', finalOdometer: 87450, fuelConsumed: 135, finalDistance: 450 },
  { id: 't4', source: 'Miami, FL', destination: 'Orlando, FL', vehicleId: 'v5', driverId: 'd1', cargoWeight: 2800, plannedDistance: 380, startDate: '2026-07-01', endDate: '2026-07-02', estimatedFuel: 45, revenue: 1500, status: 'Completed', finalOdometer: 12380, fuelConsumed: 42, finalDistance: 380 }
];

const SEED_MAINTENANCE: MaintenanceLog[] = [
  { id: 'm1', vehicleId: 'v3', date: '2026-07-08', type: 'Repair', cost: 1850, description: 'Transmission overhaul and fluid flush', status: 'Active' },
  { id: 'm2', vehicleId: 'v1', date: '2026-06-15', type: 'Routine', cost: 450, description: 'Regular oil change and multipoint safety check', status: 'Completed' },
  { id: 'm3', vehicleId: 'v2', date: '2026-05-20', type: 'Inspection', cost: 250, description: 'Annual state safety certification', status: 'Completed' }
];

const SEED_FUEL: FuelLog[] = [
  { id: 'f1', vehicleId: 'v1', liters: 135, cost: 245, date: '2026-07-06' },
  { id: 'f2', vehicleId: 'v2', liters: 120, cost: 218, date: '2026-07-09' },
  { id: 'f3', vehicleId: 'v5', liters: 42, cost: 76, date: '2026-07-02' }
];

const SEED_EXPENSES: Expense[] = [
  { id: 'e1', vehicleId: 'v1', category: 'Fuel', cost: 245, date: '2026-07-06', description: 'Diesel refueling TX station' },
  { id: 'e2', vehicleId: 'v2', category: 'Fuel', cost: 218, date: '2026-07-09', description: 'Diesel refueling CA interstate' },
  { id: 'e3', vehicleId: 'v5', category: 'Fuel', cost: 76, date: '2026-07-02', description: 'Gasoline refueling FL hub' },
  { id: 'e4', vehicleId: 'v1', category: 'Maintenance', cost: 450, date: '2026-06-15', description: 'Routine 150k km tune up' },
  { id: 'e5', vehicleId: 'v2', category: 'Toll', cost: 85, date: '2026-07-10', description: 'Highway toll fees Houston-Dallas corridor' },
  { id: 'e6', vehicleId: 'v3', category: 'Repair', cost: 1850, date: '2026-07-08', description: 'Transmission system breakdown fix' },
  { id: 'e7', vehicleId: 'v6', category: 'Insurance', cost: 1200, date: '2026-07-01', description: 'Monthly fleet insurance premium' }
];

const SEED_DOCUMENTS: VehicleDocument[] = [
  { id: 'doc1', vehicleId: 'v1', name: 'Commercial Registration 2026', type: 'Registration', expiryDate: '2027-04-30', status: 'Active' },
  { id: 'doc2', vehicleId: 'v2', name: 'Fleet Insurance Policy', type: 'Insurance', expiryDate: '2026-12-31', status: 'Active' },
  { id: 'doc3', vehicleId: 'v3', name: 'State Emissions Pass Certificate', type: 'Inspection Certificate', expiryDate: '2026-07-15', status: 'Expiring' },
  { id: 'doc4', vehicleId: 'v4', name: 'Highway Permit Active', type: 'Permit', expiryDate: '2026-02-10', status: 'Expired' }
];

const SEED_NOTIFICATIONS: SystemNotification[] = [
  { id: 'n1', title: 'License Expiring Soon', message: 'Driver Marcus Brody CDL expires within 14 days (2026-07-25).', type: 'warning', date: '2026-07-11', read: false },
  { id: 'n2', title: 'License Expired Alert', message: 'Driver Frank Castle license expired on 2026-05-14. Suspended from ops.', type: 'danger', date: '2026-07-11', read: false },
  { id: 'n3', title: 'Vehicle Document Expiring', message: 'Volvo emission certificate for NY-102-DF expires in 4 days.', type: 'warning', date: '2026-07-11', read: false },
  { id: 'n4', title: 'Trip Completed', message: 'Trip Chicago -> Detroit successfully completed by Marcus Brody.', type: 'success', date: '2026-07-06', read: true }
];

const SEED_REPORTS: Report[] = [
  { id: 'r1', title: 'Q2 Operational Cost Report', type: 'Operational', date: '2026-06-30', createdBy: 'Bruce Wayne' },
  { id: 'r2', title: 'June Fuel Efficiency Trends', type: 'Fuel', date: '2026-07-01', createdBy: 'Bruce Wayne' }
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', userId: 'u1', userName: 'James Carter', userRole: 'fleet_manager', action: 'Create Vehicle', details: 'Added new Volvo FH16 (TX-882-AB) to registry', timestamp: '2026-07-10T14:32:00-07:00' },
  { id: 'al2', userId: 'u3', userName: 'Lois Lane', userRole: 'safety_officer', action: 'Dispatch Trip', details: 'Dispatched trip Houston -> Dallas to Driver Sarah Jenkins with Volvo FH16', timestamp: '2026-07-10T16:11:00-07:00' }
];

// Helper to safely fetch/store JSON
const getLocal = <T>(key: string, defaultValue: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
};

const getSeedDefaultData = (key: string): any[] => {
  switch(key) {
    case KEYS.VEHICLES: return SEED_VEHICLES;
    case KEYS.DRIVERS: return SEED_DRIVERS;
    case KEYS.TRIPS: return SEED_TRIPS;
    case KEYS.MAINTENANCE: return SEED_MAINTENANCE;
    case KEYS.FUEL: return SEED_FUEL;
    case KEYS.EXPENSES: return SEED_EXPENSES;
    case KEYS.DOCUMENTS: return SEED_DOCUMENTS;
    case KEYS.NOTIFICATIONS: return SEED_NOTIFICATIONS;
    case KEYS.REPORTS: return SEED_REPORTS;
    case KEYS.AUDIT_LOGS: return SEED_AUDIT_LOGS;
    default: return [];
  }
};

const setLocal = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
  
  // Synchronize with Firestore in the background asynchronously if connected to real Firebase
  if (isRealFirebase) {
    try {
      const keysToSync = [
        KEYS.VEHICLES,
        KEYS.DRIVERS,
        KEYS.TRIPS,
        KEYS.MAINTENANCE,
        KEYS.FUEL,
        KEYS.EXPENSES,
        KEYS.DOCUMENTS,
        KEYS.NOTIFICATIONS,
        KEYS.REPORTS,
        KEYS.AUDIT_LOGS
      ];
      if (keysToSync.includes(key)) {
        const docRef = firestoreDb.doc('fleet_data', key);
        firestoreDb.setDoc(docRef, { list: data }).catch((err: any) => {
          console.error(`Error saving ${key} to Firestore background task:`, err);
        });
      }
    } catch (e) {
      console.error(`Error initiating background Firestore save for ${key}:`, e);
    }
  }
};

// Initialize localStorage with seeds if empty
export const initializeDB = () => {
  getLocal(KEYS.USERS, DEFAULT_USERS);
  getLocal(KEYS.VEHICLES, DEFAULT_VEHICLES);
  getLocal(KEYS.DRIVERS, DEFAULT_DRIVERS);
  getLocal(KEYS.TRIPS, DEFAULT_TRIPS);
  getLocal(KEYS.MAINTENANCE, DEFAULT_MAINTENANCE);
  getLocal(KEYS.FUEL, DEFAULT_FUEL);
  getLocal(KEYS.EXPENSES, DEFAULT_EXPENSES);
  getLocal(KEYS.DOCUMENTS, DEFAULT_DOCUMENTS);
  getLocal(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  getLocal(KEYS.REPORTS, DEFAULT_REPORTS);
  getLocal(KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
};

// Immediately invoke to ensure state on load
initializeDB();

// ---------------- AUTHENTICATION SERVICE ----------------
export const authService = {
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(KEYS.CURRENT_USER);
    if (!user) {
      // By default, let's login James Carter (Fleet Manager) so the app has a initial session
      const defaultUser = DEFAULT_USERS[0];
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  },

  login: (email: string, role?: UserRole): User => {
    const users = getLocal<User[]>(KEYS.USERS, DEFAULT_USERS);
    let matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!matched) {
      // Create user if not exists or return first match
      const name = email.split('@')[0].replace('.', ' ');
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      matched = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        name: formattedName,
        email,
        role: role || 'fleet_manager'
      };
      setLocal(KEYS.USERS, [...users, matched]);
    } else if (role) {
      // If logging in with a specific role, let's update it for convenience
      matched.role = role;
      setLocal(KEYS.USERS, users.map(u => u.id === matched!.id ? matched! : u));
    }

    setLocal(KEYS.CURRENT_USER, matched);
    dbService.addAuditLog('Login', `User ${matched.name} (${matched.role}) logged in successfully.`);
    return matched;
  },

  logout: () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      dbService.addAuditLog('Logout', `User ${currentUser.name} logged out.`);
    }
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  updateProfile: (name: string, role: UserRole): User | null => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    const updated = { ...currentUser, name, role };
    setLocal(KEYS.CURRENT_USER, updated);

    const users = getLocal<User[]>(KEYS.USERS, DEFAULT_USERS);
    setLocal(KEYS.USERS, users.map(u => u.id === currentUser.id ? updated : u));
    
    dbService.addAuditLog('Update Profile', `Profile updated: Name=${name}, Role=${role}`);
    return updated;
  }
};

// ---------------- DATABASE SERVICE (CRUD & BUSINESS RULES) ----------------
export const dbService = {
  // --- REAL-TIME FIRESTORE SYNC ---
  syncFromFirestore: async () => {
    if (!isRealFirebase) return;
    try {
      const keysToSync = [
        KEYS.VEHICLES,
        KEYS.DRIVERS,
        KEYS.TRIPS,
        KEYS.MAINTENANCE,
        KEYS.FUEL,
        KEYS.EXPENSES,
        KEYS.DOCUMENTS,
        KEYS.NOTIFICATIONS,
        KEYS.REPORTS,
        KEYS.AUDIT_LOGS
      ];

      for (const key of keysToSync) {
        const docRef = firestoreDb.doc('fleet_data', key);
        const snap = await firestoreDb.getDoc(docRef);
        if (snap.exists()) {
          const remoteData = snap.data();
          if (remoteData && Array.isArray(remoteData.list)) {
            localStorage.setItem(key, JSON.stringify(remoteData.list));
          }
        } else {
          // Document does not exist in Firestore yet (e.g. newly provisioned DB)
          // Let's seed the Firestore DB with the default mock data from local storage!
          const currentLocalData = getLocal(key, getSeedDefaultData(key));
          await firestoreDb.setDoc(docRef, { list: currentLocalData });
        }
      }
      console.log("🔄 Synchronized all fleet data from Firestore successfully!");
    } catch (error) {
      console.error("❌ Failed to synchronize fleet data from Firestore:", error);
    }
  },

  // --- GENERAL READS ---
  getVehicles: () => getLocal<Vehicle[]>(KEYS.VEHICLES, DEFAULT_VEHICLES),
  getDrivers: () => getLocal<Driver[]>(KEYS.DRIVERS, DEFAULT_DRIVERS),
  getTrips: () => getLocal<Trip[]>(KEYS.TRIPS, DEFAULT_TRIPS),
  getMaintenanceLogs: () => getLocal<MaintenanceLog[]>(KEYS.MAINTENANCE, DEFAULT_MAINTENANCE),
  getFuelLogs: () => getLocal<FuelLog[]>(KEYS.FUEL, DEFAULT_FUEL),
  getExpenses: () => getLocal<Expense[]>(KEYS.EXPENSES, DEFAULT_EXPENSES),
  getDocuments: () => getLocal<VehicleDocument[]>(KEYS.DOCUMENTS, DEFAULT_DOCUMENTS),
  getNotifications: () => getLocal<SystemNotification[]>(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS),
  getReports: () => getLocal<Report[]>(KEYS.REPORTS, DEFAULT_REPORTS),
  getAuditLogs: () => getLocal<AuditLog[]>(KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS),

  // --- REUSABLE AUDIT LOGGER ---
  addAuditLog: (action: string, details: string) => {
    const currentUser = authService.getCurrentUser() || { id: 'sys', name: 'System', role: 'fleet_manager' as UserRole };
    const logs = getLocal<AuditLog[]>(KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: 'al_' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setLocal(KEYS.AUDIT_LOGS, [newLog, ...logs]);
    return newLog;
  },

  // --- REUSABLE NOTIFICATION TRIGGER ---
  addNotification: (title: string, message: string, type: 'warning' | 'info' | 'success' | 'danger') => {
    const list = getLocal<SystemNotification[]>(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
    const newNotif: SystemNotification = {
      id: 'n_' + Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    setLocal(KEYS.NOTIFICATIONS, [newNotif, ...list]);
    return newNotif;
  },

  // ================= VEHICLE OPERATIONS =================
  addVehicle: (vehicle: Omit<Vehicle, 'id'>): Vehicle => {
    const list = dbService.getVehicles();

    // RULE 1: Registration number must be unique
    const dup = list.find(v => v.registrationNumber.trim().toLowerCase() === vehicle.registrationNumber.trim().toLowerCase());
    if (dup) {
      throw new Error(`Vehicle Registration Number '${vehicle.registrationNumber}' already exists.`);
    }

    const newVehicle: Vehicle = {
      ...vehicle,
      id: 'v_' + Math.random().toString(36).substr(2, 9)
    };

    setLocal(KEYS.VEHICLES, [...list, newVehicle]);
    dbService.addAuditLog('Create Vehicle', `Added vehicle: ${newVehicle.name} (${newVehicle.registrationNumber})`);
    return newVehicle;
  },

  editVehicle: (id: string, updates: Partial<Vehicle>): Vehicle => {
    const list = dbService.getVehicles();
    const idx = list.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('Vehicle not found.');

    // Enforce Registration number uniqueness on edit
    if (updates.registrationNumber) {
      const dup = list.find(v => v.id !== id && v.registrationNumber.trim().toLowerCase() === updates.registrationNumber!.trim().toLowerCase());
      if (dup) {
        throw new Error(`Registration Number '${updates.registrationNumber}' is already in use.`);
      }
    }

    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    setLocal(KEYS.VEHICLES, list);

    dbService.addAuditLog('Update Vehicle', `Updated vehicle details for ${updated.name} (${updated.registrationNumber})`);
    return updated;
  },

  deleteVehicle: (id: string): void => {
    const list = dbService.getVehicles();
    const vehicle = list.find(v => v.id === id);
    if (!vehicle) throw new Error('Vehicle not found.');

    // Prevent deletion if active or assigned
    const activeTrips = dbService.getTrips().filter(t => t.vehicleId === id && (t.status === 'Dispatched'));
    if (activeTrips.length > 0) {
      throw new Error('Cannot delete a vehicle currently assigned to an active trip.');
    }

    setLocal(KEYS.VEHICLES, list.filter(v => v.id !== id));
    dbService.addAuditLog('Delete Vehicle', `Removed vehicle: ${vehicle.name} (${vehicle.registrationNumber})`);
  },

  retireVehicle: (id: string): Vehicle => {
    // RULE 2: Retired vehicles cannot be assigned
    return dbService.editVehicle(id, { status: 'Retired' });
  },

  // ================= DRIVER OPERATIONS =================
  addDriver: (driver: Omit<Driver, 'id'>): Driver => {
    const list = dbService.getDrivers();
    const newDriver: Driver = {
      ...driver,
      id: 'd_' + Math.random().toString(36).substr(2, 9)
    };
    setLocal(KEYS.DRIVERS, [...list, newDriver]);
    dbService.addAuditLog('Create Driver', `Registered driver: ${newDriver.name}`);

    // Trigger alerts if license is expired/expiring at creation time
    dbService.checkDriverCompliance(newDriver);

    return newDriver;
  },

  editDriver: (id: string, updates: Partial<Driver>): Driver => {
    const list = dbService.getDrivers();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Driver not found.');

    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    setLocal(KEYS.DRIVERS, list);

    dbService.addAuditLog('Update Driver', `Updated driver ${updated.name}`);
    dbService.checkDriverCompliance(updated);

    return updated;
  },

  suspendDriver: (id: string): Driver => {
    // RULE 5: Suspended driver cannot drive
    return dbService.editDriver(id, { status: 'Suspended' });
  },

  reinstateDriver: (id: string): Driver => {
    return dbService.editDriver(id, { status: 'Available' });
  },

  deleteDriver: (id: string): void => {
    const list = dbService.getDrivers();
    const driver = list.find(d => d.id === id);
    if (!driver) throw new Error('Driver not found.');

    const activeTrips = dbService.getTrips().filter(t => t.driverId === id && t.status === 'Dispatched');
    if (activeTrips.length > 0) {
      throw new Error('Cannot delete a driver currently assigned to an active trip.');
    }

    setLocal(KEYS.DRIVERS, list.filter(d => d.id !== id));
    dbService.addAuditLog('Delete Driver', `Removed driver: ${driver.name}`);
  },

  checkDriverCompliance: (driver: Driver): void => {
    const now = new Date();
    const expiry = new Date(driver.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      dbService.addNotification('License Expired Alert', `Driver ${driver.name}'s license expired on ${driver.expiryDate}. Immediate action required.`, 'danger');
    } else if (diffDays <= 30) {
      dbService.addNotification('License Expiring Soon', `Driver ${driver.name}'s CDL expires in ${diffDays} days (${driver.expiryDate}). Sending email reminder.`, 'warning');
    }

    if (driver.safetyScore < 60 && driver.status !== 'Suspended') {
      dbService.addNotification('Safety Score Under Threshold', `Driver ${driver.name}'s safety score fell to ${driver.safetyScore}%. Recommended suspension.`, 'warning');
    }
  },

  // ================= TRIP WORKFLOW & ACTIONS =================
  createTrip: (trip: Omit<Trip, 'id' | 'status'>): Trip => {
    const list = dbService.getTrips();
    const newTrip: Trip = {
      ...trip,
      id: 't_' + Math.random().toString(36).substr(2, 9),
      status: 'Draft'
    };

    setLocal(KEYS.TRIPS, [...list, newTrip]);
    dbService.addAuditLog('Create Trip Draft', `Draft trip created: ${newTrip.source} -> ${newTrip.destination}`);
    return newTrip;
  },

  editTrip: (id: string, updates: Partial<Trip>): Trip => {
    const list = dbService.getTrips();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Trip not found.');

    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    setLocal(KEYS.TRIPS, list);

    dbService.addAuditLog('Edit Trip', `Updated details for trip ${updated.source} -> ${updated.destination}`);
    return updated;
  },

  dispatchTrip: (id: string): Trip => {
    const trips = dbService.getTrips();
    const trip = trips.find(t => t.id === id);
    if (!trip) throw new Error('Trip not found.');

    const vehicle = dbService.getVehicles().find(v => v.id === trip.vehicleId);
    const driver = dbService.getDrivers().find(d => d.id === trip.driverId);

    if (!vehicle) throw new Error('Assigned vehicle does not exist.');
    if (!driver) throw new Error('Assigned driver does not exist.');

    // ---- APPLY BUSINESS RULES IN ORDER ----
    
    // RULE 2: Retired vehicles cannot be assigned
    if (vehicle.status === 'Retired') {
      throw new Error(`Cannot dispatch. Vehicle ${vehicle.name} is Retired.`);
    }

    // RULE 3: In Shop vehicles cannot be dispatched
    if (vehicle.status === 'In Shop') {
      throw new Error(`Cannot dispatch. Vehicle ${vehicle.name} is currently In Shop for maintenance.`);
    }

    // RULE 6: Vehicle already On Trip cannot be assigned
    if (vehicle.status === 'On Trip') {
      throw new Error(`Cannot dispatch. Vehicle ${vehicle.name} is already assigned to another active trip.`);
    }

    // RULE 4: Expired License cannot drive
    const now = new Date();
    const expiry = new Date(driver.expiryDate);
    if (expiry < now) {
      throw new Error(`Cannot dispatch. Driver ${driver.name} has an Expired CDL (Expired on ${driver.expiryDate}).`);
    }

    // RULE 5: Suspended driver cannot drive
    if (driver.status === 'Suspended') {
      throw new Error(`Cannot dispatch. Driver ${driver.name} is currently Suspended.`);
    }

    // RULE 7: Driver already On Trip cannot be assigned
    if (driver.status === 'On Trip') {
      throw new Error(`Cannot dispatch. Driver ${driver.name} is already on another active trip.`);
    }

    // RULE 8: Cargo Weight cannot exceed Max Capacity
    if (trip.cargoWeight > vehicle.maxCapacity) {
      throw new Error(`Dispatch Rejected. Cargo weight (${trip.cargoWeight} kg) exceeds vehicle maximum capacity (${vehicle.maxCapacity} kg).`);
    }

    // ---- SUCCESSFUL DISPATCH: APPLY MUTATIONS ----
    
    // RULE 9: Dispatching trip automatically changes Vehicle -> On Trip, Driver -> On Trip
    dbService.editVehicle(vehicle.id, { status: 'On Trip' });
    dbService.editDriver(driver.id, { status: 'On Trip' });

    // Update Trip Status
    trip.status = 'Dispatched';
    setLocal(KEYS.TRIPS, trips);

    dbService.addAuditLog('Dispatch Trip', `Dispatched trip: ${trip.source} -> ${trip.destination}. Driver: ${driver.name}. Vehicle: ${vehicle.name}`);
    dbService.addNotification('Trip Dispatched', `Trip ${trip.source} to ${trip.destination} has been dispatched.`, 'info');

    return trip;
  },

  cancelTrip: (id: string): Trip => {
    const trips = dbService.getTrips();
    const trip = trips.find(t => t.id === id);
    if (!trip) throw new Error('Trip not found.');

    const oldStatus = trip.status;
    trip.status = 'Cancelled';
    setLocal(KEYS.TRIPS, trips);

    // RULE 11: Cancelling trip restores driver and vehicle availability if they were dispatched
    if (oldStatus === 'Dispatched') {
      dbService.editVehicle(trip.vehicleId, { status: 'Available' });
      dbService.editDriver(trip.driverId, { status: 'Available' });
    }

    dbService.addAuditLog('Cancel Trip', `Cancelled trip ${trip.source} -> ${trip.destination}`);
    dbService.addNotification('Trip Cancelled', `Trip ${trip.source} -> ${trip.destination} has been cancelled.`, 'danger');

    return trip;
  },

  completeTrip: (id: string, finalOdometer: number, fuelConsumed: number, finalDistance: number): Trip => {
    const trips = dbService.getTrips();
    const trip = trips.find(t => t.id === id);
    if (!trip) throw new Error('Trip not found.');

    const vehicle = dbService.getVehicles().find(v => v.id === trip.vehicleId);
    if (vehicle && finalOdometer < vehicle.odometer) {
      throw new Error(`Final Odometer (${finalOdometer} km) cannot be less than vehicle's current odometer (${vehicle.odometer} km).`);
    }

    // Updates
    trip.status = 'Completed';
    trip.finalOdometer = finalOdometer;
    trip.fuelConsumed = fuelConsumed;
    trip.finalDistance = finalDistance;
    setLocal(KEYS.TRIPS, trips);

    // Update vehicle's odometer
    if (vehicle) {
      dbService.editVehicle(vehicle.id, { 
        odometer: finalOdometer,
        status: 'Available' // RULE 10: Completing Trip automatically restores Vehicle -> Available
      });
    }

    // RULE 10: Completing Trip automatically restores Driver -> Available
    dbService.editDriver(trip.driverId, { status: 'Available' });

    // Auto-create a Fuel Log and Expense entry for the trip's fuel consumption
    const fuelCost = fuelConsumed * 1.85; // Mock fuel price index
    dbService.addFuelLog({
      vehicleId: trip.vehicleId,
      liters: fuelConsumed,
      cost: Number(fuelCost.toFixed(2)),
      date: trip.endDate
    });

    dbService.addAuditLog('Complete Trip', `Completed trip ${trip.source} -> ${trip.destination}. Fuel Used: ${fuelConsumed} L.`);
    dbService.addNotification('Trip Completed', `Trip ${trip.source} -> ${trip.destination} completed. Driver & vehicle returned to Available.`, 'success');

    return trip;
  },

  deleteTrip: (id: string): void => {
    const list = dbService.getTrips();
    const trip = list.find(t => t.id === id);
    if (!trip) throw new Error('Trip not found.');

    if (trip.status === 'Dispatched') {
      dbService.editVehicle(trip.vehicleId, { status: 'Available' });
      dbService.editDriver(trip.driverId, { status: 'Available' });
    }

    setLocal(KEYS.TRIPS, list.filter(t => t.id !== id));
    dbService.addAuditLog('Delete Trip', `Deleted trip: ${trip.source} -> ${trip.destination}`);
  },

  // ================= MAINTENANCE WORKFLOW =================
  addMaintenanceLog: (log: Omit<MaintenanceLog, 'id' | 'status'>): MaintenanceLog => {
    const list = dbService.getMaintenanceLogs();
    const vehicle = dbService.getVehicles().find(v => v.id === log.vehicleId);
    if (!vehicle) throw new Error('Vehicle does not exist.');

    // RULE 12: Creating maintenance automatically changes vehicle -> In Shop
    dbService.editVehicle(vehicle.id, { status: 'In Shop' });

    const newLog: MaintenanceLog = {
      ...log,
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      status: 'Active'
    };

    setLocal(KEYS.MAINTENANCE, [...list, newLog]);

    // Also register an expense in the expenses ledger for maintenance
    dbService.addExpense({
      vehicleId: log.vehicleId,
      category: 'Maintenance',
      cost: log.cost,
      date: log.date,
      description: `Maintenance: ${log.type} - ${log.description}`
    });

    dbService.addAuditLog('Create Maintenance', `Created Maintenance Log for ${vehicle.name}: ${log.description}. Cost: $${log.cost}`);
    dbService.addNotification('Maintenance Started', `Vehicle ${vehicle.name} is now in shop for ${log.type} maintenance.`, 'warning');

    return newLog;
  },

  closeMaintenance: (id: string): MaintenanceLog => {
    const logs = dbService.getMaintenanceLogs();
    const log = logs.find(m => m.id === id);
    if (!log) throw new Error('Maintenance record not found.');

    log.status = 'Completed';
    setLocal(KEYS.MAINTENANCE, logs);

    // RULE 13: Closing maintenance returns vehicle -> Available, unless Retired
    const vehicle = dbService.getVehicles().find(v => v.id === log.vehicleId);
    if (vehicle && vehicle.status !== 'Retired') {
      dbService.editVehicle(vehicle.id, { status: 'Available' });
    }

    dbService.addAuditLog('Close Maintenance', `Closed maintenance session for vehicle id ${log.vehicleId}. Cost total: $${log.cost}`);
    dbService.addNotification('Maintenance Completed', `Maintenance resolved. Vehicle returned to fleet operations.`, 'success');

    return log;
  },

  deleteMaintenanceLog: (id: string): void => {
    const list = dbService.getMaintenanceLogs();
    const log = list.find(m => m.id === id);
    if (!log) throw new Error('Maintenance record not found.');

    if (log.status === 'Active') {
      const vehicle = dbService.getVehicles().find(v => v.id === log.vehicleId);
      if (vehicle && vehicle.status === 'In Shop') {
        dbService.editVehicle(vehicle.id, { status: 'Available' });
      }
    }

    setLocal(KEYS.MAINTENANCE, list.filter(m => m.id !== id));
    dbService.addAuditLog('Delete Maintenance', `Removed maintenance log for vehicle ID ${log.vehicleId}`);
  },

  // ================= FUEL OPERATIONS =================
  addFuelLog: (log: Omit<FuelLog, 'id'>): FuelLog => {
    const list = dbService.getFuelLogs();
    const newLog: FuelLog = {
      ...log,
      id: 'f_' + Math.random().toString(36).substr(2, 9)
    };
    setLocal(KEYS.FUEL, [...list, newLog]);

    // Auto-create in global expenses too
    dbService.addExpense({
      vehicleId: log.vehicleId,
      category: 'Fuel',
      cost: log.cost,
      date: log.date,
      description: `Fuel Refill: ${log.liters} Liters`
    });

    dbService.addAuditLog('Add Fuel Log', `Refueled vehicle ID ${log.vehicleId}: ${log.liters} liters for $${log.cost}`);
    return newLog;
  },

  deleteFuelLog: (id: string): void => {
    const list = dbService.getFuelLogs();
    const log = list.find(f => f.id === id);
    if (!log) throw new Error('Fuel log not found.');

    setLocal(KEYS.FUEL, list.filter(f => f.id !== id));
    dbService.addAuditLog('Delete Fuel Log', `Removed fuel log for vehicle ID ${log.vehicleId}`);
  },

  // ================= EXPENSE OPERATIONS =================
  addExpense: (expense: Omit<Expense, 'id'>): Expense => {
    const list = dbService.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: 'e_' + Math.random().toString(36).substr(2, 9)
    };
    setLocal(KEYS.EXPENSES, [...list, newExpense]);
    dbService.addAuditLog('Add Expense', `Logged expense: ${expense.category} - $${expense.cost} for vehicle ID ${expense.vehicleId}`);
    return newExpense;
  },

  deleteExpense: (id: string): void => {
    const list = dbService.getExpenses();
    const matched = list.find(e => e.id === id);
    if (!matched) throw new Error('Expense not found.');

    setLocal(KEYS.EXPENSES, list.filter(e => e.id !== id));
    dbService.addAuditLog('Delete Expense', `Removed expense item: ${matched.category} of $${matched.cost}`);
  },

  // ================= DOCUMENTS WORKFLOW =================
  addDocument: (doc: Omit<VehicleDocument, 'id'>): VehicleDocument => {
    const list = dbService.getDocuments();
    const newDoc: VehicleDocument = {
      ...doc,
      id: 'doc_' + Math.random().toString(36).substr(2, 9)
    };
    setLocal(KEYS.DOCUMENTS, [...list, newDoc]);
    dbService.addAuditLog('Upload Document', `Uploaded document: ${doc.name} for vehicle ${doc.vehicleId}`);
    return newDoc;
  },

  deleteDocument: (id: string): void => {
    const list = dbService.getDocuments();
    const doc = list.find(d => d.id === id);
    if (!doc) throw new Error('Document not found.');

    setLocal(KEYS.DOCUMENTS, list.filter(d => d.id !== id));
    dbService.addAuditLog('Delete Document', `Removed document: ${doc.name}`);
  },

  // ================= SYSTEM METRICS CALCULATORS =================
  getGlobalMetrics: () => {
    const vehicles = dbService.getVehicles();
    const drivers = dbService.getDrivers();
    const trips = dbService.getTrips();
    const expenses = dbService.getExpenses();

    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'On Trip').length;
    const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
    const inShopVehicles = vehicles.filter(v => v.status === 'In Shop').length;
    
    const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
    const pendingTrips = trips.filter(t => t.status === 'Draft').length;
    const completedTrips = trips.filter(t => t.status === 'Completed').length;

    const driversOnDuty = drivers.filter(d => d.status === 'On Trip').length;
    const driversAvailable = drivers.filter(d => d.status === 'Available').length;
    const driversSuspended = drivers.filter(d => d.status === 'Suspended').length;

    const fleetUtilization = totalVehicles > 0 ? Math.round((activeVehicles / (totalVehicles - vehicles.filter(v => v.status === 'Retired').length)) * 100) : 0;

    // Financial calculations (Expenses, Revenue, Profit, ROI)
    const fuelCost = expenses.filter(e => e.category === 'Fuel').reduce((sum, e) => sum + e.cost, 0);
    const maintenanceCost = expenses.filter(e => e.category === 'Maintenance' || e.category === 'Repair').reduce((sum, e) => sum + e.cost, 0);
    const operationalCost = expenses.reduce((sum, e) => sum + e.cost, 0);
    const revenue = trips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const profit = revenue - operationalCost;
    const roi = operationalCost > 0 ? Math.round((profit / operationalCost) * 100) : 0;

    return {
      totalVehicles,
      activeVehicles,
      availableVehicles,
      inShopVehicles,
      activeTrips,
      pendingTrips,
      completedTrips,
      driversOnDuty,
      driversAvailable,
      driversSuspended,
      fleetUtilization,
      fuelCost,
      maintenanceCost,
      operationalCost,
      revenue,
      profit,
      roi
    };
  },

  // ================= REUSE NOTIF MANAGER =================
  markNotificationAsRead: (id: string) => {
    const notifs = dbService.getNotifications();
    const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    setLocal(KEYS.NOTIFICATIONS, updated);
  },

  clearAllNotifications: () => {
    setLocal(KEYS.NOTIFICATIONS, []);
  },

  clearAuditLogs: () => {
    setLocal(KEYS.AUDIT_LOGS, []);
  },

  clearAllData: () => {
    setLocal(KEYS.VEHICLES, []);
    setLocal(KEYS.DRIVERS, []);
    setLocal(KEYS.TRIPS, []);
    setLocal(KEYS.MAINTENANCE, []);
    setLocal(KEYS.FUEL, []);
    setLocal(KEYS.EXPENSES, []);
    setLocal(KEYS.DOCUMENTS, []);
    setLocal(KEYS.NOTIFICATIONS, []);
    setLocal(KEYS.REPORTS, []);
    setLocal(KEYS.AUDIT_LOGS, []);
    dbService.addAuditLog('Database Reset', 'All database tables cleared by user request.');
  },

  loadDemoData: () => {
    setLocal(KEYS.VEHICLES, SEED_VEHICLES);
    setLocal(KEYS.DRIVERS, SEED_DRIVERS);
    setLocal(KEYS.TRIPS, SEED_TRIPS);
    setLocal(KEYS.MAINTENANCE, SEED_MAINTENANCE);
    setLocal(KEYS.FUEL, SEED_FUEL);
    setLocal(KEYS.EXPENSES, SEED_EXPENSES);
    setLocal(KEYS.DOCUMENTS, SEED_DOCUMENTS);
    setLocal(KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    setLocal(KEYS.REPORTS, SEED_REPORTS);
    setLocal(KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
    dbService.addAuditLog('Demo Data Loaded', 'Sample seed database restored.');
  }
};
