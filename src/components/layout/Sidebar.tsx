import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  BarChart3, 
  Bell, 
  Settings, 
  Users, 
  Zap, 
  LogOut,
  Moon,
  Sun,
  Cpu
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isAdminSession?: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, darkMode, setDarkMode }: SidebarProps) {
  const { logout, currentUser, currentRole } = useAuth();

  const menuItems: { id: string; label: string; icon: any; badge?: string }[] =
    currentRole === 'admin'
      ? [
          { id: 'admin', label: 'Admin Panel', icon: Users },
        ]
      : [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'alerts', label: 'Alerts', icon: Bell, badge: '3' },
          { id: 'devices', label: 'Devices', icon: Cpu },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Energy Monitor</h2>
            <p className="text-sm text-muted-foreground">Smart Meter</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
                {'badge' in item && item.badge ? (
                  <Badge variant="destructive" className="ml-auto">
                    {item.badge}
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              Dark Mode
            </>
          )}
        </Button>
        
        <div className="text-xs text-muted-foreground px-2">
          {currentUser?.email}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}