import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { getPegawai } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import {
  User,
  Fingerprint,
  HardDrive,
  Building2,
  FileDown,
  Loader2,
  KeyRound,
  CalendarClock,
  CheckCircle2,
  Minus,
} from 'lucide-react';

export function PegawaiDetailModal({
  open,
  onOpenChange,
  pin,
  onExport,
}) {
  const [pegawai, setPegawai] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { hasPermission } = useAuth();

  useEffect(() => {
    if (open && pin) {
      setLoading(true);
      setPegawai(null);
      getPegawai(pin)
        .then((res) => {
          setPegawai(res.pegawai);
        })
        .catch((err) => {
          addToast(err.message || 'Gagal memuat detail pegawai', 'error');
          onOpenChange(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!open) {
      setPegawai(null);
    }
  }, [open, pin, addToast, onOpenChange]);

  // Compute password & sync metrics
  const devices = pegawai?.devices || [];
  const devicesWithPassword = devices.filter(
    (d) => d.password && String(d.password).trim() !== ''
  );

  const latestSyncDate = devices.reduce((latest, d) => {
    if (!d.synced_at) return latest;
    if (!latest) return d.synced_at;
    return new Date(d.synced_at) > new Date(latest) ? d.synced_at : latest;
  }, pegawai?.updated_at || pegawai?.created_at || null);

  const formattedLatestSync = latestSyncDate
    ? new Date(latestSyncDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : '-';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Detail Pegawai"
      description="Informasi profil pegawai, unit kerja, dan pemetaan perangkat biometrik."
      size="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {hasPermission('attendance:export') && pegawai && (
              <button
                type="button"
                onClick={() => {
                  if (onExport) onExport(pegawai);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors active:scale-[0.98]"
              >
                <FileDown size={14} />
                <span>Cetak Rekap Presensi</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
          <p className="text-xs">Memuat detail pegawai...</p>
        </div>
      ) : pegawai ? (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Profile Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
                <User size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {pegawai.name || `Pegawai ${pegawai.pin}`}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    PIN: {pegawai.pin}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <Building2 size={13} className="shrink-0 text-slate-400" />
                  <span className="truncate">{pegawai.nama_opd || 'Unit Kerja / OPD Belum Terikat'}</span>
                  {pegawai.kdunker && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                      {pegawai.kdunker}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Fingerprint size={12} />
                  <span>Total Fingerprints</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {pegawai.total_fingerprints ?? 0}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <HardDrive size={12} />
                  <span>Perangkat Terhubung</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {devices.length} mesin
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <KeyRound size={12} />
                  <span>Password Mesin</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {devicesWithPassword.length > 0 ? (
                    devicesWithPassword.length === 1 || new Set(devicesWithPassword.map((d) => d.password)).size === 1 ? (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {devicesWithPassword[0].password}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {devicesWithPassword.length} Mesin
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 font-normal">Tidak Ada</span>
                  )}
                </p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <CalendarClock size={12} />
                  <span>Terakhir Sinkron</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {formattedLatestSync}
                </p>
              </div>
            </div>
          </div>

          {/* Device Mappings Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive size={13} className="text-indigo-500" />
                <span>Pemetaan</span>
              </h4>
              <span className="text-xs text-slate-400">
                {devices.length} perangkat terdaftar
              </span>
            </div>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs divide-y divide-slate-200/80 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5">Device SN</th>
                      <th className="px-3.5 py-2.5">Nama Perangkat / Lokasi</th>
                      <th className="px-3.5 py-2.5">Hak Akses</th>
                      <th className="px-3.5 py-2.5 text-center">Fingerprints</th>
                      <th className="px-3.5 py-2.5 text-center">Password</th>
                      <th className="px-3.5 py-2.5">Terakhir Sinkron</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {devices.length > 0 ? (
                      devices.map((d) => {
                        const hasPass = Boolean(d.password && String(d.password).trim() !== '');
                        return (
                          <tr key={d.device_sn} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-3.5 py-2.5 font-mono text-slate-700 dark:text-slate-300 font-medium">
                              {d.device_sn}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-900 dark:text-slate-100 font-medium">
                              {d.device_name || <span className="text-slate-400 italic">Tanpa Nama</span>}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                              <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                                {d.privilege_label || `Level ${d.privilege}`}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">
                              {d.fingerprint_count ?? 0}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              {hasPass ? (
                                <span className="inline-flex items-center font-mono font-semibold px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                                  {d.password}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-slate-400 text-xs">
                                  <Minus size={13} />
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
                              {d.synced_at ? new Date(d.synced_at).toLocaleString('id-ID') : '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                          Belum ada data sinkronisasi mesin untuk pegawai ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">
          Data pegawai tidak ditemukan.
        </div>
      )}
    </Modal>
  );
}
