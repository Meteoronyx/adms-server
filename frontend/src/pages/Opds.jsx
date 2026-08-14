import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOpds } from '../features/opds/hooks/useOpds';
import { OpdModal } from '../features/opds/components/OpdModal';
import { DeleteOpdModal } from '../features/opds/components/DeleteOpdModal';
import { Badge } from '../components/ui/Badge';
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  MapPin,
  Globe,
  ChevronLeft,
  ChevronRight,
  Radius,
} from 'lucide-react';

export default function Opds() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('opds:write');
  const canDelete = hasPermission('opds:delete');

  const hook = useOpds();
  const [modal, setModal] = useState({ type: null, opd: null });

  const totalPages = Math.ceil(hook.total / hook.limit) || 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Manajemen Unit Kerja (OPD)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Master data OPD, koordinat geofencing, dan IP publik perangkat
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <button
              onClick={() => hook.autoMap()}
              disabled={hook.submitting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50 flex-shrink-0"
              title="Peta ulang perangkat, pengguna, dan pegawai ke OPD berdasarkan nama"
            >
              <RefreshCw size={14} className={hook.submitting ? 'animate-spin' : ''} />
              Auto-Map
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setModal({ type: 'create', opd: null })}
              className="flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all flex-shrink-0"
            >
              <Plus size={14} />
              <span>Tambah OPD</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#18192d] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={hook.searchInput}
            onChange={(e) => hook.setSearchInput(e.target.value)}
            placeholder="Cari kdunker atau nama OPD..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-400">
          {hook.total.toLocaleString('id-ID')} unit kerja
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#18192d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {hook.loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Memuat data OPD...
          </div>
        ) : hook.opds.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">Tidak ada OPD ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama Unit Kerja (OPD)</th>
                  <th className="px-4 py-3">Koordinat</th>
                  <th className="px-4 py-3">Radius</th>
                  <th className="px-4 py-3">IP Publik</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {hook.opds.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="indigo">{o.kdunker}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {o.nama_opd}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {o.latitude != null && o.longitude != null ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-[11px]">
                            {o.latitude}, {o.longitude}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {o.radius != null ? (
                        <span className="flex items-center gap-1">
                          <Radius size={12} className="text-slate-400" />
                          {o.radius} m
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {o.ip_public ? (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Globe size={12} className="text-slate-400" />
                          {o.ip_public}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && (
                          <button
                            onClick={() => setModal({ type: 'edit', opd: o })}
                            title="Edit OPD"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setModal({ type: 'delete', opd: o })}
                            title="Hapus OPD"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!hook.loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Halaman {hook.page} dari {totalPages} ({hook.total.toLocaleString('id-ID')} data)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => hook.setPage(Math.max(1, hook.page - 1))}
              disabled={hook.page === 1}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => hook.setPage(Math.min(totalPages, hook.page + 1))}
              disabled={hook.page === totalPages}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <OpdModal
        open={modal.type === 'create' || modal.type === 'edit'}
        onClose={() => setModal({ type: null, opd: null })}
        onSubmit={(data) =>
          modal.type === 'edit' && modal.opd
            ? hook.update(modal.opd.id, data)
            : hook.create(data)
        }
        opd={modal.type === 'edit' ? modal.opd : null}
        submitting={hook.submitting}
      />

      <DeleteOpdModal
        open={modal.type === 'delete'}
        onClose={() => setModal({ type: null, opd: null })}
        onSubmit={hook.remove}
        opd={modal.opd}
        submitting={hook.submitting}
      />
    </div>
  );
}
