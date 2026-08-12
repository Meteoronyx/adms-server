import { cn } from '../lib/utils';

const statusMap = {
  online: { label: 'Online', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  offline: { label: 'Offline', bg: 'bg-slate-100 text-slate-600 ring-slate-500/10', dot: 'bg-slate-400' },
  pending: { label: 'Pending', bg: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  executed: { label: 'Executed', bg: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  healthy: { label: 'Healthy', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  unhealthy: { label: 'Unhealthy', bg: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
};

export default function StatusBadge({ status, className }) {
  const state = statusMap[status?.toLowerCase()] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    dot: 'bg-slate-400',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', state.bg, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', state.dot)} />
      {state.label}
    </span>
  );
}
