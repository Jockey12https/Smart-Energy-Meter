import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  currentRole: 'admin' | 'user' | null;
  login: (email: string, password: string, adminPassword?: string) => Promise<void>;
  signup: (email: string, password: string, role: 'admin' | 'user', name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  userProfile: Record<string, unknown> | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<'admin' | 'user' | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);

  const generateUniqueSixDigitId = async (): Promise<number> => {
    // Try a few times to avoid rare collisions. If rules block reads, fall back without querying.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = Math.floor(100000 + Math.random() * 900000);
      try {
        const q = query(collection(db, 'users'), where('uidNumber', '==', candidate));
        const snap = await getDocs(q);
        if (snap.empty) return candidate;
      } catch {
        // If querying is denied by rules, accept the candidate and proceed.
        return candidate;
      }
    }
    // Fallback: still generate; repeated collisions are extremely unlikely.
    return Math.floor(100000 + Math.random() * 900000);
  };

  const login = async (email: string, password: string, adminPassword?: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      email: user.email ?? email,
      emailVerified: user.emailVerified,
    });
    const snap = await getDoc(userRef);
    let data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    // Backfill uidNumber if missing
    if (data && (data as any).uidNumber == null) {
      try {
        const newId = await generateUniqueSixDigitId();
        await updateDoc(userRef, { uidNumber: newId });
        data = { ...data, uidNumber: newId };
      } catch {}
    }
    const role = (snap.exists() && (snap.data() as any).role === 'admin') ? 'admin' : 'user';
    if (role === 'admin') {
      const expected = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
      if (!expected || adminPassword !== expected) {
        await signOut(auth);
        throw new Error('ADMIN_PASSWORD_INVALID');
      }
    }
    setCurrentRole(role);
    setUserProfile(data);
  };

  const signup = async (email: string, password: string, role: 'admin' | 'user', name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    try {
      let uidNumber: number;
      try {
        uidNumber = await generateUniqueSixDigitId();
      } catch {
        uidNumber = Math.floor(100000 + Math.random() * 900000);
      }
      try {
        await updateProfile(user, { displayName: name });
      } catch {}
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email ?? email,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        displayName: name || user.displayName || null,
        provider: 'password',
        role,
        status: 'active',
        uidNumber,
      });
    } catch (error) {
      // Do not block signup if profile write fails (e.g., Firestore not enabled/rules)
      console.error('Failed to create user profile document:', error);
    }
    setCurrentRole(role);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      // In demo mode, just show success message
      console.log('Password reset requested for:', email);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        getDoc(doc(db, 'users', user.uid)).then((snap) => {
          const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
          const role = (snap.exists() && (snap.data() as any).role === 'admin') ? 'admin' : 'user';
          setCurrentRole(role);
          setUserProfile(data);
          setLoading(false);
        }).catch(() => {
          setCurrentRole('user');
          setUserProfile(null);
          setLoading(false);
        });
      } else {
        setCurrentRole(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    currentRole,
    login,
    signup,
    logout,
    resetPassword,
    loading,
    userProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}