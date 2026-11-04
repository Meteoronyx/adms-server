import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { UserPlus, Shield } from 'lucide-react';

export function CreateUserModal({
  open,
  onClose,
  onSubmit,
  roles = [],
  opds = [],
  submitting,
  currentUser,
}) {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role_id: '',
    opd_id: '',
  });
  const [error, setError] = useState('');

  // Saring role admin jika pengguna yang login bukan admin
  const availableRoles = currentUser?.role === 'admin'
    ? roles
    : roles.filter((r) => r.slug !== 'admin');

  const selectedRole = availableRoles?.find((r) => String(r.id) === String(formData.role_id));
  const isAdminRole = selectedRole?.slug === 'admin';

  useEffect(() => {
    if (open) {
      setFormData({
        username: '',
        name: '',
        password: '',
        role_id: availableRoles.length > 0 ? availableRoles[0].id : '',
        opd_id: '',
      });
      setError('');
    }
  }, [open, availableRoles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdminRole && !formData.opd_id) {
      setError('Pengguna non-admin wajib memilih Induk Unit Kerja (OPD)');
      return;
    }
    setError('');
    const success = await onSubmit({
      ...formData,
      role_id: formData.role_id || null,
      opd_id: formData.opd_id || null,
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
      description="Buat akun pengguna sistem baru beserta penetapan role dan unit kerja OPD"
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
            form="create-user-form"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors disabled:opacity-50"
          >
            <UserPlus size={13} />
            {submitting ? 'Menyimpan…' : 'Simpan Pengguna'}
          </button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Username <span className="text-negative">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="misal: budi_santoso"
            className="w-full px-3 py-2 text-xs font-mono bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors" /* taste-skill-ignore */
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Nama Lengkap <span className="text-negative">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="misal: Budi Santoso"
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Password <span className="text-negative">*</span>
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimal 6 karakter"
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
      </form>
    </Modal>
  );
}
