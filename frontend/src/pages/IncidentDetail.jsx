import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignalList from '../components/SignalList.jsx';
import RCAForm from '../components/RCAForm.jsx';
import { IncidentDetailSkeleton } from '../components/LoadingSkeleton.jsx';
import { StatusBadge, SeverityBadge, StatusDot } from '../components/StatusBadge.jsx';
import { useToast } from '../ToastContext.jsx';
import {
  ChevronLeft, Clock, Zap, Activity, Server, Database, Layers, Wifi,
  CheckCircle2, AlertCircle, AlertTriangle, FileText, ArrowRight, RotateCcw, Shield
} from 'lucide-react';

const STATUS_TRANSITIONS = {
  OPEN: ['INVESTIGATING'],
  INVESTIGATING: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

const TRANSITION_LABELS = {
  INVESTIGATING: 'Start Investigation',
  RESOLVED: 'Mark Resolved',
  CLOSED: 'Close Incident',
};

const componentIcons = {
  server: Server,
  database: Database,
  service: Layers,
  network: Wifi,
};

function StatusFlow({ currentStatus }) {
  const statuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
  const currentIndex = statuses.indexOf(currentStatus);

  const statusConfig = {
    OPEN: { icon: AlertCircle, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    INVESTIGATING: { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    RESOLVED: { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    CLOSED: { icon: CheckCircle2, color: '#71717a', bg: 'rgba(113, 113, 122, 0.1)' },
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {statuses.map((status, index) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={status} className="flex items-center">
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full transition-all duration-300 ${isCurrent ? 'ring-2 ring-offset-1' : ''}`}
              style={{
                backgroundColor: isCompleted ? config.bg : 'var(--color-bg-tertiary)',
                color: isCompleted ? config.color : 'var(--color-text-muted)',
                ringColor: isCurrent ? config.color : 'transparent',
              }}
            >
              <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isCurrent ? 'animate-pulse-soft' : ''}`} />
              <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wide ${isCurrent ? 'font-semibold' : ''}`}>
                {status}
              </span>
            </div>
            {index < statuses.length - 1 && (
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1" style={{ color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-border)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incident, setIncident] = useState(null);
  const [rca, setRca] = useState(null);
  const [rcaLoading, setRcaLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await axios.get(`/api/incidents/${id}`);
      setIncident(res.data);
    } catch (err) {
      toast.error('Failed to load incident details');
      // Don't clear existing incident data on error to prevent blank page
      if (!incident) {
        // Only set empty state if we never loaded data
        console.error('Incident fetch failed:', err);
      }
    }
  };

  const fetchRCA = async () => {
    try {
      const res = await axios.get(`/api/incidents/${id}/rca`);
      setRca(res.data);
    } catch { /* no RCA yet */ }
  };

  useEffect(() => {
    fetchIncident();
    fetchRCA();
  }, [id]);

  const handleTransition = async (targetStatus) => {
    setTransitioning(true);
    try {
      await axios.patch(`/api/incidents/${id}/status`, { target_status: targetStatus });
      await fetchIncident();
      await fetchRCA();
      toast.success(`Status updated to ${targetStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTransitioning(false);
    }
  };

  const handleRCASubmit = async (rcaData) => {
    setRcaLoading(true);
    try {
      // Submit RCA first
      await axios.post(`/api/incidents/${id}/rca`, rcaData);
      await fetchRCA();

      // Try to close the incident automatically
      try {
        await axios.patch(`/api/incidents/${id}/status`, { target_status: 'CLOSED' });
        toast.success('RCA submitted and incident closed');
      } catch (closeErr) {
        // If close fails, just show RCA submitted message
        toast.success('RCA submitted');
        console.log('Auto-close failed (may already be closed):', closeErr);
      }

      // Always refresh incident data after submission
      await fetchIncident();
    } catch (err) {
      toast.error('Failed to submit RCA');
      console.error('RCA submission error:', err);
    } finally {
      setRcaLoading(false);
    }
  };

  if (!incident) {
    return <IncidentDetailSkeleton />;
  }

  const validTransitions = STATUS_TRANSITIONS[incident.status] || [];
  const showRCAForm = incident.status === 'RESOLVED' && !rca;
  const IconComponent = componentIcons[incident.component_type?.toLowerCase()] || Activity;

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  const formatMTTR = (seconds) => {
    if (seconds == null) return '—';
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-20">

      {/* ── Left Column: Primary Content (65%) ────────────────────────────── */}
      <div className="lg:col-span-8 flex flex-col gap-8 sm:gap-12 order-2 lg:order-1">

        {/* Header Block */}
        <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mb-4 sm:mb-6 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-start gap-4">
            <div
              className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <IconComponent className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <SeverityBadge severity={incident.severity} pulse={incident.severity === 'P0' && incident.status !== 'CLOSED'} />
                <StatusBadge status={incident.status} />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-light tracking-tight break-all" style={{ color: 'var(--color-text-primary)' }}>
                {incident.component_id}
              </h1>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                {incident.component_type}
              </span>
            </div>
          </div>
        </div>

        {/* Status Flow Timeline */}
        <div className="animate-fade-in hidden sm:block" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Status Progression
            </span>
            {incident.status === 'CLOSED' && (
              <span className="text-xs" style={{ color: 'var(--color-success)' }}>
                Incident Resolved
              </span>
            )}
          </div>
          <div className="p-4 rounded-lg border overflow-x-auto" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
            <StatusFlow currentStatus={incident.status} />
          </div>
        </div>

        {/* Action / State Control - Mobile Optimized */}
        <div className="card p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 animate-fade-in" style={{ animationDelay: '150ms', backgroundColor: 'var(--color-bg-tertiary)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <StatusDot status={incident.status} size="lg" glow />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Current Status</span>
                <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--color-text-primary)' }}>{incident.status}</span>
              </div>
            </div>
            <button
              onClick={() => { fetchIncident(); fetchRCA(); toast.info('Refreshed'); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {validTransitions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {validTransitions.map((ts) => (
                <button
                  key={ts}
                  onClick={() => handleTransition(ts)}
                  disabled={transitioning || (ts === 'CLOSED' && !rca)}
                  className={`btn btn-press flex-1 sm:flex-none text-xs ${ts === 'CLOSED' ? 'btn-danger' : 'btn-primary'}`}
                  title={ts === 'CLOSED' && !rca ? 'RCA required before closing' : ''}
                >
                  {transitioning ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-transparent border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    TRANSITION_LABELS[ts]
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RCA Section */}
        {showRCAForm && (
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <div className="p-1.5 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <FileText className="w-4 h-4" style={{ color: '#f59e0b' }} />
              </div>
              <h2 className="text-base sm:text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Required: Root Cause Analysis
              </h2>
            </div>
            <div className="p-4 sm:p-5 rounded-lg border" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.03)' }}>
              <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Complete the RCA form below before closing this incident. This is required for compliance and future prevention.
              </p>
              <RCAForm incidentStartTime={incident.start_time} onSubmit={handleRCASubmit} loading={rcaLoading} />
            </div>
          </div>
        )}

        {rca && (
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <div className="p-1.5 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
              </div>
              <h2 className="text-base sm:text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Root Cause Analysis Record
              </h2>
            </div>
            <div className="card p-4 sm:p-5 space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <DetailItem icon={AlertCircle} label="Category" value={rca.root_cause_category?.replace(/_/g, ' ')} />
                <DetailItem icon={Clock} label="Incident Window" value={`${formatTime(rca.incident_start)} — ${formatTime(rca.incident_end)}`} />
              </div>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                  <span className="label !mb-0">Fix Applied</span>
                </div>
                <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}>{rca.fix_applied}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                  <span className="label !mb-0">Prevention Steps</span>
                </div>
                <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}>{rca.prevention_steps}</p>
              </div>
            </div>
          </div>
        )}

        {/* Signals */}
        <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
          <SignalList signals={incident.signals || []} />
        </div>
      </div>

      {/* ── Right Column: Telemetry & Details (35%) ────────────────────────────── */}
      <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-7 order-1 lg:order-2">
        {/* Mobile Quick Stats */}
        <div className="lg:hidden card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-primary)' }}>
              Quick Stats
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Signals</span>
              </div>
              <span className="text-xl font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>{incident.signal_count}</span>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: incident.mttr_seconds != null ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg-tertiary)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>MTTR</span>
              </div>
              <span className="text-xl font-mono font-semibold" style={{ color: incident.mttr_seconds != null ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                {formatMTTR(incident.mttr_seconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Telemetry */}
        <div className="hidden lg:block animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-primary)' }}>
              Telemetry Details
            </h3>
          </div>
          <div className="card space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Total Signals</span>
              </div>
              <span className="text-lg font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>{incident.signal_count}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: incident.mttr_seconds != null ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg-tertiary)' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: incident.mttr_seconds != null ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
                <span className="text-xs tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Incident MTTR</span>
              </div>
              <span className="text-lg font-mono font-semibold" style={{ color: incident.mttr_seconds != null ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                {formatMTTR(incident.mttr_seconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Clock className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-primary)' }}>
              Timeline
            </h3>
          </div>
          <div className="card space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <AlertCircle className="w-4 h-4" style={{ color: '#3b82f6' }} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>First Signal Detected</span>
                <span className="text-xs sm:text-sm font-mono mt-1 break-all" style={{ color: 'var(--color-text-primary)' }}>{formatTime(incident.start_time)}</span>
              </div>
            </div>
            <div className="pt-3 border-t flex items-start gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <Activity className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Last System Update</span>
                <span className="text-xs sm:text-sm font-mono mt-1 break-all" style={{ color: 'var(--color-text-primary)' }}>{formatTime(incident.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />}
        <span className="label !mb-0">{label}</span>
      </div>
      <span className="text-sm font-medium pl-5" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}
