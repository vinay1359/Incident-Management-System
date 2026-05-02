import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import IncidentCard from '../components/IncidentCard.jsx';
import { DashboardSkeleton } from '../components/LoadingSkeleton.jsx';
import { Activity, Zap, AlertTriangle, TrendingUp, RefreshCw, Shield, CheckCircle2, BarChart3 } from 'lucide-react';

const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2 };
const SEVERITY_OPTIONS = ['ALL', 'P0', 'P1', 'P2'];
const STATUS_OPTIONS = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  useEffect(() => {
    let active = true;
    const fetchIncidents = async () => {
      try {
        const res = await axios.get('/api/incidents');
        if (!active) return;
        const sorted = [...res.data].sort((a, b) => {
          const sa = SEVERITY_ORDER[a.severity] ?? 99;
          const sb = SEVERITY_ORDER[b.severity] ?? 99;
          if (sa !== sb) return sa - sb;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setIncidents(sorted);
      } catch {
        // Silently handle error - no console output in production
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchHealth = async () => {
      try {
        const res = await axios.get('/health');
        if (active) setHealth(res.data);
      } catch { /* ignore */ }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const filtered = useMemo(() => {
    return incidents.filter(inc => {
      if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
      if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
      return true;
    });
  }, [incidents, filterSeverity, filterStatus]);

  const stats = useMemo(() => {
    const total = incidents.length;
    const active = incidents.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING').length;
    const p0Open = incidents.filter(i => i.severity === 'P0' && i.status !== 'CLOSED').length;
    const withMttr = incidents.filter(i => i.mttr_seconds != null);
    const avgMttr = withMttr.length > 0
      ? withMttr.reduce((sum, i) => sum + i.mttr_seconds, 0) / withMttr.length
      : null;
    return { total, active, p0Open, avgMttr };
  }, [incidents]);

  const formatMTTR = (seconds) => {
    if (seconds == null) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const hasActiveFilters = filterSeverity !== 'ALL' || filterStatus !== 'ALL';
  const allOperational = !loading && incidents.length === 0;
  const filteredEmpty = !loading && filtered.length === 0 && incidents.length > 0;

  return (
    <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">

      {/* ── Left Column: Incident Feed (65%) ────────────────────────────── */}
      <div className="lg:col-span-8 flex flex-col order-2 lg:order-1">
        <div className="mb-6 sm:mb-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <Activity className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Active Incidents
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Monitoring and resolution workflow for infrastructure signals.
            </p>
          </div>
          {!loading && (
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex rounded overflow-hidden border w-full sm:w-auto" style={{ borderColor: 'var(--color-border)' }}>
            {SEVERITY_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-semibold tracking-wider transition-colors"
                style={{
                  backgroundColor: filterSeverity === s ? 'var(--color-text-primary)' : 'transparent',
                  color: filterSeverity === s ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
                  borderRight: s !== 'P2' ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex rounded overflow-hidden border w-full sm:w-auto" style={{ borderColor: 'var(--color-border)' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="flex-1 sm:flex-none px-2 sm:px-4 py-2.5 sm:py-2 text-[10px] sm:text-xs font-semibold tracking-wider transition-colors"
                style={{
                  backgroundColor: filterStatus === s ? 'var(--color-text-primary)' : 'transparent',
                  color: filterStatus === s ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
                  borderRight: s !== 'CLOSED' ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4">
            {(filterSeverity !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                onClick={() => { setFilterSeverity('ALL'); setFilterStatus('ALL'); }}
                className="text-xs font-medium uppercase tracking-widest hover:underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Clear
              </button>
            )}

            <div className="text-xs font-mono sm:ml-auto" style={{ color: 'var(--color-text-muted)' }}>
              {filtered.length} / {incidents.length}
            </div>
          </div>
        </div>

        {/* Empty state - All Operational */}
        {allOperational && (
          <div className="py-20 sm:py-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center animate-scale-in" style={{ borderColor: 'var(--color-border)' }}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--color-success)' }} />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              All Systems Operational
            </h3>
            <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
              No active incidents detected. Infrastructure signals are within normal parameters.
            </p>
          </div>
        )}

        {/* Empty state - Filtered Results */}
        {filteredEmpty && (
          <div className="py-20 sm:py-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center animate-scale-in" style={{ borderColor: 'var(--color-border)' }}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No Matching Incidents
            </h3>
            <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              No incidents match your current filter criteria.
            </p>
            <button
              onClick={() => { setFilterSeverity('ALL'); setFilterStatus('ALL'); }}
              className="btn btn-secondary text-xs"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Incident list */}
        {filtered.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {filtered.map((incident, idx) => (
              <IncidentCard key={incident.id} incident={incident} index={idx} />
            ))}
          </div>
        )}
      </div>

      {/* ── Right Column: Info & Stats (35%) ────────────────────────────── */}
      <div className="lg:col-span-4 flex flex-col gap-6 sm:gap-10 order-1 lg:order-2">

        {/* System Health / Live Telemetry */}
        <div className="card p-4 sm:p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-primary)' }}>
                Live Telemetry
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse-soft" />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-success)' }}>
                Live
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {health ? (
              <>
                <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Throughput</span>
                  </div>
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {health.signals_per_sec}<span className="text-[10px] font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>/sec</span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    <span className="text-xs tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Queue Depth</span>
                  </div>
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {health.queue_depth}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                    <span className="text-xs tracking-wide" style={{ color: 'var(--color-text-muted)' }}>System Status</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-success)' }}>
                    ONLINE
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="w-4 h-4 border-2 border-transparent border-t-[var(--color-text-muted)] rounded-full animate-spin" />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Connecting to telemetry...</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics - Mobile Grid, Desktop Stack */}
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-primary)' }}>
              Current Metrics
            </h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-0 lg:flex lg:flex-col lg:border-t lg:border-r lg:border-b rounded-lg lg:rounded-none overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <div className="metric-card p-3 sm:p-4 lg:p-4 lg:px-6 border lg:border-l" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <span className="metric-label text-[10px] sm:text-xs">Total Tracked</span>
              </div>
              <span className="metric-value text-xl sm:text-2xl lg:text-[28px]">{stats.total}</span>
            </div>
            <div className="metric-card p-3 sm:p-4 lg:p-4 lg:px-6 border lg:border-t lg:border-l" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <span className="metric-label text-[10px] sm:text-xs">Active Investigating</span>
              </div>
              <span className="metric-value text-xl sm:text-2xl lg:text-[28px]">{stats.active}</span>
            </div>
            <div className="metric-card p-3 sm:p-4 lg:p-4 lg:px-6 border lg:border-t lg:border-l" style={{ borderColor: 'var(--color-border)', backgroundColor: stats.p0Open > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3" style={{ color: stats.p0Open > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
                <span className="metric-label text-[10px] sm:text-xs" style={{ color: stats.p0Open > 0 ? 'var(--color-danger)' : 'inherit' }}>
                  Critical (P0) Open
                </span>
              </div>
              <span className="metric-value text-xl sm:text-2xl lg:text-[28px]" style={{ color: stats.p0Open > 0 ? 'var(--color-danger)' : 'inherit' }}>
                {stats.p0Open}
              </span>
            </div>
            <div className="metric-card p-3 sm:p-4 lg:p-4 lg:px-6 border lg:border-t lg:border-l" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <span className="metric-label text-[10px] sm:text-xs">Global Avg MTTR</span>
              </div>
              <span className="metric-value font-mono text-xl sm:text-2xl lg:text-[28px]">{formatMTTR(stats.avgMttr)}</span>
            </div>
          </div>
        </div>

        {/* Info Block - Hidden on mobile, visible on lg */}
        <div className="hidden lg:block animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-primary)' }}>
              System Overview
            </h3>
          </div>
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              This system continuously ingests high-volume signals from the distributed stack.
              It performs real-time debouncing to prevent alert fatigue.
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
              <span>RCA protocol enforced before closure</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
