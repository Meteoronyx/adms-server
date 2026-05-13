import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listDevices,
  verifyDevice,
  unverifyDevice,
  reuploadDevice,
  rebootDevice,
  clearLog,
  infoDevice,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import StatusBadge from '../components/StatusBadge';
import { DataTable } from '../components/ui/DataTable';
import { Skeleton } from '../components/ui/Skeleton';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  Trash2,
  Info,
  Search,
  HardDrive,
} from 'lucide-react';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { socket } = useSocket();

  const fetchDevices = async () => {
    try {
      const data = await listDevices();
      setDevices(data.devices || []);
    } catch {
      addToast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleDeviceUpdate = (data) => {
      if (!data || !data.sn) return;

      setDevices(prevDevices => {
        const deviceExists = prevDevices.some(d => d.sn === data.sn);

        if (deviceExists) {
          return prevDevices.map(device =>
            device.sn === data.sn
              ? { ...device, last_activity: new Date().toISOString(), status: 'online' }
              : device
          );
        }
        setTimeout(fetchDevices, 0);
        return prevDevices;
      });
    };

    socket.on('device_update', handleDeviceUpdate);
    return () => socket.off('device_update', handleDeviceUpdate);
  }, [socket]);

  const doAction = async (fn, sn, successMsg) => {
    try {
      await fn(sn);
      addToast(successMsg);
      await fetchDevices();
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const filtered = devices.filter(
    d =>
      d.sn.toLowerCase().includes(search.toLowerCase()) ||
      (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.device_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.ip_address || '').includes(search)
  );

  const columns = [
    {
      accessorKey: 'sn',
      header: 'SN',
      cell: ({ row }) => (
        <Link to={`/devices/${row.original.sn}`} className="font-mono text-sm text-slate-700 hover:text-accent-600 hover:underline font-medium">
          {row.original.sn}
        </Link>
      )
    },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="text-slate-600">{row.original.name || '-'}</span> },
    { accessorKey: 'device_name', header: 'Device Name', cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.device_name || '-'}</span> },
    { accessorKey: 'ip_address', header: 'IP Address', cell: ({ row }) => <span className="font-mono text-xs text-slate-400">{row.original.ip_address || '-'}</span> },
    {
      accessorKey: 'last_activity',
      header: 'Last Activity',
      cell: ({ row }) => <span className="text-slate-500 text-xs">{row.original.last_activity ? new Date(row.original.last_activity).toLocaleString('id-ID') : '-'}</span>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />
    },
    {
      accessorKey: 'verified',
      header: 'Verified',
      cell: ({ row }) => row.original.verified ? (
        <div className="flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 size={14} strokeWidth={2} />
          <span className="text-xs font-medium">Yes</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-slate-400">
          <XCircle size={14} strokeWidth={1.5} />
          <span className="text-xs font-medium">No</span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex items-center gap-0.5">
            {d.verified ? (
              <button
                title="Unverify"
                onClick={() => doAction(unverifyDevice, d.sn, `Unverified ${d.sn}`)}
                className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                <CheckCircle2 size={15} />
              </button>
            ) : (
              <button
                title="Verify"
                onClick={() => doAction(verifyDevice, d.sn, `Verified ${d.sn}`)}
                className="p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <XCircle size={15} />
              </button>
            )}
            <button
              title="Reupload"
              onClick={() => doAction(reuploadDevice, d.sn, `Reupload queued for ${d.sn}`)}
              className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <button
              title="Reboot"
              onClick={() => doAction(rebootDevice, d.sn, `Reboot queued for ${d.sn}`)}
              className="p-1.5 rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
            >
              <Power size={15} />
            </button>
            <button
              title="Clear Log"
              onClick={() => doAction(clearLog, d.sn, `Clear log queued for ${d.sn}`)}
              className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={15} />
            </button>
            <button
              title="Info"
              onClick={() => doAction(infoDevice, d.sn, `Info queued for ${d.sn}`)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Info size={15} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Devices</h1>
          <p className="text-sm text-slate-500 mt-1">{devices.length} perangkat terdaftar</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by SN, name, IP..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow placeholder:text-slate-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} pagination={true} />
      )}
    </div>
  );
}
