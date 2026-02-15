import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Make sure this matches your backend URL

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Alert {
    id: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
    is_read: boolean;
    title?: string; // For frontend compatibility if needed, or map it
}

export interface Device {
    id: string;
    name: string;
    meterId: string;
    location: string;
    status: 'online' | 'offline' | 'maintenance';
    lastSeen: string;
    firmwareVersion: string;
    batteryLevel?: number;
    assignedUser?: string;
}

export const endpoints = {
    predictEnergy: (features: number[]) => api.post('/predict/energy', { features }),
    identifyDevice: (powerReadings: number[]) => api.post('/identify/device', { power_readings: powerReadings }),
    getAlerts: () => api.get('/alerts'),
    createAlert: (alert: Omit<Alert, 'id'>) => api.post('/alerts', alert),
    acknowledgeAlert: (alertId: string) => api.put(`/alerts/${alertId}/acknowledge`),
    getDevices: () => api.get('/devices'),
};

export default api;
