import { useNavigate } from 'react-router-dom';
import { StatusBadge, SeverityBadge } from './StatusBadge.jsx';
import { Activity, ChevronRight, Zap, Server, Database, Layers, Clock, Wifi, Cpu, HardDrive } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function formatMTTR(s) {
  if (s == null) return null;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

const componentIcons = {
  server: Server,
  database: Database,
  service: Layers,
  network: Wifi,
  cpu: Cpu,
  storage: HardDrive,
};

export default function IncidentCard({ incident, index }) {
  const navigate = useNavigate();
  const IconComponent = componentIcons[incident.component_type?.toLowerCase()] || Activity;
  const isCritical = incident.severity === 'P0' && incident.status !== 'CLOSED';

  return (
    <div
      onClick={() => navigate(`/incidents/${incident.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/incidents/${incident.id}`)}
      className={`card card-hover card-interactive animate-fade-in-up p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer group ${isCritical ? 'border-l-4' : ''}`}
      style={{
        animationDelay: `${index * 50}ms`,
        borderLeftColor: isCritical ? '#ef4444' : undefined,
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Icon */}
        <div
          className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center shrink-0 transition-colors group-hover:scale-105"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <IconComponent className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <StatusBadge status={incident.status} showLabel={false} size="sm" />
            <h3 className="text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {incident.component_id}
            </h3>
            <SeverityBadge severity={incident.severity} size="sm" pulse={isCritical} />
          </div>

          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[10px] sm:text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span className="flex items-center gap-1">
              <IconComponent className="w-3 h-3 sm:hidden" />
              <span className="font-medium uppercase tracking-wide">{incident.component_type}</span>
            </span>
            <span className="hidden sm:inline text-[var(--color-border-hover)]">•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span className="font-mono">{incident.signal_count} signals</span>
            </span>
            <span className="hidden sm:inline text-[var(--color-border-hover)]">•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {timeAgo(incident.start_time)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 mt-1 sm:mt-0">
        {incident.mttr_seconds != null ? (
          <div className="text-left sm:text-right px-2 py-1 sm:px-3 sm:py-1.5 rounded-md" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>MTTR</span>
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--color-success)' }}>
              {formatMTTR(incident.mttr_seconds)}
            </span>
          </div>
        ) : (
          <div className="text-left sm:text-right px-2 py-1 sm:px-3 sm:py-1.5 rounded-md" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Status</span>
            <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--color-text-primary)' }}>
              {incident.status}
            </span>
          </div>
        )}

        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center transition-all duration-200 group-hover:border-[var(--color-text-primary)] group-hover:bg-[var(--color-text-primary)] shrink-0"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <ChevronRight
            className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>
      </div>
    </div>
  );
}
