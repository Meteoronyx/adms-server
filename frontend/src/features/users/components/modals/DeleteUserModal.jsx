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
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
            {submitting ? 'Menghapus…' : 'Hapus Pengguna'}
          </button>
        </>
      }
    >
      <div className="py-2 text-sm text-slate-600 dark:text-slate-300">
        Apakah Anda yakin ingin menghapus akun pengguna{' '}
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          "{user?.username}"
        </span>
        ? Akun akan dihapus permanen dari database beserta seluruh akses login-nya.
      </div>
    </Modal>
  );
}
