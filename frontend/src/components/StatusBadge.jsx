import { cn } from '../lib/utils';

const statusMap = {
  online: {
    label: 'Online',
    bg: 'bg-[#dcfae5] text-[#04250e]',
    dot: 'bg-[#1e7b4f]',
  },
  offline: {
    label: 'Offline',
    bg: 'bg-[#e8eaed] text-[#353736]',
    dot: 'bg-[#686b6f]',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-[#fffbeb] text-[#92400e]',
    dot: 'bg-[#a86f0c]',
  },
  executed: {
    label: 'Executed',
    bg: 'bg-[#e3f1f4] text-[#124957]',
    dot: 'bg-[#1b6c80]',
  },
  success: {
    label: 'Success',
    bg: 'bg-[#dcfae5] text-[#04250e]',
    dot: 'bg-[#1e7b4f]',
  },
  failed: {
    label: 'Failed',
    bg: 'bg-[#ffedea] text-[#831c1e]',
    dot: 'bg-[#c4242a]',
  },
  healthy: {
    label: 'Healthy',
    bg: 'bg-[#dcfae5] text-[#04250e]',
    dot: 'bg-[#1e7b4f]',
  },
  unhealthy: {
    label: 'Unhealthy',
    bg: 'bg-[#ffedea] text-[#831c1e]',
    dot: 'bg-[#c4242a]',
  },
};

export default function StatusBadge({ status, className }) {
  const state = statusMap[status?.toLowerCase()] || {
    label: status || 'Unknown',
    bg: 'bg-[#e8eaed] text-[#353736]',
    dot: 'bg-[#686b6f]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] px-2 h-5 text-xs font-medium whitespace-nowrap flex-none',
        state.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', state.dot)} />
      {state.label}
    </span>
  );
}
