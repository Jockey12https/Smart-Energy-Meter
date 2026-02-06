import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnergyCard from './EnergyCard';
import RealTimeChart from '../charts/RealTimeChart';
import { Zap, Activity, Gauge, Battery, Wifi, WifiOff, Clock, Cpu, MapPin } from 'lucide-react';
import { database, db } from '@/lib/firebase';
import { onValue, query, ref, limitToLast, orderByKey } from 'firebase/database';
import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { endpoints } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface EnergyData {
  irms: number;
  vrms: number;
  power: number;
  energy: number;
  timestamp: string;
}

interface Device {
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

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [currentData, setCurrentData] = useState<EnergyData>({
    irms: 0,
    vrms: 0,
    power: 0,
    energy: 0,
    timestamp: new Date().toISOString()
  });

  const [historicalData, setHistoricalData] = useState<EnergyData[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [todayConsumption, setTodayConsumption] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [peakUsage, setPeakUsage] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [identifying, setIdentifying] = useState(false);

  // Subscribe to Firebase Realtime Database for live data
  useEffect(() => {
    if (!currentUser?.uid) return;

    const dataRef = ref(database, `SmartMeter/users/${currentUser.uid}/data`);
    const q = query(dataRef, orderByKey(), limitToLast(50));
    const unsub = onValue(q, (snapshot) => {
      const val = snapshot.val() as Record<string, any> | null;
      if (!val) return;

      const entries = Object.entries(val)
        .map(([timestamp, item]) => {
          const irms = parseFloat(item?.Irms ?? '0');
          const vrms = parseFloat(item?.Vrms ?? '0');
          const power = parseFloat(item?.Power ?? '0');
          const energy = parseFloat(item?.kWh ?? '0');

          // Parse timestamp format: 2025-10-11_12-45-10
          let ts: Date;
          try {
            // Convert 2026-01-31_13:01:36_443 to 2026-01-31T13:01:36.443
            const parts = timestamp.split('_');
            if (parts.length >= 2) {
              const datePart = parts[0];
              const timePart = parts[1];
              const msPart = parts[2] || '000';
              const isoString = `${datePart}T${timePart}.${msPart}`;
              ts = new Date(isoString);
            } else {
              ts = new Date();
            }

            // If invalid date, use current time
            if (isNaN(ts.getTime())) {
              ts = new Date();
            }
          } catch {
            ts = new Date();
          }

          const dataPoint: EnergyData = {
            irms: Number.isFinite(irms) ? irms : 0,
            vrms: Number.isFinite(vrms) ? vrms : 0,
            power: Number.isFinite(power) ? power : 0,
            energy: Number.isFinite(energy) ? energy : 0,
            timestamp: ts.toISOString(),
          };
          return dataPoint;
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (entries.length > 0) {
        // Get the latest entry (last in sorted array)
        const latest = entries[entries.length - 1];
        setCurrentData(latest);
        setHistoricalData(entries);
        setLastUpdate(new Date(latest.timestamp));
        setIsOnline(true);

        // Calculate today's consumption
        const today = new Date().toISOString().split('T')[0];
        const todayData = entries.filter(entry =>
          entry.timestamp.startsWith(today)
        );
        const todayTotal = todayData.length > 0
          ? todayData[todayData.length - 1].energy - todayData[0].energy
          : 0;
        setTodayConsumption(todayTotal);

        // Calculate estimated cost (assuming ₹8.00/kWh)
        const cost = todayTotal * 8.00;
        setEstimatedCost(cost);

        // Find peak usage
        const maxPower = Math.max(...entries.map(entry => entry.power));
        setPeakUsage(maxPower);
      }
    }, () => {
      setIsOnline(false);
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // Use XGBoost identify API to infer which registered bulb(s) are currently ON
  useEffect(() => {
    const inferFromPower = async () => {
      try {
        // use the latest power from the most recent historical data point
        const latestPower = historicalData[historicalData.length - 1]?.power ?? currentData.power;
        if (!latestPower && latestPower !== 0) return;
        setIdentifying(true);
        const resp = await endpoints.identifyDevice([Number(latestPower)]);
        const payload = resp?.data;

        // Normalize payload to array of strings
        let tokens: string[] = [];
        if (payload == null) tokens = [];
        else if (Array.isArray(payload)) tokens = payload.map(String);
        else tokens = [String(payload)];

        // Join tokens into single uppercase string for simple checks
        const joined = tokens.join(',').toUpperCase();

        // Handle canonical outputs from XGBoost: ALL_OFF, ALL_ON, or numbers like '7','12','15' (or combinations)
        if (joined.includes('ALL_OFF')) {
          // mark all devices offline (persist changes)
          const updates = devices.map(async (d) => {
            if (d.status !== 'offline') {
              try {
                await updateDoc(doc(db, 'devices', d.id), { status: 'offline' });
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Failed to update device status (ALL_OFF):', d.id, e);
              }
            }
            return { ...d, status: 'offline' };
          });
          await Promise.all(updates);
          setDevices(prev => prev.map(d => ({ ...d, status: 'offline' })));
        } else if (joined.includes('ALL_ON')) {
          // mark all devices online (persist changes)
          const updates = devices.map(async (d) => {
            if (d.status !== 'online') {
              try {
                await updateDoc(doc(db, 'devices', d.id), { status: 'online', lastSeen: serverTimestamp() });
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Failed to update device status (ALL_ON):', d.id, e);
              }
            }
            return { ...d, status: 'online' };
          });
          await Promise.all(updates);
          setDevices(prev => prev.map(d => ({ ...d, status: 'online' })));
        } else {
          // extract exact tokens 7,12,15
          const matches = joined.match(/\b(7|12|15)\b/g) || [];
          const found = new Set(matches.map(m => Number(m)));

          const numToLabel: Record<number, string> = {
            7: 'Bulb 7W',
            12: 'Bulb 12W',
            15: 'Bulb 15W'
          };

          // compute and persist status per registered device
          const updates = devices.map(async (d) => {
            let isOnline = false;
            for (const n of Array.from(found)) {
              if (numToLabel[n] && d.name === numToLabel[n]) {
                isOnline = true;
                break;
              }
            }
            const newStatus = isOnline ? 'online' : 'offline';
            if (newStatus !== d.status) {
              try {
                await updateDoc(doc(db, 'devices', d.id), { status: newStatus, lastSeen: newStatus === 'online' ? serverTimestamp() : d.lastSeen });
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Failed to update device status:', d.id, e);
              }
            }
            return { ...d, status: newStatus };
          });

          const updated = await Promise.all(updates);
          setDevices(updated);
        }
      } catch (err) {
        // If identify fails, keep existing device statuses and continue
        // eslint-disable-next-line no-console
        console.error('Device identification failed:', err);
      } finally {
        setIdentifying(false);
      }
    };

    // Run when we have some historical data or currentData updates
    if (currentUser) {
      inferFromPower();
      const id = setInterval(inferFromPower, 15000);
      return () => clearInterval(id);
    }
  }, [currentUser, currentData, historicalData]);

  // Fetch devices from Firestore
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devicesCollection = collection(db, 'devices');
        const snapshot = await getDocs(devicesCollection);
        const fetchedDevices: Device[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedDevices.push({
            id: doc.id,
            name: data.name || 'Unknown Device',
            meterId: data.meterId || doc.id,
            location: data.location || 'Unknown',
            status: data.status || 'offline',
            lastSeen: data.lastSeen || new Date().toISOString(),
            firmwareVersion: data.firmwareVersion || '1.0.0',
            batteryLevel: data.batteryLevel || 100,
            assignedUser: data.assignedUser || 'Unassigned'
          });
        });
        
        setDevices(fetchedDevices);
      } catch (error) {
        console.error("Failed to fetch devices from Firestore:", error);
      }
    };

    if (currentUser) {
      fetchDevices();
      // Refresh devices every 30 seconds
      const interval = setInterval(fetchDevices, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const getStatus = (value: number, type: 'irms' | 'vrms' | 'power') => {
    switch (type) {
      case 'irms':
        if (value > 12) return 'danger';
        if (value > 8) return 'warning';
        return 'normal';
      case 'vrms':
        if (value > 245 || value < 200) return 'danger';
        if (value > 235 || value < 210) return 'warning';
        return 'normal';
      case 'power':
        if (value > 2500) return 'danger';
        if (value > 2000) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getTrend = (current: number, previous: number) => {
    if (!previous) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'stable';
  };

  const previousData = historicalData[historicalData.length - 2];

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>System Status</span>
                {isOnline ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Wifi className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-2">
                <Clock className="w-4 h-4" />
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Energy Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnergyCard
          title="Current (Irms)"
          value={currentData.irms}
          unit="A"
          icon={<Activity className="h-4 w-4" />}
          trend={getTrend(currentData.irms, previousData?.irms || 0)}
          trendValue={previousData ? ((currentData.irms - previousData.irms) / previousData.irms) * 100 : 0}
          status={getStatus(currentData.irms, 'irms')}
        />

        <EnergyCard
          title="Voltage (Vrms)"
          value={currentData.vrms}
          unit="V"
          icon={<Zap className="h-4 w-4" />}
          trend={getTrend(currentData.vrms, previousData?.vrms || 0)}
          trendValue={previousData ? ((currentData.vrms - previousData.vrms) / previousData.vrms) * 100 : 0}
          status={getStatus(currentData.vrms, 'vrms')}
        />

        <EnergyCard
          title="Power"
          value={currentData.power}
          unit="W"
          icon={<Gauge className="h-4 w-4" />}
          trend={getTrend(currentData.power, previousData?.power || 0)}
          trendValue={previousData ? ((currentData.power - previousData.power) / previousData.power) * 100 : 0}
          status={getStatus(currentData.power, 'power')}
        />

        <EnergyCard
          title="Energy"
          value={currentData.energy}
          unit="kWh"
          icon={<Battery className="h-4 w-4" />}
          trend="up"
          trendValue={5.2}
          status="normal"
        />
      </div>

      {/* Real-time Charts */}
      <RealTimeChart data={historicalData.map((d) => ({ time: d.timestamp, irms: d.irms, vrms: d.vrms, power: d.power, energy: d.energy }))} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today's Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayConsumption.toFixed(1)} kWh</div>
            <p className="text-sm text-muted-foreground">Real-time data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{estimatedCost.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">@₹8.00/kWh</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Peak Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(peakUsage / 1000).toFixed(1)} kW</div>
            <p className="text-sm text-muted-foreground">Maximum power today</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Connected Devices</h2>
          <p className="text-muted-foreground">Your smart energy meters and sensors</p>
        </div>
        
        {devices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{device.name}</CardTitle>
                        <CardDescription className="text-xs">ID: {device.meterId}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {device.status === 'online' ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-600" />
                      )}
                      <Badge variant={device.status === 'online' ? 'secondary' : 'destructive'} className="text-xs">
                        {device.status.toUpperCase()}
                      </Badge>
                    </div>
                    {device.batteryLevel !== undefined && (
                      <div className="text-sm font-medium">
                        {device.batteryLevel}% <span className="text-muted-foreground">battery</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{device.location}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Firmware: v{device.firmwareVersion}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-muted-foreground">No devices added yet</p>
              <p className="text-sm text-muted-foreground">Go to Devices page to add your first smart meter</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}