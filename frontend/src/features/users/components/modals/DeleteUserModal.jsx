import { Modal } from '../../../../components/ui/Modal';
import { Trash2 } from 'lucide-react';

export function DeleteUserModal({
  open,
  onClose,
  onSubmit,
  user,
  submitting,
}) {
  const handleDelete = async () => {
    if (!user) return;
    const success = await onSubmit(user.id);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Hapus Pengguna"
      description="Akun akan dihapus secara permanen dan tidak dapat dipulihkan"
      size="sm"
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
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-negative hover:opacity-90 rounded-lg transition-opacity disabled:opacity-50"
          >
            <Trash2 size={13} />
            {submitting ? 'Menghapus…' : 'Hapus Pengguna'}
          </button>
        </>
      }
    >
      <div className="py-1 text-xs text-muted leading-relaxed">
        Apakah Anda yakin ingin menghapus akun pengguna{' '}
        <span className="font-semibold text-ink font-mono"> {/* taste-skill-ignore */}
          "{user?.username}"
        </span>
        ? Akun akan dihapus permanen dari database beserta seluruh akses login-nya.
      </div>
    </Modal>
  );
}
