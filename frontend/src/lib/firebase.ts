import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';

// -------------------------------------------------------------
// FIREBASE CONFIGURATION
// -------------------------------------------------------------
// Paste your Firebase Config here:
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || ""
};

// Toggle to TRUE when you want to connect to your live Firebase project
// Otherwise, it runs in simulated Local-Storage mode to prevent startup crashes.
const USE_REAL_FIREBASE = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

let app;
let auth: any;
let db: any;

if (USE_REAL_FIREBASE) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Real Firebase initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize real Firebase, falling back to simulated mode:", error);
  }
}

// =============================================================
// ROBUST SIMULATED / MOCK FIREBASE LAYER (PERSISTENT & COMPLIANT)
// =============================================================
const STORAGE_KEYS = {
  MOCK_AUTH_USERS: 'transitops_mock_firebase_auth_users',
  MOCK_FIRESTORE_USERS: 'transitops_mock_firestore_users',
  MOCK_AUTH_STATE: 'transitops_mock_firebase_current_user_id'
};

// Safe localStorage helpers
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Local storage set error: ", e);
  }
};

// Helper to seed initial accounts in mock mode
const seedMockUsersIfNeeded = () => {
  const existingAuth = getStorageItem<any[]>(STORAGE_KEYS.MOCK_AUTH_USERS, []);
  const existingFirestore = getStorageItem<Record<string, any>>(STORAGE_KEYS.MOCK_FIRESTORE_USERS, {});

  if (existingAuth.length === 0) {
    const mockAuthSeed = [
      { uid: 'uid_manager', email: 'manager@transitops.com', password: 'Password123!' },
      { uid: 'uid_dispatcher', email: 'dispatcher@transitops.com', password: 'Password123!' },
      { uid: 'uid_safety', email: 'safety@transitops.com', password: 'Password123!' },
      { uid: 'uid_finance', email: 'finance@transitops.com', password: 'Password123!' }
    ];

    const mockFirestoreSeed: Record<string, any> = {
      'uid_manager': {
        uid: 'uid_manager',
        name: 'James Carter',
        email: 'manager@transitops.com',
        phone: '+1 (555) 019-1000',
        role: 'fleet_manager',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      'uid_dispatcher': {
        uid: 'uid_dispatcher',
        name: 'Alexander Mercer',
        email: 'dispatcher@transitops.com',
        phone: '+1 (555) 019-2000',
        role: 'driver_dispatcher',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      'uid_safety': {
        uid: 'uid_safety',
        name: 'Lois Lane',
        email: 'safety@transitops.com',
        phone: '+1 (555) 019-2834',
        role: 'safety_officer',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      'uid_finance': {
        uid: 'uid_finance',
        name: 'Bruce Wayne',
        email: 'finance@transitops.com',
        phone: '+1 (555) 019-4000',
        role: 'financial_analyst',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    setStorageItem(STORAGE_KEYS.MOCK_AUTH_USERS, mockAuthSeed);
    setStorageItem(STORAGE_KEYS.MOCK_FIRESTORE_USERS, mockFirestoreSeed);
  }
};

seedMockUsersIfNeeded();

// Simulate Firebase SDK auth state listener list
const authListeners: Array<(user: any | null) => void> = [];

export const simulatedAuth = {
  currentUser: null as any | null,

  onAuthStateChanged: (callback: (user: any | null) => void) => {
    authListeners.push(callback);
    // Execute immediately with the current state
    const currentUid = localStorage.getItem(STORAGE_KEYS.MOCK_AUTH_STATE);
    if (currentUid) {
      const authUsers = getStorageItem<any[]>(STORAGE_KEYS.MOCK_AUTH_USERS, []);
      const match = authUsers.find(u => u.uid === currentUid);
      if (match) {
        simulatedAuth.currentUser = { uid: match.uid, email: match.email };
      } else {
        simulatedAuth.currentUser = null;
      }
    } else {
      simulatedAuth.currentUser = null;
    }
    
    setTimeout(() => callback(simulatedAuth.currentUser), 100);

    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  },

  createUserWithEmailAndPassword: async (emailInput: string, passwordInput: string) => {
    await new Promise(r => setTimeout(r, 800)); // Simulate network latency
    const email = emailInput.trim().toLowerCase();
    const authUsers = getStorageItem<any[]>(STORAGE_KEYS.MOCK_AUTH_USERS, []);

    if (authUsers.some(u => u.email === email)) {
      throw { code: 'auth/email-already-in-use', message: 'The email address is already in use by another account.' };
    }

    const uid = 'uid_' + Math.random().toString(36).substring(2, 15);
    const newAuthUser = { uid, email, password: passwordInput };
    
    setStorageItem(STORAGE_KEYS.MOCK_AUTH_USERS, [...authUsers, newAuthUser]);
    localStorage.setItem(STORAGE_KEYS.MOCK_AUTH_STATE, uid);
    simulatedAuth.currentUser = { uid, email };

    // Trigger listeners
    authListeners.forEach(cb => cb(simulatedAuth.currentUser));

    return { user: simulatedAuth.currentUser };
  },

  signInWithEmailAndPassword: async (emailInput: string, passwordInput: string) => {
    await new Promise(r => setTimeout(r, 800));
    const email = emailInput.trim().toLowerCase();
    const authUsers = getStorageItem<any[]>(STORAGE_KEYS.MOCK_AUTH_USERS, []);
    
    const matched = authUsers.find(u => u.email === email);
    if (!matched) {
      throw { code: 'auth/user-not-found', message: 'No user record found corresponding to this email.' };
    }
    if (matched.password !== passwordInput) {
      throw { code: 'auth/wrong-password', message: 'The password credential is invalid.' };
    }

    localStorage.setItem(STORAGE_KEYS.MOCK_AUTH_STATE, matched.uid);
    simulatedAuth.currentUser = { uid: matched.uid, email: matched.email };

    authListeners.forEach(cb => cb(simulatedAuth.currentUser));
    return { user: simulatedAuth.currentUser };
  },

  signOut: async () => {
    await new Promise(r => setTimeout(r, 200));
    localStorage.removeItem(STORAGE_KEYS.MOCK_AUTH_STATE);
    simulatedAuth.currentUser = null;
    authListeners.forEach(cb => cb(null));
  },

  sendPasswordResetEmail: async (emailInput: string) => {
    await new Promise(r => setTimeout(r, 500));
    const email = emailInput.trim().toLowerCase();
    const authUsers = getStorageItem<any[]>(STORAGE_KEYS.MOCK_AUTH_USERS, []);
    const matched = authUsers.find(u => u.email === email);
    if (!matched) {
      throw { code: 'auth/user-not-found', message: 'No user record matching this email exists.' };
    }
    console.log(`✉️ Simulated password reset email sent to ${email}`);
    return;
  },

  updateProfile: async (user: any, profile: { displayName?: string }) => {
    return;
  },

  updatePassword: async (user: any, newPasswordInput: string) => {
    await new Promise(r => setTimeout(r, 400));
    const uid = user.uid;
    const authUsers = getStorageItem<any[]>(STORAGE_KEYS.MOCK_AUTH_USERS, []);
    const updated = authUsers.map(u => u.uid === uid ? { ...u, password: newPasswordInput } : u);
    setStorageItem(STORAGE_KEYS.MOCK_AUTH_USERS, updated);
  }
};

export const simulatedFirestore = {
  doc: (pathOrCollection: any, docId?: string) => {
    return { path: docId ? `${pathOrCollection}/${docId}` : pathOrCollection, id: docId };
  },

  setDoc: async (docRef: { id: string }, data: any) => {
    await new Promise(r => setTimeout(r, 400));
    const store = getStorageItem<Record<string, any>>(STORAGE_KEYS.MOCK_FIRESTORE_USERS, {});
    
    const sanitizedData = { ...data };
    if (sanitizedData.createdAt && typeof sanitizedData.createdAt.toDate === 'function') {
      try {
        sanitizedData.createdAt = sanitizedData.createdAt.toDate().toISOString();
      } catch (e) {
        sanitizedData.createdAt = new Date().toISOString();
      }
    }
    if (sanitizedData.updatedAt && typeof sanitizedData.updatedAt.toDate === 'function') {
      try {
        sanitizedData.updatedAt = sanitizedData.updatedAt.toDate().toISOString();
      } catch (e) {
        sanitizedData.updatedAt = new Date().toISOString();
      }
    }

    store[docRef.id] = {
      ...sanitizedData,
      uid: docRef.id,
      updatedAt: new Date().toISOString()
    };
    setStorageItem(STORAGE_KEYS.MOCK_FIRESTORE_USERS, store);
  },

  getDoc: async (docRef: { id: string }) => {
    await new Promise(r => setTimeout(r, 300));
    const store = getStorageItem<Record<string, any>>(STORAGE_KEYS.MOCK_FIRESTORE_USERS, {});
    const docData = store[docRef.id];
    return {
      exists: () => !!docData,
      data: () => docData ? {
        ...docData,
        createdAt: docData.createdAt ? { 
          toDate: () => {
            const d = new Date(docData.createdAt);
            return isNaN(d.getTime()) ? new Date() : d;
          }
        } : null,
        updatedAt: docData.updatedAt ? { 
          toDate: () => {
            const d = new Date(docData.updatedAt);
            return isNaN(d.getTime()) ? new Date() : d;
          }
        } : null
      } : null
    };
  },

  updateDoc: async (docRef: { id: string }, data: any) => {
    await new Promise(r => setTimeout(r, 300));
    const store = getStorageItem<Record<string, any>>(STORAGE_KEYS.MOCK_FIRESTORE_USERS, {});
    if (!store[docRef.id]) throw new Error("Document does not exist");
    
    const sanitizedData = { ...data };
    if (sanitizedData.createdAt && typeof sanitizedData.createdAt.toDate === 'function') {
      try {
        sanitizedData.createdAt = sanitizedData.createdAt.toDate().toISOString();
      } catch (e) {
        sanitizedData.createdAt = new Date().toISOString();
      }
    }
    if (sanitizedData.updatedAt && typeof sanitizedData.updatedAt.toDate === 'function') {
      try {
        sanitizedData.updatedAt = sanitizedData.updatedAt.toDate().toISOString();
      } catch (e) {
        sanitizedData.updatedAt = new Date().toISOString();
      }
    }

    store[docRef.id] = {
      ...store[docRef.id],
      ...sanitizedData,
      updatedAt: new Date().toISOString()
    };
    setStorageItem(STORAGE_KEYS.MOCK_FIRESTORE_USERS, store);
  },

  collection: (collectionName: string) => {
    return collectionName;
  },

  deleteDoc: async (docRef: { id: string }) => {
    await new Promise(r => setTimeout(r, 200));
    const store = getStorageItem<Record<string, any>>(STORAGE_KEYS.MOCK_FIRESTORE_USERS, {});
    delete store[docRef.id];
    setStorageItem(STORAGE_KEYS.MOCK_FIRESTORE_USERS, store);
  }
};

// =============================================================
// ROBUST REAL FIRESTORE WRAPPER (TO MATCH MOCK INTERFACE)
// =============================================================
const realFirestore = {
  doc: (pathOrCollection: any, docId?: string) => {
    if (typeof pathOrCollection === 'string') {
      return doc(db, pathOrCollection, docId || '');
    }
    return doc(pathOrCollection, docId || '');
  },

  setDoc: async (docRef: any, data: any) => {
    return await setDoc(docRef, data);
  },

  getDoc: async (docRef: any) => {
    const snap = await getDoc(docRef);
    return {
      exists: () => snap.exists(),
      data: () => {
        const d = snap.data() as any;
        if (!d) return null;
        return {
          ...d,
          createdAt: d.createdAt ? {
            toDate: () => {
              if (d.createdAt && typeof d.createdAt.toDate === 'function') {
                return d.createdAt.toDate();
              }
              const parsed = new Date(d.createdAt);
              return isNaN(parsed.getTime()) ? new Date() : parsed;
            }
          } : null,
          updatedAt: d.updatedAt ? {
            toDate: () => {
              if (d.updatedAt && typeof d.updatedAt.toDate === 'function') {
                return d.updatedAt.toDate();
              }
              const parsed = new Date(d.updatedAt);
              return isNaN(parsed.getTime()) ? new Date() : parsed;
            }
          } : null
        };
      }
    };
  },

  updateDoc: async (docRef: any, data: any) => {
    return await updateDoc(docRef, data);
  },

  collection: (collectionName: string) => {
    return collection(db, collectionName);
  },

  deleteDoc: async (docRef: any) => {
    return await deleteDoc(docRef);
  }
};

// =============================================================
// CONDITIONAL EXPORTS (REAL SDK VS PERSISTENT SIMULATION)
// =============================================================
export const isRealFirebase = USE_REAL_FIREBASE;

export const firebaseAuth = USE_REAL_FIREBASE ? auth : simulatedAuth;
export const firestoreDb = USE_REAL_FIREBASE ? realFirestore : simulatedFirestore;

// Export underlying functions mapped cleanly so they can be imported uniformly
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc
};
