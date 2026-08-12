import { useState } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Pencil, Edit, Fingerprint } from 'lucide-react';

export function EditDeviceNameModal({ open, onClose, onSubmit, currentName }) {
  const [name, setName] = useState(currentName || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit(name);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Ubah Nama Perangkat"
      description="Berikan nama pengenal untuk memudahkan manajemen lokasi mesin"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="edit-dev-name-form"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all"
          >
            <Pencil size={14} />
            Simpan Nama
          </button>
        </>
      }
    >
      <form id="edit-dev-name-form" onSubmit={handleSubmit} className="py-1">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Nama Perangkat
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="misal: Mesin Absensi Lantai 1"
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
        />
      </form>
    </Modal>
  );
}

export function UpdateUserModal({ open, onClose, onSubmit, targetUser }) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    const fd = new FormData(e.target);
    const success = await onSubmit(targetUser.pin, {
      name: fd.get('name'),
      privilege: fd.get('privilege'),
      passwd: fd.get('passwd'),
    });
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title={`Update User Mesin (PIN: ${targetUser?.pin || ''})`}
      description="Kirim perintah pembaruan nama, hak akses, atau password ke perangkat"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="update-user-dev-form"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all"
          >
            <Edit size={14} />
            Kirim Perintah
          </button>
        </>
      }
    >
      <form id="update-user-dev-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama Pegawai
          </label>
          <input
            type="text"
            name="name"
            defaultValue={targetUser?.name || ''}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Privilege Mesin
          </label>
          <select
            name="privilege"
            defaultValue={targetUser?.privilege || '0'}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          >
            <option value="0">0 - Normal User</option>
            <option value="14">14 - Super Admin Mesin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Password (Opsional)
          </label>
          <input
            type="text"
            name="passwd"
            defaultValue=""
            placeholder="Kosongkan jika tidak diubah"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>
      </form>
    </Modal>
  );
}

export function EnrollFingerprintModal({ open, onClose, onSubmit, targetUser }) {
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    const fd = new FormData(e.target);
    const success = await onSubmit(targetUser.pin, {
      fid: fd.get('fid'),
      retry: fd.get('retry'),
      overwrite: fd.get('overwrite'),
    });
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title={`Enroll Sidik Jari (PIN: ${targetUser?.pin || ''})`}
      description="Kirim perintah perekaman jari pengguna secara jarak jauh"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="enroll-fp-dev-form"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all"
          >
            <Fingerprint size={14} />
            Kirim Perintah Enroll
          </button>
        </>
      }
    >
      <form id="enroll-fp-dev-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Finger ID (0-9)
          </label>
          <select
            name="fid"
            defaultValue="0"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          >
            {[...Array(10).keys()].map((i) => (
              <option key={i} value={i}>
                Jari #{i} {i === 0 ? '(Jempol Kanan Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Jumlah Retry Perekaman
          </label>
          <input
            type="number"
            name="retry"
            defaultValue="3"
            min="1"
            max="10"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Mode Overwrite
          </label>
          <select
            name="overwrite"
            defaultValue="1"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          >
            <option value="1">1 - Timpa jika sidik jari sudah ada</option>
            <option value="0">0 - Jangan timpa</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
