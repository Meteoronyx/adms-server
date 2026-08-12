import { Modal } from '../../../../components/ui/Modal';
import { Trash2 } from 'lucide-react';

export function DeleteRoleModal({
  open,
  onClose,
  onSubmit,
  role,
  submitting,
}) {
  const handleDelete = async () => {
    if (!role) return;
    const success = await onSubmit(role.id);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Hapus Role"
      description="Tindakan ini tidak dapat dibatalkan"
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
            {submitting ? 'Menghapus…' : 'Hapus Role'}
          </button>
        </>
      }
    >
      <div className="py-2 text-sm text-slate-600 dark:text-slate-300">
        Apakah Anda yakin ingin menghapus role{' '}
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          "{role?.name}"
        </span>
        ? Pengguna yang terikat dengan role ini tidak akan lagi memiliki hak akses terkait.
      </div>
    </Modal>
  );
}
