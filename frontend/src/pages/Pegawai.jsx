import { useState, useEffect, useCallback } from 'react';
import { listPegawai, listOpds } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { ExportPegawaiModal } from '../features/attendance/components/ExportPegawaiModal';
import { PegawaiDetailModal } from '../features/pegawai/components/PegawaiDetailModal';
import {
  Search,
  FileDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';

export default function Pegawai() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canFilterByOpd = isAdmin || Boolean(user?.is_parent_opd);
  const { addToast } = useToast();

  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [opdId, setOpdId] = useState('');
  const [opdOptions, setOpdOptions] = useState([]);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPegawai, setExportPegawai] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailPin, setDetailPin] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (canFilterByOpd) {
      listOpds({ all: true })
        .then((res) => {
          const list = res.data || res.opds || [];
          setOpdOptions(list);
        })
        .catch(() => {});
    }
  }, [canFilterByOpd]);

  const fetchPegawai = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPegawai({
        limit,
        offset,
        search: debouncedSearch,
        opdId: canFilterByOpd ? opdId : undefined,
      });
      setPegawaiList(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      addToast(err.message || 'Gagal memuat data pegawai', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, debouncedSearch, opdId, canFilterByOpd, addToast]);

  useEffect(() => {
    fetchPegawai();
  }, [fetchPegawai]);

  const handleOpenExport = (pegawaiItem) => {
    setExportPegawai(pegawaiItem);
    setExportModalOpen(true);
  };

  const handleOpenDetail = (pin) => {
    setDetailPin(pin);
    setDetailModalOpen(true);
  };

  const hasActiveFilters = Boolean(search || (canFilterByOpd && opdId));

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setOpdId('');
    setOffset(0);
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6 pb-4">
      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink leading-tight">Pegawai</h1>
          <p className="text-sm text-muted mt-1">
            {isAdmin
              ? 'Daftar identitas pegawai, pemetaan unit kerja, dan rekapitulasi biometrik.'
              : user?.nama_opd
              ? `Daftar pegawai di lingkungan ${user.nama_opd}.`
              : 'Daftar pegawai pada unit kerja Anda.'}
          </p>
        </div>

        <div className="text-xs text-muted num self-start sm:self-auto">
          Total <span className="font-medium text-ink">{total.toLocaleString('id-ID')}</span> pegawai
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-[8px] border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full min-w-0">
            <label className="block text-xs font-medium text-muted mb-1.5">
              Cari Nama atau PIN
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau PIN pegawai…"
                className="w-full h-8 pl-8 pr-8 text-xs bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted hover:text-ink"
                  aria-label="Hapus pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {canFilterByOpd && opdOptions.length > 1 && (
            <div className="w-full sm:w-64 lg:w-72 shrink-0">
              <label className="block text-xs font-medium text-muted mb-1.5">
                Unit Kerja (OPD)
              </label>
              <SearchableSelect
                size="xs"
                value={opdId}
                onChange={(val) => {
                  setOpdId(val);
                  setOffset(0);
                }}
                options={opdOptions.map((o) => ({
                  value: o.id,
                  label: o.is_induk
                    ? `★ ${o.nama_opd} (Induk)`
                    : o.kdunker
                    ? `${o.nama_opd} (${o.kdunker})`
                    : o.nama_opd,
                }))}
                placeholder="Semua Unit Kerja"
                defaultOptionLabel="Semua Unit Kerja"
              />
            </div>
          )}

          <div className="w-full sm:w-36 shrink-0">
            <label className="block text-xs font-medium text-muted mb-1.5">
              Baris per Halaman
            </label>
            <SearchableSelect
              size="xs"
              value={limit}
              onChange={(val) => {
                setLimit(Number(val));
                setOffset(0);
              }}
              options={[
                { value: 10, label: '10 baris' },
                { value: 25, label: '25 baris' },
                { value: 50, label: '50 baris' },
                { value: 100, label: '100 baris' },
              ]}
              defaultOptionLabel=""
              searchable={false}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 px-3 text-xs font-medium text-muted hover:text-ink bg-raised hover:bg-active rounded-[6px] transition-colors shrink-0"
            >
              Atur Ulang
            </button>
          )}
        </div>
      </div>

      {/* Pegawai Data Table */}
      <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
        {loading && pegawaiList.length === 0 ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : pegawaiList.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <p className="text-sm font-medium text-ink">
              Tidak ada data pegawai ditemukan.
            </p>
            <p className="text-xs text-muted max-w-xs mx-auto">
              Sesuaikan kata kunci pencarian atau filter Unit Kerja yang Anda gunakan.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-surface border border-control hover:bg-raised text-ink rounded-[6px] transition-colors"
              >
                <RefreshCw size={12} />
                <span>Bersihkan Filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="h-9 px-4 font-normal text-muted text-xs">PIN</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs">Nama Pegawai</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs">Unit Kerja (OPD)</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs text-right">Sidik Jari</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs text-right">Wajah</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs text-right">Perangkat</th>
                  <th className="h-9 px-4 font-normal text-muted text-xs text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {pegawaiList.map((p) => (
                  <tr
                    key={p.pin}
                    className="h-12 hover:bg-raised/70 transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs font-medium text-ink"> {/* taste-skill-ignore */}
                      {p.pin}
                    </td>

                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink text-sm">
                        {p.name || `Pegawai ${p.pin}`}
                      </span>
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 text-ink text-xs">
                        <span className="truncate max-w-xs">
                          {p.nama_opd || <span className="text-muted">Belum dipetakan</span>}
                        </span>
                        {p.kdunker && (
                          <span className="text-xs px-1.5 py-0.5 rounded-[4px] bg-raised text-muted font-mono"> {/* taste-skill-ignore */}
                            {p.kdunker}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-right whitespace-nowrap num text-sm">
                      <span className={p.total_fingerprints > 0 ? 'text-ink font-medium' : 'text-muted'}>
                        {p.total_fingerprints ?? 0}
                      </span>
                      <span className="text-xs text-muted ml-1">jari</span>
                    </td>

                    <td className="px-4 py-2.5 text-right whitespace-nowrap num text-sm">
                      <span className={p.total_faces > 0 ? 'text-ink font-medium' : 'text-muted'}>
                        {p.total_faces ?? 0}
                      </span>
                      <span className="text-xs text-muted ml-1">wajah</span>
                    </td>

                    <td className="px-4 py-2.5 text-right whitespace-nowrap num text-sm">
                      <span className="text-ink font-medium">{p.total_devices ?? 0}</span>
                      <span className="text-xs text-muted ml-1">unit</span>
                    </td>

                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasPermission('attendance:export') && (
                          <button
                            type="button"
                            onClick={() => handleOpenExport(p)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-accent-ink bg-accent-soft hover:bg-[#d1e8ed] rounded-[6px] transition-colors"
                            title="Cetak Rekap Presensi Pegawai"
                          >
                            <FileDown size={12} />
                            <span>Ekspor</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p.pin)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-ink bg-surface hover:bg-raised border border-control rounded-[6px] transition-colors"
                          title="Lihat Detail Pegawai"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > limit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-rule bg-raised/40 text-xs">
            <div className="text-muted num">
              Menampilkan <span className="font-medium text-ink">{offset + 1}</span>–
              <span className="font-medium text-ink">
                {Math.min(offset + limit, total)}
              </span>{' '}
              dari <span className="font-medium text-ink">{total.toLocaleString('id-ID')}</span> pegawai
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="text-muted px-1 num">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ExportPegawaiModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        initialPegawai={exportPegawai}
      />

      <PegawaiDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        pin={detailPin}
        onExport={(p) => {
          setDetailModalOpen(false);
          setExportPegawai(p);
          setExportModalOpen(true);
        }}
      />
    </div>
  );
}
