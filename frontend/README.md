### Smart Energy Meter 

A sleek, responsive web app for real-time energy monitoring, analytics, alerts, and device management — powered by React, Vite, Firebase, and shadcn/ui.

[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=061A23)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20RTDB-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f)](#license)

---
[SMART ENERGY METER](https://smartenergy-meter.vercel.app/)

### ✨ Highlights
- Real-time meters: current, voltage, power, energy
- Email/password auth with roles: user and admin
- Admin panel: users list, status toggle
- Analytics, alerts, devices, settings
- Elegant UI with shadcn/ui + Radix primitives
- Mobile-optimized navbar and dialogs
- Fast by default: vendor chunking + lazy routes

---


### 🧱 Tech Stack
- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix)
- Firebase: Auth, Firestore, Realtime Database
- Recharts, Framer Motion

---

### 🚀 Quick Start
- Requirements: Node 18+, npm or pnpm

```bash
# install deps
npm install
# dev
npm run dev
# build
npm run build
# preview
npm run preview
```

---

### 🔐 Environment Variables
Create a .env in the project root (not committed). See .env.example.

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# optional: for admin login gating
VITE_ADMIN_PASSWORD=your_admin_password
```

```

---

### 🔧 Firebase Setup
- Authentication → Enable Email/Password
- Firestore → Create database (stores users)
- Realtime Database → Create database; expected path: SmartMeter/data
- Authentication → Settings → Authorized domains: add localhost and your deploy domain

---

### 📁 Project Structure
```text
src/
  components/
    layout/       # NavBar, Sidebar
    dashboard/    # Dashboard widgets
    auth/         # LoginForm, admin gate
    ui/           # shadcn components
  contexts/       # AuthContext (auth + roles)
  lib/            # firebase.ts (auth, db, database)
  pages/          # Landing, Admin, Analytics, Alerts, Devices, Settings
```

---

### ⚡ Performance
- Manual vendor chunks in vite.config.ts
  - vendor-react, vendor-firebase, vendor-ui, vendor-charts
- Route-level code splitting with React.lazy + Suspense
- Optionally lazy-load heavy components (e.g., charts) on-demand

---

### 🧪 Scripts
- dev: start Vite
- build: production build with chunking
- preview: preview build
- lint: ESLint on src

---

### 🌗 Theming
- Tailwind config in tailwind.config.ts
- Base styles in src/index.css
- Dark mode toggle supported globally

---

### 🚢 Deployment
- Any static host (Vercel, Netlify, Firebase Hosting)
- Build with npm run build, deploy dist/

---

### 🗺️ Roadmap Ideas
- Device provisioning and assignment
- Alert rules and notifications
- Historical analytics and export
- PWA mode + offline snapshot

---

### 🤝 Contributing
- Fork, branch, commit, PR
- Keep code readable; match existing style

---

### 📜 License
MIT. Use freely with attribution where appropriate.
