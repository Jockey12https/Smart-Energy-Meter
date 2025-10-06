import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  // Note: In production, these should be environment variables
  apiKey: "demo-api-key",
  authDomain: "smart-energy-meter.firebaseapp.com",
  databaseURL: "https://smart-energy-meter-default-rtdb.firebaseio.com",
  projectId: "smart-energy-meter",
  storageBucket: "smart-energy-meter.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;