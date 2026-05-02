import { useState } from 'react';
import { Clock, AlertTriangle, FileText, Shield, CheckCircle2, Wrench, AlertCircle, UserX, Server, HelpCircle } from 'lucide-react';

const CATEGORIES = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'HUMAN_ERROR', 'DEPENDENCY', 'UNKNOWN'];

const categoryIcons = {
  HARDWARE: Server,
  SOFTWARE: FileText,
  NETWORK: AlertTriangle,
  HUMAN_ERROR: UserX,
  DEPENDENCY: AlertCircle,
  UNKNOWN: HelpCircle,
};

export default function RCAForm({ incidentStartTime, onSubmit, loading }) {
  const [form, setForm] = useState({
    incident_start: incidentStartTime ? incidentStartTime.slice(0, 16) : '',
    incident_end: '',
    root_cause_category: '',
    fix_applied: '',
    prevention_steps: '',
  });

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const isValid =
    form.incident_start &&
    form.incident_end &&
    new Date(form.incident_end) >= new Date(form.incident_start) &&
    form.root_cause_category &&
    form.fix_applied.trim().length >= 20 &&
    form.prevention_steps.trim().length >= 20;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      ...form,
      incident_start: new Date(form.incident_start).toISOString(),
      incident_end: new Date(form.incident_end).toISOString(),
    });
  };

  const charCount = (text, min) => {
    const len = text.trim().length;
    return { len, met: len >= min };
  };

  const fix = charCount(form.fix_applied, 20);
  const prev = charCount(form.prevention_steps, 20);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
      {/* Time Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="flex flex-col gap-2">
          <label className="label text-[10px] sm:text-xs flex items-center gap-1.5" htmlFor="rca-start">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            Incident Start Time
          </label>
          <input
            id="rca-start"
            type="datetime-local"
            className="input-field text-sm"
            value={form.incident_start}
            onChange={(e) => update('incident_start', e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="label text-[10px] sm:text-xs flex items-center gap-1.5" htmlFor="rca-end">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            Incident End Time
          </label>
          <input
            id="rca-end"
            type="datetime-local"
            className="input-field text-sm"
            value={form.incident_end}
            min={form.incident_start}
            onChange={(e) => update('incident_end', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <label className="label text-[10px] sm:text-xs flex items-center gap-1.5" htmlFor="rca-category">
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
          Root Cause Classification
        </label>
        <select
          id="rca-category"
          className="input-field text-sm"
          value={form.root_cause_category}
          onChange={(e) => update('root_cause_category', e.target.value)}
          required
        >
          <option value="" disabled>Select Classification</option>
          {CATEGORIES.map((c) => {
            const CategoryIcon = categoryIcons[c];
            return (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            );
          })}
        </select>
        {form.root_cause_category && (
          <div className="flex items-center gap-2 text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {(() => {
              const CategoryIcon = categoryIcons[form.root_cause_category];
              return <CategoryIcon className="w-4 h-4" />;
            })()}
            <span>Selected: {form.root_cause_category.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>

      {/* Fix Applied */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0 text-[10px] sm:text-xs flex items-center gap-1.5" htmlFor="rca-fix">
            <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            Action Taken (Fix Applied)
          </label>
          <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-1 rounded" style={{ color: fix.met ? 'var(--color-success)' : 'var(--color-text-muted)', backgroundColor: fix.met ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg-tertiary)' }}>
            {fix.len} / 20 MIN
          </span>
        </div>
        <textarea
          id="rca-fix"
          className="input-field min-h-[100px] sm:min-h-[120px] resize-y font-mono text-xs sm:text-sm"
          placeholder="Detailed description of mitigation steps taken..."
          value={form.fix_applied}
          onChange={(e) => update('fix_applied', e.target.value)}
          required
        />
      </div>

      {/* Prevention Steps */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="label !mb-0 text-[10px] sm:text-xs flex items-center gap-1.5" htmlFor="rca-prevention">
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            Preventative Measures
          </label>
          <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-1 rounded" style={{ color: prev.met ? 'var(--color-success)' : 'var(--color-text-muted)', backgroundColor: prev.met ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg-tertiary)' }}>
            {prev.len} / 20 MIN
          </span>
        </div>
        <textarea
          id="rca-prevention"
          className="input-field min-h-[100px] sm:min-h-[120px] resize-y font-mono text-xs sm:text-sm"
          placeholder="Steps to ensure this incident does not recur..."
          value={form.prevention_steps}
          onChange={(e) => update('prevention_steps', e.target.value)}
          required
        />
      </div>

      {/* Submit */}
      <div className="pt-3 sm:pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="submit"
          disabled={!isValid || loading}
          className="btn btn-primary btn-press w-full text-xs sm:text-sm py-3 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit RCA and Close Incident</span>
            </>
          )}
        </button>
        {!isValid && !loading && (
          <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Complete all fields with minimum 20 characters for fix and prevention steps.
          </p>
        )}
      </div>
    </form>
  );
}
