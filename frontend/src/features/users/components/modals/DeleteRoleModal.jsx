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
            {submitting ? 'Menghapus…' : 'Hapus Role'}
          </button>
        </>
      }
    >
      <div className="py-1 text-xs text-muted leading-relaxed">
        Apakah Anda yakin ingin menghapus role{' '}
        <span className="font-semibold text-ink">
          "{role?.name}"
        </span>
        ? Pengguna yang terikat dengan role ini tidak akan lagi memiliki hak akses terkait.
      </div>
    </Modal>
  );
}
