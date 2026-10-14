import { Modal } from '../../../components/ui/Modal';
import { getAttendancePhotoUrl } from '../../../lib/api';
import { format } from 'date-fns';
import {
  Camera,
  User,
  HardDrive,
  Building2,
  Clock,
  Download,
  Hash,
  ShieldCheck,
} from 'lucide-react';

export function AttendancePhotoModal({ open, onOpenChange, photo }) {
  if (!photo) return null;

  const photoId = photo.photo_id || photo.id;
  const imageUrl = photo.photo_url || (photoId ? getAttendancePhotoUrl(photoId) : '');
  const timestamp = photo.photo_time || photo.check_time;
  let formattedTime = '-';
  if (timestamp) {
    try {
      formattedTime = format(new Date(timestamp), 'dd MMM yyyy • HH:mm:ss');
    } catch {
      formattedTime = String(timestamp);
    }
  }

  const pegawaiName = photo.pegawai_name || `Pegawai #${photo.user_pin || photo.pin}`;
  const pin = photo.user_pin || photo.pin || '-';
  const deviceName = photo.device_name || photo.device_sn || photo.sn || '-';
  const deviceSn = photo.device_sn || photo.sn || '-';
  const opdName = photo.nama_opd || 'Unit Kerja OPD';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Snapshot Verifikasi Absensi"
      description="Tangkapan kamera mesin biometrik saat pegawai melakukan verifikasi kehadiran."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {imageUrl ? (
            <a
              href={imageUrl}
              download={`AttPhoto_${pin}_${deviceSn}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white rounded-xl transition-colors"
            >
              <Download size={14} />
              <span>Unduh Foto Asli</span>
            </a>
          ) : <div />}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70">
          <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={`Foto absensi ${pegawaiName}`} className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Camera size={28} />
                <span className="text-xs">Gambar tidak tersedia</span>
              </div>
            )}
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 text-white text-[11px] font-medium border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ADMS Push Verified</span>
            </div>
            {photo.file_size ? (
              <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/75 text-slate-200 text-[10px] font-mono border border-white/10">
                {(photo.file_size / 1024).toFixed(1)} KB
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <User size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Nama Pegawai</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{pegawaiName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Hash size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">PIN Pegawai</p>
              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{pin}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Waktu Tangkapan</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{formattedTime}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <HardDrive size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Perangkat ({deviceSn})</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{deviceName}</p>
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Building2 size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{opdName}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
              <ShieldCheck size={13} />
              <span>Local Disk</span>
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
