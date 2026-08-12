import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { UserPlus, UserCheck, Shield } from 'lucide-react';

export function CreateUserModal({
  open,
  onClose,
  onSubmit,
  roles,
  submitting,
}) {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role_id: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        username: '',
        name: '',
        password: '',
        role_id: roles.length > 0 ? roles[0].id : '',
      });
    }
  }, [open, roles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit({
      ...formData,
      role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
    });
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Tambah Pengguna Baru"
      description="Buat akun pengguna sistem baru beserta penetapan role akses"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="create-user-form"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <UserPlus size={14} />
            {submitting ? 'Menyimpan…' : 'Simpan Pengguna'}
          </button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Username <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="misal: john_doe"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="misal: John Doe"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Password <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimal 6 karakter"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Role Akses
          </label>
          <div className="relative">
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors appearance-none cursor-pointer pr-8"
            >
              <option value="">-- Tanpa Role --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.description ? `(${r.description})` : ''}
                </option>
              ))}
            </select>
            <Shield className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
