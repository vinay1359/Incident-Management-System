import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { ToastProvider } from './ToastContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IncidentDetail from './pages/IncidentDetail.jsx';
import { Activity, ChevronLeft, Github, Shield } from 'lucide-react';

function HeaderNav() {
  const location = useLocation();
  const isDetail = location.pathname.startsWith('/incidents/');

  return (
    <header className="border-b sticky top-0 z-50 backdrop-blur-md" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(var(--color-bg-primary-rgb, 250, 250, 250), 0.8)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 sm:gap-3 no-underline group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105" style={{ backgroundColor: 'var(--color-text-primary)' }}>
            <Activity className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              IMS
            </span>
            <span className="text-[10px] uppercase tracking-wider hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
              Incident Management
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {isDetail && (
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t py-10 sm:py-14 mt-16 sm:mt-24" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo & Description */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-text-primary)' }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight block" style={{ color: 'var(--color-text-primary)' }}>IMS Platform</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Signal ingestion & resolution tracking</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="text-center">
              <span className="text-lg font-bold block" style={{ color: 'var(--color-text-primary)' }}>99.9%</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Uptime</span>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold block" style={{ color: 'var(--color-text-primary)' }}>&lt;50ms</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Latency</span>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold block" style={{ color: 'var(--color-text-primary)' }}>24/7</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Monitoring</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            High-throughput signal ingestion and resolution tracking system.
          </p>
          <a
            href="#"
            className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Github className="w-3.5 h-3.5" />
            <span>Open Source</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <HeaderNav />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
