import { Badge } from '../../../components/ui/Badge';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Fingerprint,
  Trash2,
  FileDown,
} from 'lucide-react';
import { DropdownMenu } from '../../../components/ui/DropdownMenu';

export function DevicePegawaiTable({
  pegawai,
  totalCount,
  loading,
  search,
  setSearch,
  page,
  setPage,
  limit,
  onOpenUpdateUser,
  onOpenEnroll,
  onDeleteUser,
  onExportPdf,
  canWrite = false,
  canManageFingerprint = false,
  canExport = false,
}) {
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const canManage = canWrite || canManageFingerprint || canExport;

  return (
    <div className="space-y-3">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Pegawai di Perangkat ({Number(totalCount).toLocaleString('id-ID')})
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Daftar identitas dan template biometrik yang tersimpan pada mesin ini.
          </p>
        </div>

        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari PIN atau nama pegawai…"
            className="w-full h-8 pl-8 pr-3 text-xs bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-xs">
            Memuat data pegawai…
          </div>
        ) : pegawai.length === 0 ? (
          <div className="p-10 text-center text-muted">
            <p className="text-sm font-medium text-ink">Tidak ada data pegawai pada perangkat ini.</p>
            <p className="text-xs text-muted mt-1">Coba kata kunci pencarian lain atau sinkronisasikan data pegawai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-9 px-4 font-normal text-muted text-xs">PIN</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs">Nama Pegawai</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs">Hak Akses Mesin</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs text-right">Sidik Jari</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs text-right">Wajah</th>
                  {canManage && <th className="h-9 px-4 font-normal text-muted text-xs text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-ink">
                {pegawai.map((p) => (
                  <tr key={p.pin} className="h-12 hover:bg-raised/70 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-ink font-medium"> {/* taste-skill-ignore */}
                      {p.pin}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-sm">
                      {p.name || <span className="text-muted">Belum diisi</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={Number(p.privilege) === 14 ? 'warning' : 'neutral'}>
                        {Number(p.privilege) === 14 ? 'Admin Mesin' : 'Pengguna'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right num text-sm">
                      <span className={p.fingerprint_count > 0 ? 'text-ink font-medium' : 'text-muted'}>
                        {p.fingerprint_count || 0}
                      </span>
                      <span className="text-xs text-muted ml-1">jari</span>
                    </td>
                    <td className="px-4 py-2.5 text-right num text-sm">
                      <span className={p.face_count > 0 ? 'text-ink font-medium' : 'text-muted'}>
                        {p.face_count || 0}
                      </span>
                      <span className="text-xs text-muted ml-1">wajah</span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <DropdownMenu
                          trigger={
                            <button
                              type="button"
                              className="p-1.5 text-muted hover:text-ink rounded-[6px] hover:bg-raised transition-colors"
                              aria-label="Tindakan pegawai"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          }
                          items={[
                            ...(canWrite
                              ? [
                                  {
                                    label: 'Ubah User Mesin',
                                    icon: Edit,
                                    onClick: () => onOpenUpdateUser(p),
                                  },
                                ]
                              : []),
                            ...(canManageFingerprint
                              ? [
                                  {
                                    label: 'Enroll Sidik Jari',
                                    icon: Fingerprint,
                                    onClick: () => onOpenEnroll(p),
                                  },
                                ]
                              : []),
                            ...(canExport
                              ? [
                                  {
                                    label: 'Cetak Rekap Presensi',
                                    icon: FileDown,
                                    onClick: () => onExportPdf?.(p),
                                  },
                                ]
                              : []),
                            ...(canWrite
                              ? [
                                  { type: 'separator' },
                                  {
                                    label: 'Hapus dari Mesin',
                                    icon: Trash2,
                                    variant: 'danger',
                                    onClick: () => onDeleteUser(p.pin),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted num">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 transition-colors"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 transition-colors"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
