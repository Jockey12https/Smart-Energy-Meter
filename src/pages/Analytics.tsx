import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePickerWithRange from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { database } from '@/lib/firebase';
import { onValue, query, ref, orderByKey, limitToLast } from 'firebase/database';
import { useAuth } from '@/contexts/AuthContext';

type MeterSample = { irms: number; vrms: number; power: number; energy: number; ts: Date };

export default function Analytics() {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState('week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [samples, setSamples] = useState<MeterSample[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const dataRef = ref(database, `SmartMeter/${currentUser.uid}`);
    const q = query(dataRef, orderByKey(), limitToLast(1000));
    const unsub = onValue(q, (snapshot) => {
      const val = snapshot.val() as Record<string, any> | null;
      if (!val) return setSamples([]);
      const list = Object.entries(val).map(([timestamp, v]) => {
        const irms = parseFloat(v?.Irms ?? '0');
        const vrms = parseFloat(v?.Vrms ?? '0');
        const power = parseFloat(v?.Power ?? '0');
        const energy = parseFloat(v?.kWh ?? '0');
        
        // Parse timestamp format: 2025-10-11_12-45-10
        let ts: Date;
        try {
          // Convert 2025-10-11_12-45-10 to 2025-10-11T12:45:10
          const isoString = timestamp.replace(/_/g, 'T');
          ts = new Date(isoString);
          
          // If invalid date, use current time
          if (isNaN(ts.getTime())) {
            ts = new Date();
          }
        } catch {
          ts = new Date();
        }
        
        return {
          irms: Number.isFinite(irms) ? irms : 0,
          vrms: Number.isFinite(vrms) ? vrms : 0,
          power: Number.isFinite(power) ? power : 0,
          energy: Number.isFinite(energy) ? energy : 0,
          ts,
        } as MeterSample;
      }).sort((a, b) => a.ts.getTime() - b.ts.getTime());
      setSamples(list);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const dailyData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of samples) {
      const key = s.ts.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + s.energy);
    }
    return Array.from(byDay.entries()).map(([date, energy]) => ({ date, energy, cost: energy * 8 }));
  }, [samples]);

  const hourlyPattern = useMemo(() => {
    const byHour = new Map<string, number>();
    for (const s of samples) {
      const hh = s.ts.toTimeString().slice(0, 5);
      byHour.set(hh, (byHour.get(hh) ?? 0) + s.power / 1000);
    }
    return Array.from(byHour.entries()).map(([hour, usage]) => ({ hour, usage }));
  }, [samples]);

  const usageBreakdown = useMemo(() => {
    const totals = { Lighting: 0, HVAC: 0, Appliances: 0, Electronics: 0, Others: 0 } as Record<string, number>;
    for (const s of samples) {
      const p = s.power;
      if (p < 500) totals.Lighting += p; else if (p < 1500) totals.Electronics += p; else if (p < 2500) totals.Appliances += p; else totals.HVAC += p;
    }
    const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const colors = { Lighting: '#8884d8', HVAC: '#82ca9d', Appliances: '#ffc658', Electronics: '#ff7300', Others: '#00ff00' } as Record<string, string>;
    return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round((value / total) * 100), color: colors[name] }));
  }, [samples]);

  const handleExport = (format: 'csv' | 'pdf') => {
    // Simulate export functionality
    console.log(`Exporting data as ${format.toUpperCase()}`);
    alert(`Exporting data as ${format.toUpperCase()}... (Demo)`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">Energy Analytics</h1>
          <p className="text-muted-foreground">Detailed analysis of your energy consumption patterns</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyData.reduce((a, b) => a + b.energy, 0).toFixed(1)} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(dailyData.length ? (dailyData.reduce((a, b) => a + b.energy, 0) / dailyData.length) : 0).toFixed(1)} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">+5.2%</span> from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(dailyData.reduce((a, b) => a + b.cost, 0)).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-2.1%</span> from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(samples.reduce((m, s) => Math.max(m, s.power), 0) / 1000).toFixed(1)} kW</div>
            <p className="text-xs text-muted-foreground">
              Yesterday at 6:00 PM
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Consumption */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Energy Consumption</CardTitle>
            <CardDescription>Energy usage over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value} kWh`, 'Energy']}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="energy" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
            <CardDescription>Energy consumption by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usageBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Usage']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Pattern</CardTitle>
          <CardDescription>Average hourly consumption pattern</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyPattern}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value} kW`, 'Usage']} />
              <Line type="monotone" dataKey="usage" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Insights</CardTitle>
          <CardDescription>AI-powered recommendations for energy optimization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Badge variant="secondary" className="mt-1">Tip</Badge>
            <div>
              <p className="font-medium">Peak Usage Alert</p>
              <p className="text-sm text-muted-foreground">
                Your energy usage peaks between 6-8 PM. Consider shifting high-energy activities to off-peak hours to save costs.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Badge variant="secondary" className="mt-1">Insight</Badge>
            <div>
              <p className="font-medium">HVAC Optimization</p>
              <p className="text-sm text-muted-foreground">
                HVAC accounts for 35% of your energy usage. A 2°C temperature adjustment could save up to ₹300/month.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Badge variant="secondary" className="mt-1">Forecast</Badge>
            <div>
              <p className="font-medium">Monthly Projection</p>
              <p className="text-sm text-muted-foreground">
                Based on current usage patterns, your estimated monthly consumption is 800 kWh (₹6,400).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}