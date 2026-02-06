import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, Plus, Settings, Trash2, Wifi, WifiOff, Activity, MapPin, Calendar, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  createdAt?: string;
  createdBy?: string;
}

import { endpoints } from '@/services/api';

export default function Devices() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    deviceId: ''
  });

  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const devicesCollection = collection(db, 'devices');
    const unsubscribe = onSnapshot(devicesCollection, (snapshot) => {
      const fetchedDevices: Device[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedDevices.push({
          id: doc.id,
          name: data.name || 'Unknown Device',
          meterId: data.deviceId || data.meterId || doc.id,
          location: data.location || 'Unknown',
          status: data.status || 'offline',
          lastSeen: data.lastSeen || new Date().toISOString(),
          firmwareVersion: data.firmwareVersion || '1.0.0',
          batteryLevel: data.batteryLevel || 100,
          assignedUser: data.assignedUser || data.userEmail || 'Unassigned',
          createdAt: data.createdAt,
          createdBy: data.createdBy
        });
      });

      setDevices(fetchedDevices);
      setIsLoading(false);
    }, (error) => {
      console.error('Realtime devices listener error:', error);
      toast({ title: 'Error', description: 'Failed to load devices in realtime', variant: 'destructive' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);


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

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.deviceId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const devicesCollection = collection(db, 'devices');
      
      const docRef = await addDoc(devicesCollection, {
        name: newDevice.name,
        deviceId: newDevice.deviceId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        status: 'offline',
        firmwareVersion: '2.1.4',
        batteryLevel: 100,
        lastSeen: new Date().toISOString(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.email || 'unknown'
      });

      const device: Device = {
        id: docRef.id,
        name: newDevice.name,
        meterId: newDevice.deviceId,
        location: currentUser.uid,
        status: 'offline',
        lastSeen: new Date().toISOString(),
        firmwareVersion: '2.1.4',
        batteryLevel: 100,
        assignedUser: currentUser.email,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.email
      };

      setDevices(prev => [...prev, device]);
      setNewDevice({ name: '', deviceId: '' });
      setIsAddDialogOpen(false);

      toast({
        title: "Success",
        description: "Device added successfully to Firestore",
      });
    } catch (error) {
      console.error("Failed to add device:", error);
      toast({
        title: "Error",
        description: "Failed to add device to Firestore",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'devices', id));
      setDevices(prev => prev.filter(device => device.id !== id));
      toast({
        title: "Success",
        description: "Device removed successfully",
      });
    } catch (error) {
      console.error("Failed to remove device:", error);
      toast({
        title: "Error",
        description: "Failed to remove device",
        variant: "destructive"
      });
    }
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
                Register a new smart energy meter to your account
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  placeholder="e.g., Living Room Meter"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-id">Device ID</Label>
                <Input
                  id="device-id"
                  placeholder="e.g., SM-001 or METER-A1"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                />
              </div>

              <div className="space-y-2 pt-2 pb-2 px-3 bg-muted rounded-md">
                <p className="text-sm font-medium">User Information (Auto-filled)</p>
                <div className="text-sm text-muted-foreground">
                  <p><span className="font-semibold">User ID:</span> {currentUser?.uid}</p>
                  <p><span className="font-semibold">Email:</span> {currentUser?.email}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleAddDevice} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLoading ? 'Adding...' : 'Add Device'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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

              {/* Removed Configure/View Data for DB-managed devices per UX requirement */}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}