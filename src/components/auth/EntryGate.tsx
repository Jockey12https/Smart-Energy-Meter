import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminLogin from '@/components/auth/AdminLogin';
import LoginForm from '@/components/auth/LoginForm';

interface EntryGateProps {
  onAdminGranted?: () => void;
}

export default function EntryGate({ onAdminGranted }: EntryGateProps) {
  const [mode, setMode] = useState<'choose' | 'user' | 'admin' | 'admin_authed'>('choose');

  if (mode === 'user') {
    return <LoginForm />;
  }

  if (mode === 'admin') {
    return (
      <AdminLogin onSuccess={() => {
        try { localStorage.setItem('admin_access_granted', 'true'); } catch {}
        onAdminGranted?.();
        setMode('admin_authed');
      }} />
    );
  }

  if (mode === 'admin_authed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Verified</CardTitle>
            <CardDescription>Now sign in with your admin account</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <div className="text-sm text-muted-foreground">After login, open the Admin tab from the sidebar.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Choose Role</CardTitle>
          <CardDescription>Continue as a user or verify admin access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Button className="h-24" onClick={() => setMode('user')}>User</Button>
            <Button className="h-24" variant="outline" onClick={() => setMode('admin')}>Admin</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


