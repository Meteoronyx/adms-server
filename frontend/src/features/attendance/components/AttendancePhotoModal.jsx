import { Modal } from '../../../components/ui/Modal';
import { getAttendancePhotoUrl } from '../../../lib/api';
import { format } from 'date-fns';
import {
  Camera,
  Download,
  ShieldCheck,
} from 'lucide-react';

export function AttendancePhotoModal({ open, onOpenChange, photo }) {
  if (!photo) return null;

  const photoId = photo.photo_id || photo.id;
  const imageUrl = photo.photo_url || (photoId ? getAttendancePhotoUrl(photoId) : '');
  const timestamp = photo.photo_time || photo.check_time;
  let formattedTime = '—';
  if (timestamp) {
    try {
      formattedTime = format(new Date(timestamp), 'dd MMM yyyy · HH:mm:ss');
    } catch {
      formattedTime = String(timestamp);
    }
  }

  const pegawaiName = photo.pegawai_name || `Pegawai #${photo.user_pin || photo.pin}`;
  const pin = photo.user_pin || photo.pin || '—';
  const deviceName = photo.device_name || photo.device_sn || photo.sn || '—';
  const deviceSn = photo.device_sn || photo.sn || '—';
  const opdName = photo.nama_opd || 'Unit Kerja OPD';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tangkapan Kamera Verifikasi Presensi"
      description="Foto verifikasi biometrik saat pegawai melakukan presensi pada perangkat."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {imageUrl ? (
            <a
              href={imageUrl}
              download={`AttPhoto_${pin}_${deviceSn}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium bg-ink hover:bg-ink/90 text-white rounded-[6px] transition-colors"
            >
              <Download size={13} />
              <span>Unduh Foto Asli</span>
            </a>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-1.5 rounded-[8px] bg-raised border border-border">
          <div className="relative aspect-[4/3] w-full rounded-[6px] overflow-hidden bg-ink flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Foto absensi ${pegawaiName}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted">
                <Camera size={24} />
                <span className="text-xs">Gambar tidak tersedia</span>
              </div>
            )}
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2 h-5 rounded-[4px] bg-ink/80 text-white text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fc07a]" />
              <span>ADMS Terverifikasi</span>
            </div>
            {photo.file_size ? (
              <div className="absolute bottom-2.5 right-2.5 px-2 h-5 inline-flex items-center rounded-[4px] bg-ink/80 text-white text-xs font-mono num"> {/* taste-skill-ignore */}
                {(photo.file_size / 1024).toFixed(1)} KB
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-border text-xs">
            <div className="p-3">
              <span className="text-muted block">Nama Pegawai</span>
              <span className="font-medium text-ink mt-0.5 block truncate">{pegawaiName}</span>
            </div>
            <div className="p-3">
              <span className="text-muted block">PIN Pegawai</span>
              <span className="font-mono font-medium text-ink mt-0.5 block">{pin}</span> {/* taste-skill-ignore */}
            </div>
            <div className="p-3">
              <span className="text-muted block">Waktu Tangkapan</span>
              <span className="font-medium text-ink mt-0.5 block num">{formattedTime}</span>
            </div>
            <div className="p-3">
              <span className="text-muted block">Perangkat ({deviceSn})</span>
              <span className="font-medium text-ink mt-0.5 block truncate">{deviceName}</span>
            </div>
          </div>
          <div className="px-3 py-2 border-t border-rule bg-raised/50 flex items-center justify-between text-xs text-muted">
            <span className="truncate">{opdName}</span>
            <span className="inline-flex items-center gap-1 text-positive font-medium shrink-0">
              <ShieldCheck size={13} />
              <span>Tersimpan</span>
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
