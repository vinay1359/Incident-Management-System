import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: { bg: 'bg-green-500', text: 'text-green-500' },
  error: { bg: 'bg-red-500', text: 'text-red-500' },
  info: { bg: 'bg-blue-500', text: 'text-blue-500' },
  warning: { bg: 'bg-amber-500', text: 'text-amber-500' },
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 sm:gap-3 max-w-[90vw] sm:max-w-sm">
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} index={index} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove, index }) {
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];

  return (
    <div
      className={`toast-enter flex items-start gap-3 p-3 sm:p-4 rounded-lg border shadow-lg min-w-[280px] sm:min-w-[320px] max-w-[90vw] sm:max-w-sm ${colors.bg}`}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className={`${colors.text} shrink-0 mt-0.5`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 rounded transition-colors hover:bg-[var(--color-bg-hover)]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
