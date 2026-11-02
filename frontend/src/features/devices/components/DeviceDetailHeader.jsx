import { Badge } from '../../../components/ui/Badge';
import StatusBadge from '../../../components/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export function DeviceDetailHeader({
  device,
  sn,
  pegawaiCount = 0,
  onBack,
}) {
  if (!device) return null;

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 inline-flex items-center justify-center text-muted hover:text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors"
            title="Kembali ke Daftar Perangkat"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold text-ink leading-tight">
              {device.device_name || `Perangkat ${sn}`}
            </h1>
            <p className="text-xs font-mono text-muted mt-0.5"> {/* taste-skill-ignore */}
              SN: {sn} {device.nama_opd ? `· ${device.nama_opd}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <StatusBadge status={device.status} />
          {device.verified ? (
            <Badge variant="success" icon={CheckCircle2}>
              Terverifikasi
            </Badge>
          ) : (
            <Badge variant="warning" icon={XCircle}>
              Belum Terverifikasi
            </Badge>
          )}
        </div>
      </div>

      {/* Divided Info Strip */}
      <div className="bg-surface border border-border rounded-[8px] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="px-5 py-3.5">
          <p className="text-xs text-muted">Status Koneksi</p>
          <div className="mt-1">
            <StatusBadge status={device.status} />
          </div>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs text-muted">Aktivitas Terakhir</p>
          <p className="text-sm font-medium text-ink mt-1 num">
            {device.last_activity
              ? new Date(device.last_activity).toLocaleString('id-ID')
              : '—'}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs text-muted">Alamat IP</p>
          <p className="text-sm font-mono font-medium text-ink mt-1 num"> {/* taste-skill-ignore */}
            {device.ip_address || '—'}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs text-muted">Pegawai Tersinkronisasi</p>
          <p className="text-sm font-medium text-ink mt-1 num">
            {Number(pegawaiCount).toLocaleString('id-ID')} <span className="text-xs text-muted font-normal">orang</span>
          </p>
        </div>
      </div>
    </div>
  );
}
