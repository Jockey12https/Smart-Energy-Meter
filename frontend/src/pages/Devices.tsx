import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, Plus, Settings, Trash2, Wifi, WifiOff, Activity, MapPin, Calendar, Fingerprint, RefreshCcw } from 'lucide-react';
import { database } from '@/lib/firebase';
import { onValue, query, ref, orderByKey, limitToLast } from 'firebase/database';
import { useAuth } from '@/contexts/AuthContext';

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
  isAIVerified?: boolean;
}

import { endpoints } from '@/services/api';

// Mocks removed, will fetch from API
const mockDevices: Device[] = [];

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    meterId: '',
    location: '',
    assignedUser: ''
  });

  const { currentUser } = useAuth();
  const [identifying, setIdentifying] = useState(false);
  const [identResults, setIdentResults] = useState<number[]>([]);

  const runIdentification = async () => {
    if (!currentUser?.uid) return;
    setIdentifying(true);
    try {
      const response = await (endpoints as any).triggerIdentification(currentUser.uid);

      if (response.data && response.data.identified_device_states) {
        const states = response.data.identified_device_states; // This is a 2D array from model: [[1, 0, 1]]
        const bits = states[0]; // [1, 0, 1]
        setIdentResults(bits);

        const bitNames = ['12w', '15w', '7w'];

        setDevices(prevDevices =>
          prevDevices.map(device => {
            const deviceNameLower = device.name.toLowerCase();
            const bitIndex = bitNames.findIndex(pattern => deviceNameLower.includes(pattern));

            if (bitIndex !== -1) {
              return {
                ...device,
                status: bits[bitIndex] ? 'online' : 'offline',
                isAIVerified: true
              };
            }
            return device;
          })
        );
      } else {
        console.warn("Identification returned no states:", response.data);
        // If message is "Data is stale" or "No data found", we might want to reset to offline
        if (response.data?.message?.includes("stale") || response.data?.message?.includes("No data")) {
          setIdentResults([0, 0, 0]);
        }
      }
    } catch (error) {
      console.error("Identification failed:", error);
    } finally {
      setIdentifying(false);
    }
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await endpoints.getDevices();
        if (response.data && response.data.devices) {
          setDevices(prevDevices => {
            const fetchedDevices = Object.entries(response.data.devices).map(([key, value]: [string, any]) => {
              const deviceId = value.deviceId || key;
              const existingDevice = prevDevices.find(d => d.id === key || d.meterId === deviceId);

              return {
                id: key,
                name: value.name || 'Unknown Device',
                meterId: deviceId,
                location: value.location || 'Unknown',
                // Preserve AI status if available, else use Firestore status
                status: existingDevice?.isAIVerified
                  ? existingDevice.status
                  : ((value.status === 'online' || value.is_active) ? 'online' : 'offline'),
                lastSeen: value.lastSeen || value.last_active || new Date().toISOString(),
                firmwareVersion: value.firmwareVersion || value.firmware || '1.0.0',
                batteryLevel: value.batteryLevel || value.battery || 100,
                assignedUser: value.userEmail || value.assigned_user || 'Unassigned',
                isAIVerified: existingDevice?.isAIVerified || false
              };
            });
            return fetchedDevices as Device[];
          });
        }
      } catch (error) {
        console.error("Failed to fetch devices:", error);
      }
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Settings className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'online':
        return 'secondary' as const;
      case 'offline':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleAddDevice = () => {
    const device: Device = {
      id: Date.now().toString(),
      name: newDevice.name,
      meterId: newDevice.meterId,
      location: newDevice.location,
      status: 'offline',
      lastSeen: new Date().toISOString(),
      firmwareVersion: '2.1.4',
      batteryLevel: 100,
      assignedUser: newDevice.assignedUser
    };

    setDevices(prev => [...prev, device]);
    setNewDevice({ name: '', meterId: '', location: '', assignedUser: '' });
    setIsAddDialogOpen(false);
  };

  const handleRemoveDevice = (id: string) => {
    setDevices(prev => prev.filter(device => device.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Device Management</h1>
          <p className="text-muted-foreground">Monitor and manage your smart energy meters</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Register a new smart energy meter to your system
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  placeholder="e.g., Main Meter - Living Room"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meter-id">Meter ID</Label>
                <Input
                  id="meter-id"
                  placeholder="e.g., SM004"
                  value={newDevice.meterId}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, meterId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A - Floor 2"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned-user">Assigned User</Label>
                <Input
                  id="assigned-user"
                  placeholder="user@example.com"
                  value={newDevice.assignedUser}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, assignedUser: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDevice}>Add Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Identification Section */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-full">
                <Fingerprint className="w-5 h-5 text-blue-700 dark:text-blue-200" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Device Signature Identification</CardTitle>
                <CardDescription>
                  XGBoost NILM Model Analysis
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={runIdentification}
              disabled={identifying}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {identifying ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              {identifying ? "Analyzing..." : "Identify Active Loads"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {identResults.length > 0 ? (
              identResults.map((isOn, index) => {
                const deviceNames = ['Bulb 12W', 'Bulb 15W', 'Bulb 7W'];
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm">
                    <span className="text-sm font-semibold">{deviceNames[index] || `Load ${index + 1}`}</span>
                    <Badge className={isOn
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 border-transparent'}
                    >
                      {isOn ? 'ACTIVE' : 'OFF'}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full border-2 border-dashed border-blue-100 dark:border-blue-900/30 rounded-xl py-8 text-center bg-white/50 dark:bg-slate-900/50">
                <Activity className="w-8 h-8 text-blue-200 dark:text-blue-900 mx-auto mb-2" />
                <p className="text-sm text-blue-400 dark:text-blue-600 font-medium">Click "Identify Active Loads" to scan for running appliances</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Device Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {devices.filter(d => d.status === 'online').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {devices.filter(d => d.status === 'offline').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {devices.filter(d => d.status === 'maintenance').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <span>ID: {device.meterId}</span>
                      <Badge variant={getStatusVariant(device.status)} className="text-xs">
                        {getStatusIcon(device.status)}
                        <span className="ml-1">{device.status.toUpperCase()}</span>
                      </Badge>
                      {device.isAIVerified && (
                        <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50 py-0 h-5">
                          <Fingerprint className="w-3 h-3 mr-1" />
                          AI VERIFIED
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDevice(device.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{device.location}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(device.lastSeen).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Firmware: v{device.firmwareVersion}</span>
                {device.batteryLevel && (
                  <span className={`flex items-center space-x-1 ${getBatteryColor(device.batteryLevel)}`}>
                    <Activity className="h-4 w-4" />
                    <span>{device.batteryLevel}%</span>
                  </span>
                )}
              </div>

              {device.assignedUser && (
                <div className="text-sm text-muted-foreground">
                  Assigned to: {device.assignedUser}
                </div>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  View Data
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}