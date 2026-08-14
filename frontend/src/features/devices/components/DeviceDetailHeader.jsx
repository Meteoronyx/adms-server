import { Badge } from '../../../components/ui/Badge';
import StatusBadge from '../../../components/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Users,
  HardDrive,
} from 'lucide-react';

export function DeviceDetailHeader({
  device,
  sn,
  pegawaiCount = 0,
  onBack,
}) {
  if (!device) return null;

  const infoItems = [
    {
      label: 'Status',
      icon: HardDrive,
      value: <StatusBadge status={device.status} />,
    },
    {
      label: 'Last Activity',
      icon: Clock,
      value: device.last_activity
        ? new Date(device.last_activity).toLocaleString('id-ID')
        : <span className="text-slate-400 italic">-</span>,
    },
    {
      label: 'IP Address',
      icon: Globe,
      value: device.ip_address
        ? <span className="font-mono">{device.ip_address}</span>
        : <span className="text-slate-400 italic">-</span>,
    },
    {
      label: 'Pegawai Terdaftar',
      icon: Users,
      value: <span className="font-semibold">{pegawaiCount}</span>,
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18192d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Kembali ke Daftar Perangkat"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {device.device_name || `Perangkat ${sn}`}
            </h1>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
              SN: {sn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {device.verified ? (
            <Badge variant="success" icon={CheckCircle2}>
              Verified
            </Badge>
          ) : (
            <Badge variant="warning" icon={XCircle}>
              Unverified
            </Badge>
          )}
        </div>
      </div>

      {/* Device Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {infoItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60"
          >
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
              <item.icon size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {item.label}
              </p>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
