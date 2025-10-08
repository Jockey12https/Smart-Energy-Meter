import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Zap, Menu } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="w-full fixed top-0 left-0 bg-background/70 backdrop-blur border-b z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-semibold tracking-tight text-base sm:text-lg">Smart Energy <span className="text-blue-600">Meter</span></span>
        </div>

        <div className="hidden sm:flex items-center space-x-6 text-sm">
          <a href="#features" className="hover:text-blue-600 font-medium">Features</a>
          <a href="#how" className="hover:text-blue-600 font-medium">How it works</a>
          <a href="#pricing" className="hover:text-blue-600 font-medium">Pricing</a>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Login</Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-sm max-h-[80vh] overflow-auto scrollbar-hide p-0 bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/40 shadow-2xl rounded-md data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95">
              <div className="p-5">
                <LoginForm />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="sm:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-sm max-h-[80vh] overflow-auto scrollbar-hide p-0 bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/40 shadow-2xl rounded-md data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95">
              <div className="p-5 space-y-4 text-sm">
                <a href="#features" className="block hover:text-blue-600" onClick={() => setOpen(false)}>Features</a>
                <a href="#how" className="block hover:text-blue-600" onClick={() => setOpen(false)}>How it works</a>
                <a href="#pricing" className="block hover:text-blue-600" onClick={() => setOpen(false)}>Pricing</a>
                <div className="pt-2">
                  <Button className="w-full" onClick={() => { setOpen(false); setLoginOpen(true); }}>Login</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Mobile Login Dialog */}
          <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
            <DialogContent className="w-[92vw] max-w-sm max-h-[80vh] overflow-auto scrollbar-hide p-0 bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/40 shadow-2xl rounded-md data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95">
              <div className="p-5">
                <LoginForm />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* dialogs render portals */}
    </div>
  );
}


