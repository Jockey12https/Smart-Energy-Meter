import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import Landing from '@/pages/Landing';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const Devices = lazy(() => import('@/pages/Devices'));
const Admin = lazy(() => import('@/pages/Admin'));
const Settings = lazy(() => import('@/pages/Settings'));
import AdminLogin from '@/components/auth/AdminLogin';

function AppContent() {
  const { currentUser, currentRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminGateOk, setAdminGateOk] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return <Landing />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (currentRole === 'admin') return <Admin />; // admin sees admin dashboard
        return <Dashboard />;
      case 'analytics':
        if (currentRole === 'admin') return <Admin />;
        return <Analytics />;
      case 'alerts':
        if (currentRole === 'admin') return <Admin />;
        return <Alerts />;
      case 'devices':
        if (currentRole === 'admin') return <Admin />;
        return <Devices />;
      case 'admin':
        if (currentRole !== 'admin') {
          return (
            <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
              Admin access required.
            </div>
          );
        }
        return <Admin />;
      case 'settings':
        if (currentRole === 'admin') return <Admin />;
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => { setActiveTab(tab); }}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isAdminSession={false}
        />
      </div>

      {/* Mobile Sheet Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden absolute top-3 left-3 z-40">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={(tab) => { setActiveTab(tab); setMobileOpen(false); }}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            isAdminSession={false}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar Spacer */}
        <div className="md:hidden h-12" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading...</div>}>
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <AppContent />
    </TooltipProvider>
  </AuthProvider>
);

export default App;