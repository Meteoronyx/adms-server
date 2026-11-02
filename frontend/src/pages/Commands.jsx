import { useEffect, useState, useCallback, useId } from 'react';
import { getCommandQueue } from '../lib/api';
import { useToast } from '../hooks/useToast';
import StatusBadge from '../components/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { Tabs } from '../components/ui/Tabs';
import {
  ListOrdered,
  RefreshCw,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
} from 'lucide-react';

export default function Commands() {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const { addToast } = useToast();
  const searchInputId = useId();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCommands = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await getCommandQueue({
        limit,
        offset,
        status: status === 'all' ? '' : status,
        search: debouncedSearch,
      });

      const list = data.commands || data.data || [];
      setCommands(list);
      setTotal(data.total !== undefined ? data.total : (data.count !== undefined ? data.count : list.length));
    } catch {
      if (!isSilent) {
        addToast('Gagal memuat antrian perintah', 'error');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [limit, offset, status, debouncedSearch, addToast]);

  useEffect(() => {
    fetchCommands(false);
  }, [fetchCommands]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchCommands(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchCommands, autoRefresh]);

  const handleCopyParams = (id, params) => {
    try {
      const text = typeof params === 'string' ? params : JSON.stringify(params, null, 2);
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast('Gagal menyalin parameter', 'error');
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setOffset(0);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(Number(newLimit));
    setOffset(0);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('pending');
    setOffset(0);
  };

  const hasActiveFilters = Boolean(search || status !== 'pending');
  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  const statusTabs = [
    { key: 'pending', label: 'Pending (Antrian)' },
    { key: 'executed', label: 'Executed (Selesai)' },
    { key: 'failed', label: 'Failed (Gagal)' },
    { key: 'all', label: 'Semua Status' },
  ];

  return (
    <div className="space-y-5 fade-in pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink tracking-[-0.015em]">
            Antrian Perintah (ADMS)
          </h1>
          <p className="text-[13px] text-muted mt-0.5">
            <span className="num font-medium text-ink">{total.toLocaleString('id-ID')}</span> perintah tercatat {status === 'pending' ? 'dalam antrian' : 'dalam sistem'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              autoRefresh
                ? 'border-[#bde3cf] bg-[#eaf6f0] text-positive'
                : 'border-border bg-surface text-muted'
            }`}
            title={autoRefresh ? 'Auto-refresh aktif setiap 10 detik' : 'Auto-refresh dijeda'}
          >
            <Activity size={13} />
            <span>{autoRefresh ? 'Auto-refresh (10d)' : 'Auto-refresh Dijeda'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchCommands(false)}
            disabled={loading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-ink hover:bg-raised transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading || isRefreshing ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 pt-2 bg-raised/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border">
          <Tabs
            items={statusTabs}
            value={status}
            onChange={handleStatusChange}
            className="border-b-0"
          />

          <div className="flex flex-wrap items-center gap-2 pb-2 lg:pb-1.5">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
              />
              <input
                id={searchInputId}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SN, lokasi, tipe, ID..."
                className="w-full pl-8 pr-7 py-1.5 bg-surface border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-accent placeholder:text-faint"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink p-0.5 rounded"
                  title="Hapus pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-accent"
            >
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-muted hover:text-ink hover:bg-raised transition-colors"
                title="Reset filter"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {loading && commands.length === 0 ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-raised/60 border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Device SN</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Lokasi</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Tipe Perintah</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Parameter</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Dibuat</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-xs">Dieksekusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {commands.map((c) => (
                  <tr key={c.id} className="hover:bg-raised/70 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-ink text-xs font-medium num"> {/* taste-skill-ignore */}
                      #{c.id}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink"> {/* taste-skill-ignore */}
                      {c.device_sn}
                    </td>
                    <td className="px-4 py-2.5 text-ink text-xs font-medium">
                      {c.device_name || c.device_sn}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-raised text-ink border border-border">
                        {c.command_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="flex items-center gap-1.5 group">
                        <span
                          className="font-mono text-xs text-muted truncate max-w-[200px]" /* taste-skill-ignore */
                          title={JSON.stringify(c.command_params)}
                        >
                          {JSON.stringify(c.command_params)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyParams(c.id, c.command_params)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-faint hover:text-ink p-1 rounded"
                          title="Salin parameter"
                        >
                          {copiedId === c.id ? <Check size={12} className="text-positive" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs whitespace-nowrap num">
                      {c.created_at ? new Date(c.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs whitespace-nowrap num">
                      {c.executed_at ? new Date(c.executed_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}

                {commands.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <ListOrdered size={22} className="text-faint" strokeWidth={1.5} />
                        <p className="text-sm text-ink font-medium">
                          {hasActiveFilters
                            ? 'Tidak ada perintah yang sesuai dengan filter'
                            : 'Tidak ada perintah dalam antrian'}
                        </p>
                        <p className="text-xs text-muted">
                          {hasActiveFilters
                            ? 'Coba sesuaikan kata kunci pencarian atau filter status Anda.'
                            : 'Sistem sedang dalam keadaan siaga tanpa tugas yang tertunda.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-raised/40 text-xs">
            <div className="text-muted num">
              Menampilkan <span className="font-medium text-ink">{offset + 1}</span>–
              <span className="font-medium text-ink">
                {Math.min(offset + limit, total)}
              </span>{' '}
              dari <span className="font-medium text-ink">{total.toLocaleString('id-ID')}</span> perintah
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="text-muted px-1 font-medium num">
                Halaman {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
