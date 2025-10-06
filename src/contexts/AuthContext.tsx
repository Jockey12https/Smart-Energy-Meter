import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  currentRole: 'admin' | 'user' | null;
  login: (email: string, password: string, adminPassword?: string) => Promise<void>;
  signup: (email: string, password: string, role: 'admin' | 'user') => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
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
    const role = (snap.exists() && (snap.data() as any).role === 'admin') ? 'admin' : 'user';
    if (role === 'admin') {
      const expected = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
      if (!expected || adminPassword !== expected) {
        await signOut(auth);
        throw new Error('ADMIN_PASSWORD_INVALID');
      }
    }
    setCurrentRole(role);
  };

  const signup = async (email: string, password: string, role: 'admin' | 'user') => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email ?? email,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        displayName: user.displayName ?? null,
        provider: 'password',
        role,
        status: 'active',
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
          const role = (snap.exists() && (snap.data() as any).role === 'admin') ? 'admin' : 'user';
          setCurrentRole(role);
          setLoading(false);
        }).catch(() => {
          setCurrentRole('user');
          setLoading(false);
        });
      } else {
        setCurrentRole(null);
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}