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
import { useAuth } from '../hooks/useAuth';
import StatusBadge from '../components/StatusBadge';
import { DataTable } from '../components/ui/DataTable';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  Trash2,
  Info,
  Search,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ open: false, sn: '', currentName: '' });
  const { addToast } = useToast();
  const { socket } = useSocket();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('devices:write');
  const canCommand = hasPermission('devices:command');

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
  }, [addToast]);

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
        <Link to={`/devices/${row.original.sn}`} className="font-mono text-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline font-medium">
          {row.original.sn}
        </Link>
      )
    },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="text-slate-600 dark:text-slate-400">{row.original.name || '-'}</span> },
    {
      accessorKey: 'device_name',
      header: 'Device Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 group">
          <span className="font-medium text-slate-700 dark:text-slate-300">{row.original.device_name || <span className="text-slate-400 italic">Belum diisi</span>}</span>
          {canWrite && (
            <button
              title="Edit device name"
              onClick={() => setEditModal({ open: true, sn: row.original.sn, currentName: row.original.device_name || '' })}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <Pencil size={12} />
            </button>
          )}
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
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
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

        const actionItems = [];
        if (canWrite) {
          actionItems.push({
            label: 'Edit Device Name',
            icon: Pencil,
            onClick: () => setEditModal({ open: true, sn: d.sn, currentName: d.device_name || '' })
          });
        }
        if (canWrite) {
          actionItems.push(
            d.verified
              ? {
                  label: 'Unverify Device',
                  icon: XCircle,
                  onClick: () => doAction(unverifyDevice, d.sn, `Unverified ${d.sn}`)
                }
              : {
                  label: 'Verify Device',
                  icon: CheckCircle2,
                  onClick: () => doAction(verifyDevice, d.sn, `Verified ${d.sn}`)
                }
          );
        }
        if (canCommand) {
          actionItems.push(
            {
              label: 'Reupload Attendance',
              icon: RefreshCw,
              onClick: () => doAction(reuploadDevice, d.sn, `Reupload queued for ${d.sn}`)
            },
            {
              label: 'Request Device Info',
              icon: Info,
              onClick: () => doAction(infoDevice, d.sn, `Info queued for ${d.sn}`)
            }
          );
        }
        if (canCommand) {
          actionItems.push(
            { type: 'separator' },
            {
              label: 'Reboot Device',
              icon: Power,
              variant: 'danger',
              onClick: () => doAction(rebootDevice, d.sn, `Reboot queued for ${d.sn}`)
            },
            {
              label: 'Clear Device Log',
              icon: Trash2,
              variant: 'danger',
              onClick: () => doAction(clearLog, d.sn, `Clear log queued for ${d.sn}`)
            }
          );
        }

        if (actionItems.length === 0) return null;

        return (
          <DropdownMenu
            align="end"
            trigger={
              <button
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none"
                title="Device actions"
              >
                <MoreHorizontal size={16} />
              </button>
            }
            items={actionItems}
          />
        );
      }
    }
  ], [doAction, canWrite, canCommand]);

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Devices</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{devices.length} perangkat terdaftar</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by SN, name, IP..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400 focus:border-slate-400 transition-shadow placeholder:text-slate-400"
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

      {/* Edit Device Name Modal (Base UI) */}
      <Modal
        open={editModal.open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditModal({ open: false, sn: '', currentName: '' });
        }}
        title="Edit Device Name"
        description={`SN: ${editModal.sn}`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditModal({ open: false, sn: '', currentName: '' })}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              form="edit-device-form"
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors"
            >
              Simpan
            </button>
          </>
        }
      >
        <form id="edit-device-form" onSubmit={handleEditName} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Device Name / Lokasi
            </label>
            <input
              type="text"
              name="device_name"
              defaultValue={editModal.currentName}
              placeholder="Contoh: Kantor Pusat Lt.2"
              autoFocus
              required
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400 focus:border-slate-400 placeholder:text-slate-400"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

