import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  firebaseAuth, 
  firestoreDb, 
  isRealFirebase,
  simulatedAuth
} from '../lib/firebase';
import { User, UserRole } from '../types';
import { dbService } from '../lib/storage';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  register: (name: string, email: string, phone: string, role: UserRole, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (name: string, phone: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  error: string | null;
  setError: (err: string | null) => void;
}

const parseSafeDate = (val: any): string => {
  if (!val) {
    return new Date().toISOString();
  }
  
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d.toISOString();
      }
    } catch (e) {
      console.warn("Error parsing Timestamp:", e);
    }
  }

  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {}

  return new Date().toISOString();
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-login & session persistence
  useEffect(() => {
    const authServiceObj = isRealFirebase ? firebaseAuth : simulatedAuth;
    
    const unsubscribe = authServiceObj.onAuthStateChanged(async (firebaseUser: any) => {
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        try {
          // Fetch additional profile details from Firestore
          const uid = firebaseUser.uid;
          const userDocRef = firestoreDb.doc(firestoreDb.collection('users'), uid);
          const docSnap = await firestoreDb.getDoc(userDocRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const formattedUser: User = {
              id: uid,
              uid: uid,
              name: userData.name || firebaseUser.displayName || 'No Name',
              email: userData.email || firebaseUser.email || '',
              phone: userData.phone || '',
              role: userData.role || 'customer',
              status: userData.status || 'Active',
              createdAt: parseSafeDate(userData.createdAt),
              updatedAt: parseSafeDate(userData.updatedAt),
            };

            if (formattedUser.status === 'Suspended') {
              await authServiceObj.signOut();
              setError("Your account has been suspended. Please contact a Fleet Manager.");
              setCurrentUser(null);
              setRole(null);
              setToken(null);
            } else {
              setCurrentUser(formattedUser);
              setRole(formattedUser.role);
              
              // Simulate or retrieve auth token
              const mockToken = btoa(JSON.stringify({ uid, role: formattedUser.role, ts: Date.now() }));
              setToken(mockToken);
              localStorage.setItem('transitops_auth_token', mockToken);
              
              // Sync all operational data from Firestore
              try {
                await dbService.syncFromFirestore();
              } catch (syncErr) {
                console.error("Failed to sync fleet data on load:", syncErr);
              }
            }
          } else {
            // Document doesn't exist in Firestore, maybe fallback profile
            const fallbackUser: User = {
              id: uid,
              uid: uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: 'driver_dispatcher',
              status: 'Active'
            };
            setCurrentUser(fallbackUser);
            setRole('driver_dispatcher');
            
            // Sync all operational data from Firestore
            try {
              await dbService.syncFromFirestore();
            } catch (syncErr) {
              console.error("Failed to sync fleet data on load (fallback user):", syncErr);
            }
          }
        } catch (err: any) {
          console.error("Error retrieving user profile from Firestore:", err);
          setError("Error synchronizing profile details.");
        }
      } else {
        setCurrentUser(null);
        setRole(null);
        setToken(null);
        localStorage.removeItem('transitops_auth_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login
  const login = async (emailInput: string, passwordInput: string, rememberMe: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const authServiceObj = isRealFirebase ? firebaseAuth : simulatedAuth;
      const result = await authServiceObj.signInWithEmailAndPassword(emailInput, passwordInput);
      const uid = result.user.uid;

      // Retrieve firestore user
      const userDocRef = firestoreDb.doc(firestoreDb.collection('users'), uid);
      const docSnap = await firestoreDb.getDoc(userDocRef);
      
      if (!docSnap.exists()) {
        throw new Error("User record was authenticated but no profile exists in database.");
      }

      const userData = docSnap.data();
      if (userData.status === 'Suspended') {
        await authServiceObj.signOut();
        throw new Error("Your account has been suspended. Please contact a Fleet Manager.");
      }

      const user: User = {
        id: uid,
        uid: uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
        createdAt: parseSafeDate(userData.createdAt),
        updatedAt: parseSafeDate(userData.updatedAt)
      };

      setCurrentUser(user);
      setRole(user.role);
      const mockToken = btoa(JSON.stringify({ uid, role: user.role, ts: Date.now() }));
      setToken(mockToken);

      if (rememberMe) {
        localStorage.setItem('transitops_remember_me', emailInput);
      } else {
        localStorage.removeItem('transitops_remember_me');
      }

      dbService.addAuditLog('Login', `User ${user.name} authenticated via ${isRealFirebase ? 'Firebase' : 'Simulated DB'} as ${user.role}`);
      return user;
    } catch (err: any) {
      const errMsg = err.message || "Invalid authentication credentials.";
      setError(errMsg);
      setLoading(false);
      throw err;
    }
  };

  // Register
  const register = async (name: string, emailInput: string, phone: string, roleInput: UserRole, passwordInput: string) => {
    setLoading(true);
    setError(null);
    try {
      const authServiceObj = isRealFirebase ? firebaseAuth : simulatedAuth;
      
      // 1. Create authentication credential
      const result = await authServiceObj.createUserWithEmailAndPassword(emailInput, passwordInput);
      const uid = result.user.uid;

      // 2. Prepare profile structure
      const userDocRef = firestoreDb.doc(firestoreDb.collection('users'), uid);
      const newUserProfile = {
        uid,
        name,
        email: emailInput.trim().toLowerCase(),
        phone,
        role: roleInput,
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Store in Firestore
      await firestoreDb.setDoc(userDocRef, newUserProfile);

      const user: User = {
        id: uid,
        uid: uid,
        name,
        email: emailInput,
        phone,
        role: roleInput,
        status: 'Active',
        createdAt: newUserProfile.createdAt,
        updatedAt: newUserProfile.updatedAt
      };

      setCurrentUser(user);
      setRole(user.role);
      const mockToken = btoa(JSON.stringify({ uid, role: user.role, ts: Date.now() }));
      setToken(mockToken);

      dbService.addAuditLog('Register', `New account created: ${name} (${roleInput})`);
      return user;
    } catch (err: any) {
      const errMsg = err.message || "Failed to create account. Please check credentials.";
      setError(errMsg);
      setLoading(false);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      const authServiceObj = isRealFirebase ? firebaseAuth : simulatedAuth;
      
      if (currentUser) {
        dbService.addAuditLog('Logout', `User ${currentUser.name} signed out.`);
      }
      
      await authServiceObj.signOut();
      setCurrentUser(null);
      setRole(null);
      setToken(null);
    } catch (err: any) {
      console.error("Logout Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const resetPassword = async (emailInput: string) => {
    setError(null);
    try {
      const authServiceObj = isRealFirebase ? firebaseAuth : simulatedAuth;
      await authServiceObj.sendPasswordResetEmail(emailInput);
      dbService.addAuditLog('Password Reset Request', `Password reset sent to ${emailInput}`);
    } catch (err: any) {
      const errMsg = err.message || "No registered user found with this email.";
      setError(errMsg);
      throw err;
    }
  };

  // Update Profile
  const updateProfile = async (name: string, phone: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    setError(null);
    try {
      const userDocRef = firestoreDb.doc(firestoreDb.collection('users'), currentUser.id);
      
      const updates = {
        name,
        phone,
        updatedAt: new Date().toISOString()
      };

      await firestoreDb.updateDoc(userDocRef, updates);

      setCurrentUser(prev => prev ? {
        ...prev,
        name,
        phone,
        updatedAt: updates.updatedAt
      } : null);

      dbService.addAuditLog('Update Profile', `Profile updated for ${name}`);
    } catch (err: any) {
      const errMsg = err.message || "Error updating profile details.";
      setError(errMsg);
      throw err;
    }
  };

  // Change Password
  const changePassword = async (newPassword: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    setError(null);
    try {
      const authServiceObj = isRealFirebase ? firebaseAuth : simulatedAuth;
      
      // Firebase specific password update requires active session
      if (isRealFirebase) {
        const user = (firebaseAuth as any).currentUser;
        if (user) {
          await (firebaseAuth as any).updatePassword(user, newPassword);
        } else {
          throw new Error("Active session expired. Please re-authenticate.");
        }
      } else {
        await simulatedAuth.updatePassword(currentUser, newPassword);
      }

      dbService.addAuditLog('Change Password', `Password changed securely for ${currentUser.name}`);
    } catch (err: any) {
      const errMsg = err.message || "Error updating password.";
      setError(errMsg);
      throw err;
    }
  };

  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider value={{
      currentUser,
      role,
      isAuthenticated,
      loading,
      token,
      login,
      register,
      logout,
      resetPassword,
      updateProfile,
      changePassword,
      error,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
