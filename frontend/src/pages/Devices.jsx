import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  listDevices,
  verifyDevice,
  unverifyDevice,
  reuploadDevice,
  rebootDevice,
  clearLog,
  infoDevice,
  updateDeviceName,
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
  Pencil,
  X,
} from 'lucide-react';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ open: false, sn: '', currentName: '' });
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

  const doAction = useCallback(async (fn, sn, successMsg) => {
    try {
      await fn(sn);
      addToast(successMsg);
      await fetchDevices();
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  }, [addToast]); // fetchDevices is not memoized but stable enough here

  const handleEditName = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newName = (fd.get('device_name') || '').trim();
    if (!newName) return;
    try {
      await updateDeviceName(editModal.sn, newName);
      addToast(`Device name updated`);
      setEditModal({ open: false, sn: '', currentName: '' });
      await fetchDevices();
    } catch (err) {
      addToast(err.message || 'Failed to update name', 'error');
    }
  }, [editModal, addToast]);

  const filtered = useMemo(() => {
    return devices.filter(
      d =>
        d.sn.toLowerCase().includes(search.toLowerCase()) ||
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.device_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.ip_address || '').includes(search)
    );
  }, [devices, search]);

  const columns = useMemo(() => [
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
    {
      accessorKey: 'device_name',
      header: 'Device Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 group">
          <span className="font-medium text-slate-700">{row.original.device_name || <span className="text-slate-400 italic">Belum diisi</span>}</span>
          <button
            title="Edit device name"
            onClick={() => setEditModal({ open: true, sn: row.original.sn, currentName: row.original.device_name || '' })}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <Pencil size={12} />
          </button>
        </div>
      )
    },
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
  ], [doAction]);

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
        <DataTable 
          columns={columns} 
          data={filtered} 
          pagination={true} 
          getRowId={row => row.sn}
        />
      )}

      {/* Edit Device Name Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Edit Device Name</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{editModal.sn}</p>
              </div>
              <button onClick={() => setEditModal({ open: false, sn: '', currentName: '' })} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleEditName} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Device Name / Lokasi</label>
                <input
                  type="text"
                  name="device_name"
                  defaultValue={editModal.currentName}
                  placeholder="Contoh: Kantor Pusat Lt.2"
                  autoFocus
                  required
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditModal({ open: false, sn: '', currentName: '' })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
