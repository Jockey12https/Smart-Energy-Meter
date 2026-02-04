import React from 'react';
import NavBar from '@/components/layout/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Gauge, Activity, Shield } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50 dark:from-gray-950 dark:via-gray-925 dark:to-gray-900">
      <NavBar />

      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              Real-time energy monitoring for smarter savings
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              Track voltage, current, power, and consumption live. Get insights and optimize your usage.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#features">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">Explore Features</Button>
              </a>
              <a href="#how">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950">How it Works</Button>
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4" /> Live Data</div>
              <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Secure</div>
              <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Alerts</div>
            </div>
          </div>
          <div>
            <Card>
              <CardContent className="p-0 sm:p-0">
                {/* SVG Illustration */}
                <svg viewBox="0 0 600 360" className="w-full h-auto rounded-md">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#06b6d4"/>
                      <stop offset="100%" stopColor="#10b981"/>
                    </linearGradient>
                  </defs>
                  <rect width="600" height="360" fill="#0b1220"/>
                  <g transform="translate(30,30)">
                    <rect width="540" height="300" rx="14" fill="#0f172a" stroke="#1f2a44"/>
                    <text x="24" y="40" fill="#93c5fd" fontSize="16" fontWeight="600">Smart Energy Dashboard</text>
                    <g transform="translate(24,60)">
                      <rect width="160" height="90" rx="10" fill="#0b1220" stroke="#1f2a44"/>
                      <text x="14" y="28" fill="#a7f3d0" fontSize="12">Current (Irms)</text>
                      <text x="14" y="56" fill="#34d399" fontSize="22" fontWeight="700">12.4 A</text>
                    </g>
                    <g transform="translate(204,60)">
                      <rect width="160" height="90" rx="10" fill="#0b1220" stroke="#1f2a44"/>
                      <text x="14" y="28" fill="#bae6fd" fontSize="12">Voltage (Vrms)</text>
                      <text x="14" y="56" fill="#60a5fa" fontSize="22" fontWeight="700">229.8 V</text>
                    </g>
                    <g transform="translate(384,60)">
                      <rect width="132" height="90" rx="10" fill="#0b1220" stroke="#1f2a44"/>
                      <text x="14" y="28" fill="#fde68a" fontSize="12">Power</text>
                      <text x="14" y="56" fill="#f59e0b" fontSize="22" fontWeight="700">2.9 kW</text>
                    </g>
                    <g transform="translate(24,170)">
                      <rect width="492" height="120" rx="10" fill="#0b1220" stroke="#1f2a44"/>
                      {/* Simple chart */}
                      <polyline fill="none" stroke="url(#g1)" strokeWidth="3" points="0,90 40,80 80,70 120,84 160,60 200,66 240,52 280,58 320,44 360,52 400,40 440,46 480,34"/>
                      <line x1="0" y1="90" x2="492" y2="90" stroke="#1f2a44"/>
                    </g>
                  </g>
                </svg>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[{
            icon: <Gauge className="h-5 w-5" />, title: 'Accurate Metrics', sub: 'Irms, Vrms, Power, kWh'
          },{
            icon: <Activity className="h-5 w-5" />, title: 'Realtime Charts', sub: 'Smooth live visualizations'
          },{
            icon: <Zap className="h-5 w-5" />, title: 'Smart Alerts', sub: 'Threshold-based notifications'
          },{
            icon: <Shield className="h-5 w-5" />, title: 'Secure Access', sub: 'Role-based admin controls'
          }].map((f, i) => (
            <Card key={i} className="border bg-white/70 dark:bg-card/60 backdrop-blur">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <div className="font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            Install the meter, connect to Wi‑Fi, and view data in real-time. Admins manage users and devices; users see personalized dashboards.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 sm:py-16 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { name: 'Starter', price: 'Free', features: ['Realtime dashboard', 'Email support'] },
            { name: 'Pro', price: '₹499/mo', features: ['Analytics', 'Alerts', 'Priority support'] },
            { name: 'Enterprise', price: 'Contact', features: ['Custom SLAs', 'Dedicated support'] },
          ].map((p, idx) => (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="text-3xl font-bold mt-2">{p.price}</div>
                <ul className="mt-4 text-sm space-y-1 text-muted-foreground">
                  {p.features.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
                <Button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700">Get Started</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Smart Energy Meter
      </footer>
    </div>
  );
}


