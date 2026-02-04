import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, AlertTriangle, CheckCircle, XCircle, Settings, Mail, Smartphone } from 'lucide-react';

interface AlertItem {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

import { endpoints } from '@/services/api';

// Mocks removed, will fetch from API
const mockAlerts: AlertItem[] = [];


export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [thresholds, setThresholds] = useState({
    maxCurrent: 12,
    minVoltage: 200,
    maxVoltage: 250,
    maxPower: 2500
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await endpoints.getAlerts();
        if (response.data && response.data.alerts) {
          const fetchedAlerts = Object.entries(response.data.alerts).map(([key, value]: [string, any]) => ({
            id: key,
            type: value.severity === 'high' ? 'critical' : value.severity === 'medium' ? 'warning' : 'info',
            title: value.message ? value.message.substring(0, 20) + '...' : 'Alert', // Simple title generation
            message: value.message,
            timestamp: value.timestamp,
            acknowledged: value.is_read
          }));
          setAlerts(fetchedAlerts as AlertItem[]);
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      }
    };

    fetchAlerts();
    // Poll every 10 seconds (optional, or use firebase listener directly if preferring realtime)
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);


  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
          <p className="text-muted-foreground">Monitor and manage your energy system alerts</p>
        </div>
        <Badge variant="destructive" className="text-sm self-start sm:self-auto">
          {alerts.filter(alert => !alert.acknowledged).length} Active
        </Badge>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Active Alerts</span>
          </CardTitle>
          <CardDescription>Recent alerts requiring your attention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.filter(alert => !alert.acknowledged).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p>No active alerts. Your system is running normally.</p>
            </div>
          ) : (
            alerts.filter(alert => !alert.acknowledged).map((alert) => (
              <Alert key={alert.id} className="border-l-4 border-l-red-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={getAlertVariant(alert.type)} className="text-xs">
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Previously acknowledged alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.filter(alert => alert.acknowledged).map((alert) => (
              <div key={alert.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{alert.title}</span>
                    <Badge variant="secondary" className="text-xs">Acknowledged</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threshold Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Alert Thresholds</span>
            </CardTitle>
            <CardDescription>Configure when alerts should be triggered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-current">Maximum Current (A)</Label>
              <Input
                id="max-current"
                type="number"
                value={thresholds.maxCurrent}
                onChange={(e) => setThresholds(prev => ({ ...prev, maxCurrent: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-voltage">Minimum Voltage (V)</Label>
              <Input
                id="min-voltage"
                type="number"
                value={thresholds.minVoltage}
                onChange={(e) => setThresholds(prev => ({ ...prev, minVoltage: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-voltage">Maximum Voltage (V)</Label>
              <Input
                id="max-voltage"
                type="number"
                value={thresholds.maxVoltage}
                onChange={(e) => setThresholds(prev => ({ ...prev, maxVoltage: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-power">Maximum Power (W)</Label>
              <Input
                id="max-power"
                type="number"
                value={thresholds.maxPower}
                onChange={(e) => setThresholds(prev => ({ ...prev, maxPower: Number(e.target.value) }))}
              />
            </div>

            <Button className="w-full">Save Thresholds</Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4" />
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-4 w-4" />
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push notifications</p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-4 w-4" />
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Critical alerts via SMS</p>
                </div>
              </div>
              <Switch
                id="sms-notifications"
                checked={notifications.sms}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms: checked }))}
              />
            </div>

            <Button className="w-full">Save Preferences</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}