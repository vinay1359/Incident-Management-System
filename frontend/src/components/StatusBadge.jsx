import { AlertCircle, CheckCircle, Clock, XCircle, AlertTriangle, Flame, Shield, HelpCircle } from 'lucide-react';

const statusConfig = {
  open: {
    icon: AlertCircle,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    label: 'Open',
  },
  investigating: {
    icon: Clock,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'Investigating',
  },
  resolved: {
    icon: CheckCircle,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    label: 'Resolved',
  },
  closed: {
    icon: XCircle,
    color: '#71717a',
    bgColor: 'rgba(113, 113, 122, 0.1)',
    label: 'Closed',
  },
};

const severityConfig = {
  p0: {
    icon: Flame,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    label: 'P0',
  },
  p1: {
    icon: AlertTriangle,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    label: 'P1',
  },
  p2: {
    icon: Shield,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    label: 'P2',
  },
};

export function StatusBadge({ status, showLabel = true, size = 'md', pulse = false }) {
  const config = statusConfig[status?.toLowerCase()] || {
    icon: HelpCircle,
    color: 'var(--color-text-muted)',
    bgColor: 'var(--color-bg-tertiary)',
    label: status || 'Unknown',
  };

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${pulse ? 'animate-pulse-soft' : ''}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <Icon className={sizeClasses[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export function SeverityBadge({ severity, showLabel = true, size = 'md', pulse = false }) {
  const config = severityConfig[severity?.toLowerCase()] || {
    icon: HelpCircle,
    color: 'var(--color-text-muted)',
    bgColor: 'var(--color-bg-tertiary)',
    label: severity || 'Unknown',
  };

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${pulse ? 'animate-pulse-soft' : ''}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <Icon className={sizeClasses[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export function StatusDot({ status, size = 'md', glow = false }) {
  const config = statusConfig[status?.toLowerCase()] || { color: '#71717a' };
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${glow ? `glow-${status?.toLowerCase()}` : ''}`}
      style={{ backgroundColor: config.color }}
    />
  );
}
