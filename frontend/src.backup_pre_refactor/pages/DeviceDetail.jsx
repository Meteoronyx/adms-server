import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import {
  getDevicePegawai,
  verifyDevice,
  unverifyDevice,
  reuploadDevice,
  rebootDevice,
  clearLog,
  infoDevice,
  updateUser,
  deleteUser,
  enrollFingerprint,
  updateDeviceName,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import StatusBadge from '../components/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import {
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Power, Trash2, Info, Users, Edit, Fingerprint, HardDrive, Pencil,
  Search, ChevronLeft, ChevronRight, MoreHorizontal
} from 'lucide-react';

export default function DeviceDetail() {
  const { sn } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination & Search States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal states
  const [updateModal, setUpdateModal] = useState({ open: false, data: null });
  const [enrollModal, setEnrollModal] = useState({ open: false, data: null });
  const [editNameModal, setEditNameModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const offset = (page - 1) * limit;
      const res = await getDevicePegawai(sn, { limit, offset, search: debouncedSearch });
      setData(res);
    } catch (err) {
      addToast(err.message || 'Failed to load device data', 'error');
    } finally {
      setLoading(false);
    }
  }, [sn, page, debouncedSearch, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset search and page when device SN changes
  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, [sn]);

  useEffect(() => {
    if (!socket) return;
    const handleDeviceUpdate = (eventData) => {
      if (eventData.sn === sn) {
        fetchData();
      }
    };
    socket.on('device_update', handleDeviceUpdate);
    return () => socket.off('device_update', handleDeviceUpdate);
  }, [socket, sn, fetchData]);

  const doAction = async (fn, successMsg) => {
    try {
      await fn(sn);
      addToast(successMsg);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDeleteUser = async (pin) => {
    if (!window.confirm(`Delete user PIN ${pin}?`)) return;
    try {
      await deleteUser(sn, pin);
      addToast('Delete queued');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateUser(sn, {
        pin: updateModal.data.pin,
        privilege: fd.get('privilege'),
        passwd: fd.get('passwd'),
        name: fd.get('name')
      });
      addToast('Update queued');
      setUpdateModal({ open: false, data: null });
      fetchData();
    } catch (err) {
      addToast(err.message || 'Update failed', 'error');
    }
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await enrollFingerprint(sn, {
        pin: enrollModal.data.pin,
        fid: fd.get('fid'),
        retry: fd.get('retry'),
        overwrite: fd.get('overwrite')
      });
      addToast('Enroll queued');
      setEnrollModal({ open: false, data: null });
    } catch (err) {
      addToast(err.message || 'Enroll failed', 'error');
    }
  };

  const handleEditNameSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newName = (fd.get('device_name') || '').trim();
    if (!newName) return;
    try {
      await updateDeviceName(sn, newName);
      addToast('Device name updated');
      setEditNameModal(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to update name', 'error');
    }
  };

  const pegawai = data?.pegawai || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const deviceActionItems = [
    data?.device?.verified
      ? {
          label: 'Unverify Device',
          icon: XCircle,
          onClick: () => doAction(unverifyDevice, `Unverified ${sn}`)
        }
      : {
          label: 'Verify Device',
          icon: CheckCircle2,
          onClick: () => doAction(verifyDevice, `Verified ${sn}`)
        },
    {
      label: 'Reupload Attendance Log',
      icon: RefreshCw,
      onClick: () => doAction(reuploadDevice, `Reupload queued`)
    },
    {
      label: 'Request Device Info',
      icon: Info,
      onClick: () => doAction(infoDevice, `Info queued`)
    },
    { type: 'separator' },
    {
      label: 'Reboot Device',
      icon: Power,
      variant: 'danger',
      onClick: () => doAction(rebootDevice, `Reboot queued`)
    },
    {
      label: 'Clear Log',
      icon: Trash2,
      variant: 'danger',
      onClick: () => doAction(clearLog, `Clear log queued`)
    }
  ];

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/devices')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Device Detail</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900 dark:border-t-slate-100"></div>
            <p className="text-sm text-slate-400">Loading device...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Device Identity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <HardDrive size={24} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{data.device?.device_name || data.device?.name || sn}</h2>
                    <button
                      title="Edit device name"
                      onClick={() => setEditNameModal(true)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">SN: <span className="font-mono text-slate-700 dark:text-slate-300">{sn}</span></p>
                </div>
              </div>

              {/* Quick Actions & Menu */}
              <div className="flex items-center gap-2">
                <DropdownMenu
                  align="end"
                  trigger={
                    <button className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
                      <MoreHorizontal size={15} />
                      <span>Device Commands</span>
                    </button>
                  }
                  items={deviceActionItems}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={data.device?.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Last Activity</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{data.device?.last_activity ? new Date(data.device?.last_activity).toLocaleString('id-ID') : '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">IP Address</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">{data.device?.ip_address || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Pegawai Count</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{data.count || 0}</p>
              </div>
            </div>
          </div>

          {/* Registered Pegawai Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Registered Pegawai</h2>
                <span className="text-xs text-slate-400 font-normal">
                  ({data?.total || 0} matching, {data?.count || 0} total)
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or PIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">PIN</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">Name</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">Privilege</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">Fingerprints</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">Password</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">Synced At</th>
                    <th className="text-right px-6 py-2.5 font-semibold text-slate-500 dark:text-slate-400 text-xs tracking-wider uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pegawai.map(p => (
                    <tr key={p.pin} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">{p.pin}</td>
                      <td className="px-6 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{p.name || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{p.privilege}</td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{p.fingerprint_count}</td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 font-mono">{p.password || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">{p.synced_at ? new Date(p.synced_at).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <DropdownMenu
                          align="end"
                          trigger={
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none">
                              <MoreHorizontal size={16} />
                            </button>
                          }
                          items={[
                            {
                              label: 'Update User',
                              icon: Edit,
                              onClick: () => setUpdateModal({ open: true, data: p })
                            },
                            {
                              label: 'Enroll Fingerprint',
                              icon: Fingerprint,
                              onClick: () => setEnrollModal({ open: true, data: p })
                            },
                            { type: 'separator' },
                            {
                              label: 'Delete User',
                              icon: Trash2,
                              variant: 'danger',
                              onClick: () => handleDeleteUser(p.pin)
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {pegawai.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm">
                        {debouncedSearch ? 'Tidak ada pegawai yang cocok dengan pencarian.' : 'Belum ada pegawai terdaftar di perangkat ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 gap-4">
                <p className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-700 dark:text-slate-300">{Math.min((page - 1) * limit + 1, data?.total || 0)}</span> to{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{Math.min(page * limit, data?.total || 0)}</span> of{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{data?.total || 0}</span> results
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center gap-1.5">
                          {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                          <button
                            onClick={() => setPage(p)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                              page === p
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm font-semibold'
                                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Update Modal (Base UI) */}
          <Modal
            open={updateModal.open}
            onOpenChange={(isOpen) => {
              if (!isOpen) setUpdateModal({ open: false, data: null });
            }}
            title="Update User"
            description={`PIN: ${updateModal.data?.pin}`}
            size="sm"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setUpdateModal({ open: false, data: null })}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="update-user-form"
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors"
                >
                  Update
                </button>
              </>
            }
          >
            <form id="update-user-form" onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nama Pegawai</label>
                <input type="text" name="name" defaultValue={updateModal.data?.name || ''} placeholder="Optional" className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Privilege</label>
                <select name="privilege" defaultValue={updateModal.data?.privilege || 0} className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400">
                  <option value="0">0 - Normal</option>
                  <option value="14">14 - Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Password</label>
                <input type="text" name="passwd" defaultValue="" placeholder="Optional" className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400 placeholder:text-slate-400" />
              </div>
            </form>
          </Modal>

          {/* Enroll Modal (Base UI) */}
          <Modal
            open={enrollModal.open}
            onOpenChange={(isOpen) => {
              if (!isOpen) setEnrollModal({ open: false, data: null });
            }}
            title="Enroll Fingerprint"
            description={`PIN: ${enrollModal.data?.pin}`}
            size="sm"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setEnrollModal({ open: false, data: null })}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="enroll-fingerprint-form"
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors"
                >
                  Enroll
                </button>
              </>
            }
          >
            <form id="enroll-fingerprint-form" onSubmit={handleEnrollSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Finger ID (0-9)</label>
                <input type="number" name="fid" defaultValue="0" min="0" max="9" required className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Retry</label>
                  <input type="number" name="retry" defaultValue="3" required className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Overwrite</label>
                  <select name="overwrite" defaultValue="1" className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400">
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </div>
              </div>
            </form>
          </Modal>

          {/* Edit Device Name Modal (Base UI) */}
          <Modal
            open={editNameModal}
            onOpenChange={(isOpen) => setEditNameModal(isOpen)}
            title="Edit Device Name"
            description={`SN: ${sn}`}
            size="sm"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setEditNameModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="edit-name-detail-form"
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </>
            }
          >
            <form id="edit-name-detail-form" onSubmit={handleEditNameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Device Name / Lokasi</label>
                <input
                  type="text"
                  name="device_name"
                  defaultValue={data?.device?.device_name || ''}
                  placeholder="Contoh: Kantor Pusat Lt.2"
                  autoFocus
                  required
                  className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400 placeholder:text-slate-400"
                />
              </div>
            </form>
          </Modal>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
            <HardDrive size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Device not found</p>
          <p className="text-xs text-slate-400 mt-1">The device with SN "{sn}" does not exist.</p>
        </div>
      )}
    </div>
  );
}

