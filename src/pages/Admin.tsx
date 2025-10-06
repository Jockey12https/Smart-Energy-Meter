import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Shield, Activity, Database, Trash2, UserCheck, UserX, Zap, Gauge } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onValue, query, ref, orderByKey, limitToLast } from 'firebase/database';
import { database } from '@/lib/firebase';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  lastLogin: string | null;
  assignedDevices: number;
  createdAt: string;
}

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [latestIrms, setLatestIrms] = useState<number>(0);
  const [latestVrms, setLatestVrms] = useState<number>(0);
  const [latestPower, setLatestPower] = useState<number>(0);
  const [latestEnergy, setLatestEnergy] = useState<number>(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: AdminUser[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const created = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
        const lastLogin = data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : (data.lastLoginAt ? new Date(data.lastLoginAt) : null);
        return {
          id: d.id,
          email: data.email ?? '',
          name: data.displayName ?? data.name ?? '',
          role: (data.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
          status: (data.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
          lastLogin: lastLogin ? lastLogin.toISOString() : null,
          assignedDevices: data.assignedDevices ?? 0,
          createdAt: created ? created.toISOString().slice(0, 10) : '-',
        };
      });
      setUsers(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const dataRef = ref(database, 'SmartMeter/data');
    const q = query(dataRef, orderByKey(), limitToLast(1));
    const unsub = onValue(q, (snapshot) => {
      const val = snapshot.val() as Record<string, any> | null;
      if (!val) return;
      const [_, v] = Object.entries(val)[0];
      const ir = parseFloat(v?.Irms ?? '0');
      const vr = parseFloat(v?.Vrms ?? '0');
      const pw = parseFloat(v?.Power ?? '0');
      const en = parseFloat(v?.kWh ?? '0');
      setLatestIrms(Number.isFinite(ir) ? ir : 0);
      setLatestVrms(Number.isFinite(vr) ? vr : 0);
      setLatestPower(Number.isFinite(pw) ? pw : 0);
      setLatestEnergy(Number.isFinite(en) ? en : 0);
    });
    return () => unsub();
  }, []);

  const toggleUserStatus = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const next = target.status === 'active' ? 'inactive' : 'active';
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: next } : u));
    await updateDoc(doc(db, 'users', id), { status: next });
  };

  const removeUser = (_id: string) => {
    // Client SDK cannot delete Firebase Auth users; implement only UI removal if needed.
  };

  const totalEnergyConsumption = 1247.8; // kWh
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalDevices = 8;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, devices, and system settings</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Shield className="w-3 h-3 mr-1" />
          Admin Access
        </Badge>
      </div>

      {/* Admin Live Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current (Irms)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestIrms.toFixed(2)} A</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voltage (Vrms)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestVrms.toFixed(2)} V</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Power / Energy</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(latestPower).toFixed(0)} W</div>
            <p className="text-xs text-muted-foreground">{latestEnergy.toFixed(3)} kWh</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name || user.email}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'User'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>
                      {user.status === 'active' ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.assignedDevices}</TableCell>
                  <TableCell className="text-sm">
                    {user.lastLogin === 'Never' ? 'Never' : new Date(user.lastLogin).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* System Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and user actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
              <Badge variant="secondary">INFO</Badge>
              <span>New user registered: jane.smith@example.com</span>
              <span className="text-muted-foreground ml-auto">2h ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Badge variant="default">ALERT</Badge>
              <span>High current detected on device SM001</span>
              <span className="text-muted-foreground ml-auto">4h ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Badge variant="secondary">INFO</Badge>
              <span>Device SM003 came back online</span>
              <span className="text-muted-foreground ml-auto">6h ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Badge variant="outline">SYSTEM</Badge>
              <span>Database backup completed successfully</span>
              <span className="text-muted-foreground ml-auto">12h ago</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Global system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Data Retention Period</Label>
                <p className="text-sm text-muted-foreground">How long to keep historical data</p>
              </div>
              <Select defaultValue="1year">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="2years">2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Default Tariff Rate</Label>
                <p className="text-sm text-muted-foreground">Default electricity rate (₹/kWh)</p>
              </div>
              <Input className="w-32" defaultValue="8.00" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Alert Cooldown</Label>
                <p className="text-sm text-muted-foreground">Minimum time between alerts (minutes)</p>
              </div>
              <Input className="w-32" defaultValue="15" />
            </div>
            
            <Button className="w-full">Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}