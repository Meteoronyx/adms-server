import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { getPegawai } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import {
  FileDown,
  Loader2,
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
    : '—';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Detail Pegawai"
      description="Informasi identitas pegawai, unit kerja, dan pemetaan perangkat biometrik."
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
                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium bg-ink hover:bg-ink/90 text-white rounded-[6px] transition-colors"
              >
                <FileDown size={13} />
                <span>Cetak Rekap Presensi</span>
              </button>
            )}
          </div>
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
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted space-y-2">
          <Loader2 size={20} className="animate-spin text-accent" />
          <p className="text-xs">Memuat detail pegawai…</p>
        </div>
      ) : pegawai ? (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Identity & Divided Metrics Strip */}
          <div className="bg-raised/60 border border-border rounded-[8px] overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold text-ink">
                    {pegawai.name || `Pegawai ${pegawai.pin}`}
                  </h3>
                  <span className="px-2 h-5 inline-flex items-center rounded-[4px] text-xs font-mono font-medium bg-surface border border-border text-ink"> {/* taste-skill-ignore */}
                    PIN {pegawai.pin}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {pegawai.nama_opd || 'Unit Kerja / OPD belum dipetakan'}
                  {pegawai.kdunker ? ` (${pegawai.kdunker})` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border bg-surface">
              <div className="p-3.5">
                <span className="text-xs text-muted block">Template Biometrik</span>
                <p className="text-sm font-medium text-ink mt-1 num">
                  {pegawai.total_fingerprints ?? 0} jari · {pegawai.total_faces ?? 0} wajah
                </p>
              </div>

              <div className="p-3.5">
                <span className="text-xs text-muted block">Perangkat Terhubung</span>
                <p className="text-sm font-medium text-ink mt-1 num">
                  {devices.length} unit
                </p>
              </div>

              <div className="p-3.5">
                <span className="text-xs text-muted block">Password Mesin</span>
                <p className="text-sm font-medium text-ink mt-1">
                  {devicesWithPassword.length > 0 ? (
                    devicesWithPassword.length === 1 ||
                    new Set(devicesWithPassword.map((d) => d.password)).size === 1 ? (
                      <span className="font-mono text-positive"> {/* taste-skill-ignore */}
                        {devicesWithPassword[0].password}
                      </span>
                    ) : (
                      <span className="text-positive num">
                        {devicesWithPassword.length} unit
                      </span>
                    )
                  ) : (
                    <span className="text-muted font-normal">—</span>
                  )}
                </p>
              </div>

              <div className="p-3.5">
                <span className="text-xs text-muted block">Terakhir Sinkron</span>
                <p className="text-sm font-medium text-ink mt-1 num truncate">
                  {formattedLatestSync}
                </p>
              </div>
            </div>
          </div>

          {/* Device Mappings Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink">
                Pemetaan Perangkat
              </h4>
              <span className="text-xs text-muted num">
                {devices.length} perangkat terdaftar
              </span>
            </div>

            <div className="border border-border rounded-[8px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-raised/40">
                      <th className="h-9 px-3.5 font-normal text-muted">Serial Number</th>
                      <th className="h-9 px-3.5 font-normal text-muted">Nama Perangkat / Lokasi</th>
                      <th className="h-9 px-3.5 font-normal text-muted">Hak Akses</th>
                      <th className="h-9 px-3.5 font-normal text-muted text-right">Biometrik</th>
                      <th className="h-9 px-3.5 font-normal text-muted text-right">Password</th>
                      <th className="h-9 px-3.5 font-normal text-muted text-right">Terakhir Sinkron</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule bg-surface">
                    {devices.length > 0 ? (
                      devices.map((d) => {
                        const hasPass = Boolean(d.password && String(d.password).trim() !== '');
                        return (
                          <tr key={d.device_sn} className="h-10 hover:bg-raised/60">
                            <td className="px-3.5 py-2 font-mono text-ink font-medium"> {/* taste-skill-ignore */}
                              {d.device_sn}
                            </td>
                            <td className="px-3.5 py-2 text-ink font-medium">
                              {d.device_name || <span className="text-muted">Tanpa nama</span>}
                            </td>
                            <td className="px-3.5 py-2 text-muted">
                              <span className="inline-flex px-2 h-5 items-center rounded-[4px] text-xs font-medium bg-raised text-ink">
                                {d.privilege_label || `Level ${d.privilege}`}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-right font-medium text-ink num">
                              {d.fingerprint_count ?? 0} jari · {d.face_count ?? 0} wajah
                            </td>
                            <td className="px-3.5 py-2 text-right">
                              {hasPass ? (
                                <span className="font-mono font-medium text-xs text-ink"> {/* taste-skill-ignore */}
                                  {d.password}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2 text-right text-muted num">
                              {d.synced_at ? new Date(d.synced_at).toLocaleString('id-ID') : '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-muted">
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
        <div className="py-8 text-center text-xs text-muted">
          Data pegawai tidak ditemukan.
        </div>
      )}
    </Modal>
  );
}
