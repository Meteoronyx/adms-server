import { useEffect, useState } from 'react';
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
import {
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Power, Trash2, Info, Users, Edit, Fingerprint, X, HardDrive, Pencil
} from 'lucide-react';

export default function DeviceDetail() {
  const { sn } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [updateModal, setUpdateModal] = useState({ open: false, data: null });
  const [enrollModal, setEnrollModal] = useState({ open: false, data: null });
  const [editNameModal, setEditNameModal] = useState(false);

  const fetchData = async () => {
    try {
      const res = await getDevicePegawai(sn);
      setData(res);
    } catch (err) {
      addToast(err.message || 'Failed to load device data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
  }, [socket, sn]);

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
        passwd: fd.get('passwd')
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

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/devices')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Device Detail</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900"></div>
            <p className="text-sm text-slate-400">Loading device...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Device Identity Card */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <HardDrive size={24} className="text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{data.device?.device_name || data.device?.name || sn}</h2>
                    <button
                      title="Edit device name"
                      onClick={() => setEditNameModal(true)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">SN: <span className="font-mono text-slate-700">{sn}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {data.device?.verified ? (
                  <button
                    onClick={() => doAction(unverifyDevice, `Unverified ${sn}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 size={13} strokeWidth={2} />
                    Verified
                  </button>
                ) : (
                  <button
                    onClick={() => doAction(verifyDevice, `Verified ${sn}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                  >
                    <XCircle size={13} strokeWidth={1.5} />
                    Unverified
                  </button>
                )}
                <div className="h-6 w-px bg-slate-200 mx-0.5" />
                <button title="Reupload" onClick={() => doAction(reuploadDevice, `Reupload queued`)} className="p-2 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-colors"><RefreshCw size={14} /></button>
                <button title="Reboot" onClick={() => doAction(rebootDevice, `Reboot queued`)} className="p-2 rounded-lg border border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-400 transition-colors"><Power size={14} /></button>
                <button title="Clear Log" onClick={() => doAction(clearLog, `Clear log queued`)} className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"><Trash2 size={14} /></button>
                <button title="Info" onClick={() => doAction(infoDevice, `Info queued`)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 hover:text-slate-600 text-slate-400 transition-colors"><Info size={14} /></button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 pt-6 border-t border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={data.device?.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Last Activity</p>
                <p className="text-sm font-medium text-slate-900">{data.device?.last_activity ? new Date(data.device?.last_activity).toLocaleString('id-ID') : '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">IP Address</p>
                <p className="text-sm font-medium text-slate-900 font-mono">{data.device?.ip_address || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Pegawai Count</p>
                <p className="text-sm font-medium text-slate-900">{data.count || 0}</p>
              </div>
            </div>
          </div>

          {/* Registered Pegawai Table */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-100">
              <Users size={16} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Registered Pegawai</h2>
              <span className="ml-auto text-xs text-slate-400">{pegawai.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">PIN</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Name</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Privilege</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Fingerprints</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Synced At</th>
                    <th className="text-right px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pegawai.map(p => (
                    <tr key={p.pin} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-700">{p.pin}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">{p.name || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{p.privilege}</td>
                      <td className="px-6 py-3.5 text-slate-600">{p.fingerprint_count}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">{p.synced_at ? new Date(p.synced_at).toLocaleString('id-ID') : '-'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button title="Update User" onClick={() => setUpdateModal({ open: true, data: p })} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><Edit size={15} /></button>
                          <button title="Enroll Fingerprint" onClick={() => setEnrollModal({ open: true, data: p })} className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"><Fingerprint size={15} /></button>
                          <button title="Delete User" onClick={() => handleDeleteUser(p.pin)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pegawai.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">Belum ada pegawai terdaftar di perangkat ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Update Modal */}
          {updateModal.open && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm scale-in">
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Update User</h3>
                  <button onClick={() => setUpdateModal({ open: false, data: null })} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={handleUpdateSubmit} className="p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-400">PIN:</span>
                    <span className="text-sm font-mono font-medium text-slate-700">{updateModal.data.pin}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Privilege</label>
                    <select name="privilege" defaultValue={updateModal.data.privilege || 0} className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400">
                      <option value="0">0 - Normal</option>
                      <option value="14">14 - Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                    <input type="text" name="passwd" defaultValue="" placeholder="Optional" className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setUpdateModal({ open: false, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors">Update</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Enroll Modal */}
          {enrollModal.open && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm scale-in">
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Enroll Fingerprint</h3>
                  <button onClick={() => setEnrollModal({ open: false, data: null })} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={handleEnrollSubmit} className="p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-xs text-slate-400">PIN:</span>
                    <span className="text-sm font-mono font-medium text-slate-700">{enrollModal.data.pin}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Finger ID (0-9)</label>
                    <input type="number" name="fid" defaultValue="0" min="0" max="9" required className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Retry</label>
                      <input type="number" name="retry" defaultValue="3" required className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Overwrite</label>
                      <select name="overwrite" defaultValue="1" className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400">
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setEnrollModal({ open: false, data: null })} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 rounded-lg transition-colors">Enroll</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Device Name Modal */}
          {editNameModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-semibold text-slate-900">Edit Device Name</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{sn}</p>
                  </div>
                  <button onClick={() => setEditNameModal(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={handleEditNameSubmit} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Device Name / Lokasi</label>
                    <input
                      type="text"
                      name="device_name"
                      defaultValue={data?.device?.device_name || ''}
                      placeholder="Contoh: Kantor Pusat Lt.2"
                      autoFocus
                      required
                      className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setEditNameModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
            <HardDrive size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Device not found</p>
          <p className="text-xs text-slate-400 mt-1">The device with SN "{sn}" does not exist.</p>
        </div>
      )}
    </div>
  );
}
