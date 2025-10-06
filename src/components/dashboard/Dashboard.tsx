import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnergyCard from './EnergyCard';
import RealTimeChart from '../charts/RealTimeChart';
import { Zap, Activity, Gauge, Battery, Wifi, WifiOff, Clock } from 'lucide-react';
import { database } from '@/lib/firebase';
import { onValue, query, ref, limitToLast, orderByKey } from 'firebase/database';

interface EnergyData {
  irms: number;
  vrms: number;
  power: number;
  energy: number;
  timestamp: string;
}

export default function Dashboard() {
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

  // Subscribe to Firebase Realtime Database for live data
  useEffect(() => {
    const dataRef = ref(database, 'SmartMeter/data');
    const q = query(dataRef, orderByKey(), limitToLast(50));
    const unsub = onValue(q, (snapshot) => {
      const val = snapshot.val() as Record<string, any> | null;
      if (!val) return;

      const entries = Object.entries(val)
        .sort((a, b) => {
          const ak = Number(a[0]);
          const bk = Number(b[0]);
          if (!Number.isNaN(ak) && !Number.isNaN(bk)) return ak - bk;
          // Fallback to string compare
          return a[0].localeCompare(b[0]);
        })
        .map(([key, item]) => {
          const irms = parseFloat(item?.Irms ?? item?.irms ?? '0');
          const vrms = parseFloat(item?.Vrms ?? item?.vrms ?? '0');
          const power = parseFloat(item?.Power ?? item?.power ?? '0');
          const energy = parseFloat(item?.kWh ?? item?.energy ?? '0');
          const ts = !Number.isNaN(Number(key)) ? new Date(Number(key)) : new Date();
          const dataPoint: EnergyData = {
            irms: Number.isFinite(irms) ? irms : 0,
            vrms: Number.isFinite(vrms) ? vrms : 0,
            power: Number.isFinite(power) ? power : 0,
            energy: Number.isFinite(energy) ? energy : 0,
            timestamp: ts.toISOString(),
          };
          return dataPoint;
        });

      if (entries.length > 0) {
        const latest = entries[entries.length - 1];
        setCurrentData(latest);
        setHistoricalData(entries);
        setLastUpdate(new Date(latest.timestamp));
        setIsOnline(true);
      }
    }, () => {
      setIsOnline(false);
    });

    return () => unsub();
  }, []);

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
            <div className="text-2xl font-bold">24.7 kWh</div>
            <p className="text-sm text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹197.60</div>
            <p className="text-sm text-muted-foreground">@₹8.00/kWh</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Peak Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2 kW</div>
            <p className="text-sm text-muted-foreground">at 2:30 PM</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}