import { useState, useEffect } from 'react';
import { getAttendanceLogs } from '../lib/api';
import { DataTable } from '../components/ui/DataTable';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import { Calendar, Filter, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const { addToast } = useToast();
  const { socket } = useSocket();

  useEffect(() => {
    fetchLogs();
  }, [offset, limit]);

  useEffect(() => {
    if (!socket) return;
    const handleAttendanceUpdate = (data) => {
      if (offset === 0) fetchLogs();
    };
    socket.on('attendance_update', handleAttendanceUpdate);
    return () => socket.off('attendance_update', handleAttendanceUpdate);
  }, [socket, offset, limit]);

  const columns = [
    {
      accessorKey: 'pegawai_name',
      header: 'Pegawai Name',
      cell: ({ row }) => row.original.pegawai_name || <span className="text-slate-400">-</span>
    },
    {
      accessorKey: 'user_pin',
      header: 'PIN',
      cell: ({ row }) => <span className="font-mono text-slate-700">{row.original.user_pin}</span>
    },
    {
      accessorKey: 'check_time',
      header: 'Check Time',
      cell: ({ row }) => {
        try {
          return <span className="text-slate-700">{format(new Date(row.original.check_time), 'dd MMM yyyy HH:mm:ss')}</span>;
        } catch {
          return <span className="text-slate-400">{row.original.check_time}</span>;
        }
      }
    },
    {
      accessorKey: 'device_name',
      header: 'Device (Lokasi)',
      cell: ({ row }) => row.original.device_name || row.original.device_sn
    },
    {
      accessorKey: 'verify_mode',
      header: 'Verify Mode',
      cell: ({ row }) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600">
          {row.original.verify_mode || '-'}
        </span>
      )
    },
    {
      accessorKey: 'received_at',
      header: 'Received At',
      cell: ({ row }) => {
        try {
          return row.original.received_at 
            ? <span className="text-slate-500 text-xs">{format(new Date(row.original.received_at), 'dd MMM yyyy HH:mm:ss')}</span>
            : <span className="text-slate-400">-</span>;
        } catch {
          return <span className="text-slate-400">-</span>;
        }
      }
    }
  ];

  // Filters State
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    startDate: '',
    endDate: '',
    search: '',
    sn: '' // device sn
  });

  const [devices, setDevices] = useState([]);

  useEffect(() => {
    import('../lib/api').then(({ listDevices }) => {
      listDevices().then(res => setDevices(res.devices || [])).catch(() => {});
    });
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    setOffset(0);
    fetchLogs();
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (filters.search) params.search = filters.search;
      if (filters.sn) params.sn = filters.sn;
      
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      } else {
        if (filters.year) params.year = filters.year;
        if (filters.month) params.month = filters.month;
      }

      const result = await getAttendanceLogs(params);
      setLogs(result.data);
      setTotal(result.total);
    } catch (err) {
      addToast(err.message || 'Failed to fetch attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Log absensi dari seluruh perangkat</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ClipboardList size={14} />
          <span>{total.toLocaleString('id-ID')} total entries</span>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Search Name / PIN</label>
            <input 
              type="text" 
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Device (Lokasi)</label>
            <select
              name="sn"
              value={filters.sn}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow"
            >
              <option value="">All Devices</option>
              {devices.map(d => (
                <option key={d.sn} value={d.sn}>{d.device_name || d.sn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Periode</label>
            <div className="flex gap-2">
              <select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                disabled={!!(filters.startDate && filters.endDate)}
                className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow disabled:opacity-50 disabled:bg-slate-50"
              >
                <option value="">All</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0');
                  return <option key={m} value={m}>{format(new Date(2000, i, 1), 'MMMM')}</option>;
                })}
              </select>
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                disabled={!!(filters.startDate && filters.endDate)}
                className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow disabled:opacity-50 disabled:bg-slate-50"
              >
                <option value="">All</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date Range (Overrides Periode)</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow"
              />
              <span className="text-slate-400 text-xs whitespace-nowrap">to</span>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors active:scale-[0.98]"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Data Table */}
      {loading && logs.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      ) : (
        <DataTable columns={columns} data={logs} pagination={false} />
      )}

      {/* Manual Pagination Controls for Server-Side Pagination */}
      {!loading && total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total.toLocaleString('id-ID')} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-400 px-1">
              Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
