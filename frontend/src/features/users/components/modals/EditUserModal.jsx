import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { Shield } from 'lucide-react';

export function EditUserModal({
  open,
  onClose,
  onSubmit,
  user,
  roles = [],
  opds = [],
  submitting,
  currentUser,
}) {
  const [formData, setFormData] = useState({
    name: '',
    role_id: '',
    opd_id: '',
    is_active: true,
  });
  const [error, setError] = useState('');

  // Saring role admin jika pengguna yang login bukan admin
  const availableRoles = currentUser?.role === 'admin'
    ? roles
    : roles.filter((r) => r.slug !== 'admin');

  const selectedRole = availableRoles?.find((r) => String(r.id) === String(formData.role_id));
  const isAdminRole = (selectedRole?.slug || user?.role) === 'admin';

  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name || '',
        role_id: user.role_id || '',
        opd_id: user.opd_id || '',
        is_active: user.is_active !== undefined ? user.is_active : true,
      });
      setError('');
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!isAdminRole && !formData.opd_id) {
      setError('Pengguna non-admin wajib memiliki Induk Unit Kerja (OPD)');
      return;
    }
    setError('');
    const success = await onSubmit(user.id, {
      ...formData,
      role_id: formData.role_id || null,
      opd_id: formData.opd_id || '',
    });
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Edit Pengguna"
      description={`Perbarui profil, akses, dan unit kerja OPD pengguna "${user?.username || ''}"`}
      size="md"
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
            form="edit-user-form"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Nama Lengkap <span className="text-negative">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Role Akses
          </label>
          <div className="relative">
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors appearance-none cursor-pointer pr-8"
            >
              <option value="">-- Tanpa Role --</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.description ? `(${r.description})` : ''}
                </option>
              ))}
            </select>
            <Shield className="absolute right-3 top-2.5 w-3.5 h-3.5 text-faint pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Induk Unit Kerja (OPD)
            {!isAdminRole && <span className="text-negative"> *</span>}
          </label>
          <SearchableSelect
            value={formData.opd_id || ''}
            onChange={(val) => setFormData({ ...formData, opd_id: val })}
            options={opds.map((o) => ({
              value: o.id,
              label: `${o.nama_opd} (${o.kdunker})`,
            }))}
            defaultOptionLabel={isAdminRole ? '-- Global / Seluruh OPD (Admin System) --' : ''}
            placeholder={isAdminRole ? '-- Global / Seluruh OPD (Admin System) --' : '-- Pilih Induk Unit Kerja (wajib) --'}
          />
          {!isAdminRole && (
            <p className="text-[11px] text-muted mt-1">
              Wajib dipilih agar pengguna hanya melihat data unit kerjanya sendiri
            </p>
          )}
          {error && <p className="text-[11px] text-negative mt-1">{error}</p>}
        </div>

        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-3.5 h-3.5 accent-ink rounded border-control"
            />
            <span className="text-xs font-medium text-ink">
              Akun Aktif
            </span>
          </label>
        </div>
      </form>
    </Modal>
  );
}
