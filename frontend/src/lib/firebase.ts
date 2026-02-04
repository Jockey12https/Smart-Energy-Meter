import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
} as const;

// Basic runtime validation to help during local setup
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, v]) => !v || typeof v !== 'string' || v.trim() === '')
  .map(([k]) => k);

if (missingKeys.length > 0) {
  // Surface a clear error instead of failing deep inside auth calls
  // eslint-disable-next-line no-console
  console.error(
    `Firebase config missing: ${missingKeys.join(', ')}. Set VITE_FIREBASE_* in your .env.`
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;