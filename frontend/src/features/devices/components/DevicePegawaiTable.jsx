import { Badge } from '../../../components/ui/Badge';
import {
  Search,
  Users,
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
    <div className="bg-white dark:bg-[#18192d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
            Daftar Pegawai({totalCount})
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-400">
            Daftar pegawai dan status sidik jari yang tersinkronisasi di mesin ini
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari PIN atau nama pegawai..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Memuat data pegawai...
          </div>
        ) : pegawai.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">Tidak ada data pegawai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">PIN</th>
                  <th className="px-4 py-3">Nama Pegawai</th>
                  <th className="px-4 py-3">Privilege</th>
                  <th className="px-4 py-3">Sidik Jari</th>
                  {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {pegawai.map((p) => (
                  <tr key={p.pin} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {p.pin}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {p.name || <span className="italic text-slate-400">Belum diisi</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={Number(p.privilege) === 14 ? 'warning' : 'neutral'}>
                        {Number(p.privilege) === 14 ? 'Admin Mesin' : 'User Normal'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.fingerprint_count > 0 ? (
                        <Badge variant="success" icon={Fingerprint}>
                          {p.fingerprint_count} Sidik Jari
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Kosong</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <DropdownMenu
                          trigger={
                            <button className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <MoreHorizontal size={16} />
                            </button>
                          }
                          items={[
                            ...(canWrite ? [
                              {
                                label: 'Edit User Mesin',
                                icon: Edit,
                                onClick: () => onOpenUpdateUser(p),
                              },
                            ] : []),
                            ...(canManageFingerprint ? [
                              {
                                label: 'Enroll Sidik Jari',
                                icon: Fingerprint,
                                onClick: () => onOpenEnroll(p),
                              },
                            ] : []),
                            ...(canExport ? [
                              {
                                label: 'Cetak Rekap Presensi',
                                icon: FileDown,
                                onClick: () => onExportPdf?.(p),
                              },
                            ] : []),
                            ...(canWrite ? [
                              { type: 'separator' },
                              {
                                label: 'Hapus dari Mesin',
                                icon: Trash2,
                                variant: 'danger',
                                onClick: () => onDeleteUser(p.pin),
                              },
                            ] : []),
                          ]}
                        />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
