import { useState, useEffect, useCallback } from 'react';
import { getAttendanceLogs, getAttendancePhotoUrl, listDevices } from '../lib/api';
import { DataTable } from '../components/ui/DataTable';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { AttendancePhotoModal } from '../features/attendance/components/AttendancePhotoModal';
import { format } from 'date-fns';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { addToast } = useToast();
  const { socket } = useSocket();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const columns = [
    {
      accessorKey: 'photo_id',
      header: 'Foto',
      cell: ({ row }) => {
        const photoId = row.original.photo_id;
        if (!photoId) {
          return (
            <div
              className="w-8 h-8 rounded-[4px] bg-raised border border-border flex items-center justify-center text-muted"
              title="Tidak ada tangkapan foto"
            >
              <Camera size={13} />
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={() => setSelectedPhoto(row.original)}
            className="group relative w-8 h-8 rounded-[4px] overflow-hidden border border-border hover:border-accent transition-colors"
            title="Lihat tangkapan foto absensi"
          >
            <img
              src={getAttendancePhotoUrl(photoId)}
              alt={row.original.user_pin}
              className="w-full h-full object-cover"
            />
          </button>
        );
      },
    },
    {
      accessorKey: 'pegawai_name',
      header: 'Nama Pegawai',
      cell: ({ row }) => (
        <span className="font-medium text-ink">
          {row.original.pegawai_name || <span className="text-muted font-normal">—</span>}
        </span>
      ),
    },
    {
      accessorKey: 'user_pin',
      header: 'PIN',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-ink"> {/* taste-skill-ignore */}
          {row.original.user_pin}
        </span>
      ),
    },
    {
      accessorKey: 'check_time',
      header: 'Waktu Presensi',
      cell: ({ row }) => {
        try {
          return (
            <span className="text-ink text-xs num">
              {format(new Date(row.original.check_time), 'dd MMM yyyy · HH:mm:ss')}
            </span>
          );
        } catch {
          return <span className="text-muted text-xs num">{row.original.check_time}</span>;
        }
      },
    },
    {
      accessorKey: 'nama_opd',
      header: 'Unit Kerja (OPD)',
      cell: ({ row }) => (
        <span className="text-xs text-ink">
          {row.original.nama_opd || <span className="text-muted">—</span>}
        </span>
      ),
    },
    {
      accessorKey: 'device_name',
      header: 'Lokasi Perangkat',
      cell: ({ row }) => (
        <span className="text-xs text-ink">
          {row.original.device_name || row.original.device_sn}
        </span>
      ),
    },
    {
      accessorKey: 'verify_mode',
      header: 'Metode',
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 h-5 text-xs font-medium rounded-[4px] bg-raised text-ink">
          {row.original.verify_mode || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'received_at',
      header: 'Diterima Server',
      cell: ({ row }) => {
        try {
          return row.original.received_at ? (
            <span className="text-muted text-xs num">
              {format(new Date(row.original.received_at), 'dd MMM yyyy · HH:mm:ss')}
            </span>
          ) : (
            <span className="text-muted">—</span>
          );
        } catch {
          return <span className="text-muted">—</span>;
        }
      },
    },
  ];

  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    startDate: '',
    endDate: '',
    search: '',
    sn: '',
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.sn) params.sn = appliedFilters.sn;

      if (appliedFilters.startDate && appliedFilters.endDate) {
        params.startDate = appliedFilters.startDate;
        params.endDate = appliedFilters.endDate;
      } else {
        if (appliedFilters.year) params.year = appliedFilters.year;
        if (appliedFilters.month) params.month = appliedFilters.month;
      }

      const result = await getAttendanceLogs(params);
      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      addToast(err.message || 'Gagal memuat log presensi', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, appliedFilters, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!socket) return;
    const handleAttendanceUpdate = () => {
      if (offset === 0) fetchLogs();
    };
    socket.on('attendance_update', handleAttendanceUpdate);
    socket.on('attendance_photo', handleAttendanceUpdate);
    return () => {
      socket.off('attendance_update', handleAttendanceUpdate);
      socket.off('attendance_photo', handleAttendanceUpdate);
    };
  }, [socket, offset, fetchLogs]);

  const [devices, setDevices] = useState([]);

  useEffect(() => {
    listDevices()
      .then((res) => setDevices(res.devices || []))
      .catch(() => {});
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    setOffset(0);
    setAppliedFilters({ ...filters });
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink leading-tight">Log Absen</h1>
          <p className="text-sm text-muted mt-1">
            {isAdmin
              ? 'Riwayat rekaman kehadiran pegawai secara langsung dari seluruh mesin ADMS.'
              : user?.nama_opd
              ? `Riwayat log absensi ${user.nama_opd}.`
              : 'Riwayat log absensi unit kerja Anda.'}
          </p>
        </div>
        <div className="text-xs text-muted num self-start sm:self-auto">
          Total <span className="font-medium text-ink">{total.toLocaleString('id-ID')}</span> rekaman
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-surface rounded-[8px] border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Nama atau PIN
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Cari nama atau PIN…"
              className="w-full h-8 px-3 bg-surface border border-control rounded-[6px] text-xs text-ink focus:outline-none focus:border-accent placeholder:text-faint transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Lokasi Perangkat
            </label>
            <SearchableSelect
              size="xs"
              value={filters.sn}
              onChange={(val) => handleFilterChange({ target: { name: 'sn', value: val } })}
              options={devices.map((d) => ({
                value: d.sn,
                label: d.device_name || d.sn,
              }))}
              placeholder="Semua Perangkat"
              defaultOptionLabel="Semua Perangkat"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Periode Bulan & Tahun
            </label>
            <div className="flex gap-2">
              <select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                disabled={Boolean(filters.startDate && filters.endDate)}
                className="w-1/2 h-8 px-2.5 bg-surface border border-control rounded-[6px] text-xs text-ink focus:outline-none focus:border-accent disabled:opacity-50"
              >
                <option value="">Semua</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0');
                  return (
                    <option key={m} value={m}>
                      {format(new Date(2000, i, 1), 'MMMM')}
                    </option>
                  );
                })}
              </select>
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                disabled={Boolean(filters.startDate && filters.endDate)}
                className="w-1/2 h-8 px-2.5 bg-surface border border-control rounded-[6px] text-xs text-ink num focus:outline-none focus:border-accent disabled:opacity-50"
              >
                <option value="">Semua</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-muted mb-1.5">
              Rentang Tanggal Spesifik
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="flex-1 h-8 px-2.5 bg-surface border border-control rounded-[6px] text-xs text-ink num focus:outline-none focus:border-accent"
              />
              <span className="text-muted text-xs">s/d</span>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="flex-1 h-8 px-2.5 bg-surface border border-control rounded-[6px] text-xs text-ink num focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-8 px-3.5 bg-ink hover:bg-ink/90 text-white text-xs font-medium rounded-[6px] transition-colors shrink-0"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={logs} pagination={false} />
      )}

      {/* Server-Side Pagination */}
      {!loading && total > limit && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-muted num">
            Menampilkan {offset + 1}–{Math.min(offset + limit, total)} dari{' '}
            {total.toLocaleString('id-ID')} rekaman
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-muted px-1.5 num">
              Halaman {Math.floor(offset / limit) + 1} dari {Math.ceil(total / limit)}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border border-control bg-surface text-ink hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      <AttendancePhotoModal
        open={Boolean(selectedPhoto)}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
        photo={selectedPhoto}
      />
    </div>
  );
}
