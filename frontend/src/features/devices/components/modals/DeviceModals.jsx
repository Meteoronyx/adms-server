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
      description="Berikan nama pengenal untuk memudahkan manajemen lokasi mesin."
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="edit-dev-name-form"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-[6px] transition-colors"
          >
            <Pencil size={13} />
            Simpan Nama
          </button>
        </>
      }
    >
      <form id="edit-dev-name-form" onSubmit={handleSubmit} className="py-1">
        <label className="block text-sm font-medium text-ink mb-2">
          Nama Perangkat
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Mesin Absensi Lantai 1"
          className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint transition-colors"
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
      title={`Ubah User Mesin (PIN: ${targetUser?.pin || ''})`}
      description="Kirim perintah pembaruan nama, hak akses, atau password ke perangkat."
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="update-user-dev-form"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-[6px] transition-colors"
          >
            <Edit size={13} />
            Kirim Perintah
          </button>
        </>
      }
    >
      <form id="update-user-dev-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Nama Pegawai
          </label>
          <input
            type="text"
            name="name"
            defaultValue={targetUser?.name || ''}
            className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Hak Akses Mesin
          </label>
          <select
            name="privilege"
            defaultValue={targetUser?.privilege || '0'}
            className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink transition-colors"
          >
            <option value="0">0 — Pengguna Normal</option>
            <option value="14">14 — Admin Mesin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Password Mesin (Opsional)
          </label>
          <input
            type="text"
            name="passwd"
            defaultValue=""
            placeholder="Kosongkan jika tidak diubah"
            className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint transition-colors"
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
      description="Kirim perintah perekaman sidik jari jarak jauh ke perangkat."
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="enroll-fp-dev-form"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-[6px] transition-colors"
          >
            <Fingerprint size={13} />
            Kirim Perintah Enroll
          </button>
        </>
      }
    >
      <form id="enroll-fp-dev-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Indeks Jari (0–9)
          </label>
          <select
            name="fid"
            defaultValue="0"
            className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink transition-colors"
          >
            {[...Array(10).keys()].map((i) => (
              <option key={i} value={i}>
                Jari #{i} {i === 0 ? '(Jempol Kanan — Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Jumlah Percobaan Perekaman
          </label>
          <input
            type="number"
            name="retry"
            defaultValue="3"
            min="1"
            max="10"
            className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink num transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Mode Timpa (Overwrite)
          </label>
          <select
            name="overwrite"
            defaultValue="1"
            className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink transition-colors"
          >
            <option value="1">1 — Timpa jika template jari sudah ada</option>
            <option value="0">0 — Jangan timpa</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
