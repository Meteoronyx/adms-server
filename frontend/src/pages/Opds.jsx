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
    <div className="space-y-5 fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink tracking-[-0.015em]">
            Manajemen Unit Kerja (OPD)
          </h1>
          <p className="text-[13px] text-muted mt-0.5">
            Master data OPD, koordinat geofencing, dan IP publik perangkat
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <button
              type="button"
              onClick={() => hook.autoMap()}
              disabled={hook.submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink bg-surface border border-border hover:bg-raised rounded-lg transition-colors disabled:opacity-50 shrink-0"
              title="Peta ulang perangkat, pengguna, dan pegawai ke OPD berdasarkan nama"
            >
              <RefreshCw size={13} className={hook.submitting ? 'animate-spin' : ''} />
              <span>Auto-Map</span>
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={() => setModal({ type: 'create', opd: null })}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors shrink-0"
            >
              <Plus size={14} />
              <span>Tambah OPD</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-raised/40">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
            <input
              type="text"
              value={hook.searchInput}
              onChange={(e) => hook.setSearchInput(e.target.value)}
              placeholder="Cari kode unker atau nama OPD..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink placeholder-faint transition-colors"
            />
          </div>
          <span className="text-xs text-muted num">
            {hook.total.toLocaleString('id-ID')} unit kerja
          </span>
        </div>

        {hook.loading ? (
          <div className="p-8 text-center text-muted text-xs">
            Memuat data OPD...
          </div>
        ) : hook.opds.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Building2 className="w-7 h-7 mx-auto mb-2 text-faint" strokeWidth={1.5} />
            <p className="text-sm font-medium text-ink">Tidak ada OPD ditemukan</p>
            <p className="text-xs text-muted mt-0.5">Coba ubah kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised/60 text-muted font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Kode</th>
                  <th className="px-4 py-2.5">Nama Unit Kerja (OPD)</th>
                  <th className="px-4 py-2.5">Koordinat</th>
                  <th className="px-4 py-2.5">Radius</th>
                  <th className="px-4 py-2.5">IP Publik</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-ink">
                {hook.opds.map((o) => (
                  <tr key={o.id} className="hover:bg-raised/70 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="info" className="font-mono">{o.kdunker}</Badge> {/* taste-skill-ignore */}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-ink">{o.nama_opd}</span>
                          {o.is_induk && (
                            <Badge variant="success">
                              OPD Induk{o.sub_count > 0 ? ` • ${o.sub_count} Sub-Unit` : ''}
                            </Badge>
                          )}
                        </div>
                        {o.parent_nama_opd && (
                          <span className="text-[11px] text-muted">
                            Induk: <span className="font-medium text-ink/80">{o.parent_nama_opd}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {o.latitude != null && o.longitude != null ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-faint shrink-0" />
                          <span className="font-mono text-[11px] num"> {/* taste-skill-ignore */}
                            {o.latitude}, {o.longitude}
                          </span>
                        </span>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 num">
                      {o.radius != null ? (
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Radius size={12} className="text-faint" />
                          {o.radius} m
                        </span>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {o.ip_public ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink num"> {/* taste-skill-ignore */}
                          <Globe size={12} className="text-faint" />
                          {o.ip_public}
                        </span>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'edit', opd: o })}
                            title="Edit OPD"
                            className="p-1.5 text-muted hover:text-ink hover:bg-raised rounded-md transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'delete', opd: o })}
                            title="Hapus OPD"
                            className="p-1.5 text-muted hover:text-negative hover:bg-[#fdeded] rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
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

        {/* Pagination */}
        {!hook.loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-raised/40 text-xs">
            <span className="text-muted num">
              Halaman {hook.page} dari {totalPages} ({hook.total.toLocaleString('id-ID')} data)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => hook.setPage(Math.max(1, hook.page - 1))}
                disabled={hook.page === 1}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => hook.setPage(Math.min(totalPages, hook.page + 1))}
                disabled={hook.page === totalPages}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

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
