import { useState, useEffect, useCallback } from 'react';
import { listPegawai, listOpds } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { ExportPegawaiModal } from '../features/attendance/components/ExportPegawaiModal';
import { PegawaiDetailModal } from '../features/pegawai/components/PegawaiDetailModal';
import {
  Users,
  User,
  Search,
  Building2,
  Fingerprint,
  HardDrive,
  FileDown,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';

export default function Pegawai() {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { addToast } = useToast();

  // Table Data State
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [opdId, setOpdId] = useState('');
  const [opdOptions, setOpdOptions] = useState([]);

  // Modals State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPegawai, setExportPegawai] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailPin, setDetailPin] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load OPD options for admin filter
  useEffect(() => {
    if (isAdmin) {
      listOpds({ all: true })
        .then((res) => {
          const list = res.data || res.opds || [];
          setOpdOptions(list);
        })
        .catch(() => { });
    }
  }, [isAdmin]);

  // Fetch Pegawai list
  const fetchPegawai = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPegawai({
        limit,
        offset,
        search: debouncedSearch,
        opdId: isAdmin ? opdId : undefined,
      });
      setPegawaiList(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      addToast(err.message || 'Gagal memuat data pegawai', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, debouncedSearch, opdId, isAdmin, addToast]);

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

  const hasActiveFilters = Boolean(search || (isAdmin && opdId));

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setOpdId('');
    setOffset(0);
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6 fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Users className="text-indigo-600 dark:text-indigo-400" size={26} />
            <span>Data Pegawai</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Kelola data seluruh pegawai, unit kerja, dan cetak rekap presensi per pegawai.'
              : user?.nama_opd
                ? `Data pegawai di lingkungan ${user.nama_opd}.`
                : 'Data pegawai unit kerja Anda.'}
          </p>
        </div>

        {/* <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{total.toLocaleString('id-ID')}</span>
            <span className="text-slate-400">Total Pegawai</span>
          </div>
        </div> */}
      </div>

      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Filter size={14} className="text-indigo-500" />
            <span>Filter Pencarian</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
            >
              <X size={13} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3.5 items-end">
          {/* Search Input */}
          <div className="flex-1 w-full min-w-0">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cari Nama / PIN
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau PIN pegawai..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* OPD Filter (Admin Only) */}
          {isAdmin && (
            <div className="w-full sm:w-64 md:w-72 lg:w-80 shrink-0">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unit Kerja (OPD)
              </label>
              <SearchableSelect
                value={opdId}
                onChange={(val) => {
                  setOpdId(val);
                  setOffset(0);
                }}
                options={opdOptions.map((o) => ({
                  value: o.id,
                  label: o.kdunker ? `${o.nama_opd} (${o.kdunker})` : o.nama_opd,
                }))}
                placeholder="Semua OPD"
                defaultOptionLabel="Semua OPD"
              />
            </div>
          )}

          {/* Limit per page */}
          <div className="w-full sm:w-36 shrink-0">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Baris / Halaman
            </label>
            <SearchableSelect
              value={limit}
              onChange={(val) => {
                setLimit(Number(val));
                setOffset(0);
              }}
              options={[
                { value: 10, label: '10 data' },
                { value: 25, label: '25 data' },
                { value: 50, label: '50 data' },
                { value: 100, label: '100 data' },
              ]}
              defaultOptionLabel=""
              searchable={false}
            />
          </div>
        </div>
      </div>

      {/* Pegawai Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading && pegawaiList.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : pegawaiList.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Users size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada data pegawai ditemukan
            </p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Coba sesuaikan kata kunci pencarian atau filter OPD yang Anda gunakan.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              >
                <RefreshCw size={13} />
                <span>Bersihkan Filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">PIN</th>
                  <th className="px-5 py-3.5">Nama Pegawai</th>
                  <th className="px-5 py-3.5">Unit Kerja / OPD</th>
                  <th className="px-5 py-3.5 text-center">Biometrik & Mesin</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {pegawaiList.map((p) => (
                  <tr
                    key={p.pin}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* PIN Column */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {p.pin}
                      </span>
                    </td>

                    {/* Nama Pegawai Column */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <User size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm">
                            {p.name || `Pegawai ${p.pin}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* OPD Column */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Building2 size={13} className="shrink-0 text-slate-400" />
                        <span className="font-medium truncate max-w-xs">
                          {p.nama_opd || <span className="text-slate-400 italic">Belum terikat OPD</span>}
                        </span>
                        {p.kdunker && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            {p.kdunker}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Biometric & Device Column */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Fingerprint size={12} className="text-slate-400" />
                          <span>{p.total_fingerprints ?? 0} FP</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <HardDrive size={12} className="text-slate-400" />
                          <span>{p.total_devices ?? 0} Mesin</span>
                        </span>
                      </div>
                    </td>

                    {/* Action Column */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Row Export Button */}
                        {hasPermission('attendance:export') && (
                          <button
                            type="button"
                            onClick={() => handleOpenExport(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-lg transition-colors active:scale-95"
                            title="Cetak Rekap Presensi Pegawai"
                          >
                            <FileDown size={13} />
                            <span>Ekspor</span>
                          </button>
                        )}

                        {/* View Detail Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p.pin)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors active:scale-95"
                          title="Lihat Detail Pegawai"
                        >
                          <Eye size={13} />
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

        {/* Server-Side Pagination Footer */}
        {!loading && total > limit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              Menampilkan <span className="font-semibold text-slate-900 dark:text-slate-100">{offset + 1}</span> -{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {Math.min(offset + limit, total)}
              </span>{' '}
              dari <span className="font-semibold text-slate-900 dark:text-slate-100">{total.toLocaleString('id-ID')}</span> pegawai
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="text-slate-500 dark:text-slate-400 px-1 font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ekspor Presensi Pegawai */}
      <ExportPegawaiModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        initialPegawai={exportPegawai}
      />

      {/* Modal Detail Pegawai */}
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
