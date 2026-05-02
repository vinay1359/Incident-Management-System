import { useState } from 'react';
import { SeverityBadge } from './StatusBadge.jsx';
import { FileText, ChevronDown, ChevronUp, Server, Database, Layers, Wifi, Activity, Download } from 'lucide-react';

const componentIcons = {
  server: Server,
  database: Database,
  service: Layers,
  network: Wifi,
};

export default function SignalList({ signals }) {
  const [expanded, setExpanded] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);

  if (!signals || signals.length === 0) {
    return (
      <div className="card p-8 sm:p-10 text-center animate-fade-in">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <FileText className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <h3 className="text-sm sm:text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          No Raw Signals
        </h3>
        <p className="text-xs sm:text-sm max-w-xs mx-auto" style={{ color: 'var(--color-text-muted)' }}>
          System has not indexed any signals for this incident yet.
        </p>
      </div>
    );
  }

  const displayed = signals.slice(0, visibleCount);
  const hasMore = visibleCount < signals.length;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
          <h2 className="text-base sm:text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Raw Signal Log
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
            {signals.length}
          </span>
        </div>
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all duration-200 hover:scale-105"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 sm:gap-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2 -mx-1 px-1">
          {displayed.map((sig, idx) => {
            const IconComponent = componentIcons[sig.component_type?.toLowerCase()] || Activity;
            return (
              <div
                key={idx}
                className="card card-hover p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 animate-fade-in"
                style={{
                  animationDelay: `${Math.min(idx * 15, 300)}ms`,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <SeverityBadge severity={sig.severity} showLabel={false} size="sm" />
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <IconComponent className="w-3.5 h-3.5" />
                      <span className="font-mono uppercase tracking-wide">{sig.component_type}</span>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-mono px-2 py-1 rounded" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                    {sig.timestamp ? new Date(sig.timestamp).toLocaleString() : '—'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-mono leading-relaxed break-all p-2.5 rounded-lg" style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {sig.message}
                </p>
                {sig.metadata && Object.keys(sig.metadata).length > 0 && (
                  <div className="mt-1">
                    <pre className="text-[10px] sm:text-xs font-mono p-2.5 sm:p-3 rounded-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                      {JSON.stringify(sig.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="btn btn-secondary btn-press text-xs mt-2 sm:mt-3 w-full py-3 flex items-center justify-center gap-2"
            >
              <span>Load More</span>
              <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                {signals.length - visibleCount}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
