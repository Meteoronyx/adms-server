import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { ShieldCheck, Sparkles } from 'lucide-react';

export function RoleModal({
  open,
  onClose,
  onSubmit,
  role,
  permissionCategories,
  submitting,
}) {
  const isEditing = Boolean(role);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [],
  });

  useEffect(() => {
    if (open) {
      if (role) {
        setFormData({
          name: role.name || '',
          description: role.description || '',
          permission_ids: role.permissions ? role.permissions.map((p) => p.id) : [],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          permission_ids: [],
        });
      }
    }
  }, [role, open]);

  const togglePermission = (id) => {
    setFormData((prev) => {
      const exists = prev.permission_ids.includes(id);
      return {
        ...prev,
        permission_ids: exists
          ? prev.permission_ids.filter((pId) => pId !== id)
          : [...prev.permission_ids, id],
      };
    });
  };

  const toggleCategory = (categoryPerms) => {
    const permIds = categoryPerms.map((p) => p.id);
    const allSelected = permIds.every((id) => formData.permission_ids.includes(id));

    setFormData((prev) => ({
      ...prev,
      permission_ids: allSelected
        ? prev.permission_ids.filter((id) => !permIds.includes(id))
        : Array.from(new Set([...prev.permission_ids, ...permIds])),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = isEditing
      ? await onSubmit(role.id, formData)
      : await onSubmit(formData);

    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title={isEditing ? `Edit Role: ${role?.name}` : 'Buat Role Baru'}
      description="Tentukan nama role dan sesuaikan daftar hak akses (permissions)"
      size="2xl"
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
            form="role-form"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <ShieldCheck size={14} />
            {submitting ? 'Menyimpan…' : isEditing ? 'Simpan Perubahan' : 'Buat Role'}
          </button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-4 py-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Role <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="misal: Operator Absensi"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="misal: Mengelola mesin dan data kehadiran"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              Hak Akses (Permissions)
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {formData.permission_ids.length} dipilih
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(permissionCategories).map(([category, perms]) => {
              const categoryIds = perms.map((p) => p.id);
              const allSelected = categoryIds.every((id) => formData.permission_ids.includes(id));

              return (
                <div
                  key={category}
                  className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {category}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(perms)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => {
                      const isChecked = formData.permission_ids.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <div className="text-xs leading-snug">
                            <span className="font-semibold block">{p.name}</span>
                            <code className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                              {p.key}
                            </code>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
