import { useEffect, useState, useCallback, useId } from 'react';
import { getCommandQueue } from '../lib/api';
import { useToast } from '../hooks/useToast';
import StatusBadge from '../components/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ListOrdered,
  RefreshCw,
  Activity,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Clock,
  Terminal,
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch command queue (supports initial load and silent background refresh)
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

  // Fetch when pagination or filters change
  useEffect(() => {
    fetchCommands(false);
  }, [fetchCommands]);

  // Silent auto-refresh every 10 seconds for current page
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

  return (
    <div className="space-y-6 fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-slate-100 flex items-center gap-2">
            <Terminal size={26} className="text-slate-700 dark:text-slate-300" />
            Command Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            {total.toLocaleString('id-ID')} perintah tercatat {status === 'pending' ? 'dalam antrian' : 'dalam sistem'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              autoRefresh
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800'
            }`}
            title={autoRefresh ? 'Auto-refresh aktif setiap 10 detik' : 'Auto-refresh dijeda'}
          >
            <Activity size={13} className={autoRefresh && isRefreshing ? 'animate-pulse' : ''} />
            <span>{autoRefresh ? 'Auto-refresh (10s)' : 'Auto-refresh Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => fetchCommands(false)}
            disabled={loading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading || isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 space-y-3 dark:bg-slate-900/60 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              id={searchInputId}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Device SN, Lokasi, Tipe, atau ID..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-100 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[150px]">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="pending">Pending (Antrian)</option>
                <option value="executed">Executed (Selesai)</option>
                <option value="failed">Failed (Gagal)</option>
                <option value="all">Semua Status</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="relative min-w-[110px]">
              <select
                value={limit}
                onChange={(e) => handleLimitChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value={10}>10 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
              </select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="Reset filter"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {loading && commands.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">ID</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Device SN</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Lokasi</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Params</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Created At</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs tracking-wider uppercase dark:text-slate-400">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {commands.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3.5 font-mono text-slate-700 text-xs font-semibold dark:text-slate-300">
                      #{c.id}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-800 dark:text-slate-200">
                      {c.device_sn}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 text-xs font-medium dark:text-slate-300">
                      {c.device_name || c.device_sn}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700">
                        {c.command_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-center gap-1.5 group">
                        <span
                          className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]"
                          title={JSON.stringify(c.command_params)}
                        >
                          {JSON.stringify(c.command_params)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyParams(c.id, c.command_params)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
                          title="Salin parameter"
                        >
                          {copiedId === c.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs dark:text-slate-400 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs dark:text-slate-400 whitespace-nowrap">
                      {c.executed_at ? new Date(c.executed_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}

                {commands.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ListOrdered size={28} className="text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                        <p className="text-sm text-slate-500 font-medium dark:text-slate-400">
                          {hasActiveFilters
                            ? 'Tidak ada perintah yang sesuai dengan filter'
                            : 'Tidak ada perintah dalam antrian'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {hasActiveFilters
                            ? 'Coba sesuaikan kata kunci pencarian atau filter status Anda.'
                            : 'Sistem sedang dalam keadaan idle tanpa tugas yang tertunda.'}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              Menampilkan <span className="font-semibold text-slate-900 dark:text-slate-100">{offset + 1}</span> -{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {Math.min(offset + limit, total)}
              </span>{' '}
              dari <span className="font-semibold text-slate-900 dark:text-slate-100">{total.toLocaleString('id-ID')}</span> perintah
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
    </div>
  );
}
