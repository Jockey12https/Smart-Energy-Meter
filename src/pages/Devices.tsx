import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, Plus, Settings, Trash2, Wifi, WifiOff, Activity, MapPin, Calendar } from 'lucide-react';

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

const mockDevices: Device[] = [
  {
    id: '1',
    name: 'Main Meter - Living Room',
    meterId: 'SM001',
    location: 'Building A - Floor 1',
    status: 'online',
    lastSeen: '2024-01-07 15:30:00',
    firmwareVersion: '2.1.4',
    batteryLevel: 85,
    assignedUser: 'john.doe@example.com'
  },
  {
    id: '2',
    name: 'Secondary Meter - Kitchen',
    meterId: 'SM002',
    location: 'Building A - Floor 1',
    status: 'online',
    lastSeen: '2024-01-07 15:28:00',
    firmwareVersion: '2.1.4',
    batteryLevel: 92,
    assignedUser: 'john.doe@example.com'
  },
  {
    id: '3',
    name: 'Backup Meter - Garage',
    meterId: 'SM003',
    location: 'Building A - Ground Floor',
    status: 'offline',
    lastSeen: '2024-01-07 10:15:00',
    firmwareVersion: '2.0.8',
    batteryLevel: 23,
    assignedUser: 'jane.smith@example.com'
  }
];

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    meterId: '',
    location: '',
    assignedUser: ''
  });

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