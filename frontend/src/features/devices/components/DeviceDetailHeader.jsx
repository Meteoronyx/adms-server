import { Badge } from '../../../components/ui/Badge';
import StatusBadge from '../../../components/StatusBadge';
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  Trash2,
  Info,
  HardDrive,
} from 'lucide-react';

export function DeviceDetailHeader({
  device,
  sn,
  onBack,
  onEditName,
  onVerify,
  onUnverify,
  onReupload,
  onReboot,
  onClearLog,
  onRequestInfo,
}) {
  if (!device) return null;

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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {device.device_name || `Perangkat ${sn}`}
              </h1>
              <button
                onClick={onEditName}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                title="Ubah Nama Perangkat"
              >
                <Pencil size={14} />
              </button>
            </div>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
              SN: {sn} {device.ip ? `| IP: ${device.ip}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={device.status} />
          {device.is_verified ? (
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

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {device.is_verified ? (
            <button
              onClick={onUnverify}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors border border-rose-200/60 dark:border-rose-800/60"
            >
              <XCircle size={14} />
              Cabut Verifikasi
            </button>
          ) : (
            <button
              onClick={onVerify}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors border border-emerald-200/60 dark:border-emerald-800/60"
            >
              <CheckCircle2 size={14} />
              Verifikasi Perangkat
            </button>
          )}

          <button
            onClick={onReupload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors border border-indigo-200/60 dark:border-indigo-800/60"
          >
            <RefreshCw size={14} />
            Reupload Data
          </button>

          <button
            onClick={onRequestInfo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700/60"
          >
            <Info size={14} />
            Minta Info
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearLog}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition-colors border border-amber-200/60 dark:border-amber-800/60"
          >
            <Trash2 size={14} />
            Clear Log
          </button>

          <button
            onClick={onReboot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors border border-rose-200/60 dark:border-rose-800/60"
          >
            <Power size={14} />
            Reboot
          </button>
        </div>
      </div>
    </div>
  );
}
