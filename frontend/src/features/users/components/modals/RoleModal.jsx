import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { ShieldCheck } from 'lucide-react';

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
            className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-raised rounded-lg border border-border transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="role-form"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors disabled:opacity-50"
          >
            <ShieldCheck size={13} />
            {submitting ? 'Menyimpan…' : isEditing ? 'Simpan Perubahan' : 'Buat Role'}
          </button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-4 py-1 max-h-[68vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Nama Role <span className="text-negative">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="misal: Operator Absensi"
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="misal: Mengelola mesin dan data kehadiran"
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-ink">
              Hak Akses (Permissions)
            </label>
            <span className="text-[11px] text-muted num">
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
                  className="bg-raised/40 border border-border rounded-lg p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-rule pb-2">
                    <span className="text-xs font-semibold text-ink">
                      {category}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(perms)}
                      className="text-[11px] font-medium text-accent hover:underline"
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
                          className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer select-none ${
                            isChecked
                              ? 'bg-accent-soft border-[#c3dde5] text-ink'
                              : 'bg-surface border-border text-ink hover:bg-raised/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 w-3.5 h-3.5 accent-ink rounded border-control"
                          />
                          <div className="text-xs leading-snug">
                            <span className="font-medium block">{p.name}</span>
                            <code className="text-[10px] text-muted block font-mono"> {/* taste-skill-ignore */}
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
