import React, { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import Landing from '@/pages/Landing';
import Sidebar from '@/components/layout/Sidebar';
import Dashboard from '@/components/dashboard/Dashboard';
import Analytics from '@/pages/Analytics';
import Alerts from '@/pages/Alerts';
import Devices from '@/pages/Devices';
import Admin from '@/pages/Admin';
import Settings from '@/pages/Settings';
import AdminLogin from '@/components/auth/AdminLogin';

function AppContent() {
  const { currentUser, currentRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminGateOk, setAdminGateOk] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState(false);

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
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isAdminSession={false}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
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