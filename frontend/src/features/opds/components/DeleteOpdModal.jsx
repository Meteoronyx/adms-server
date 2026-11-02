import { Modal } from '../../../components/ui/Modal';
import { Trash2, AlertTriangle } from 'lucide-react';

export function DeleteOpdModal({ open, onClose, onSubmit, opd = null, submitting }) {
  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Hapus Unit Kerja (OPD)"
      description="Tindakan ini hanya menonaktifkan OPD (soft delete). Perangkat dan pengguna yang terikat tetap tersimpan."
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
            onClick={async () => {
              if (!opd) return;
              const success = await onSubmit(opd.id);
              if (success) onClose();
            }}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-negative hover:opacity-90 rounded-lg transition-opacity disabled:opacity-50"
          >
            <Trash2 size={13} />
            {submitting ? 'Menghapus…' : 'Hapus OPD'}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3 py-1">
        <div className="w-8 h-8 rounded-lg bg-[#fdeded] border border-[#f5c2c2] flex items-center justify-center shrink-0">
          <AlertTriangle size={15} className="text-negative" />
        </div>
        <div className="text-xs text-muted leading-relaxed">
          Anda yakin ingin menghapus{' '}
          <span className="font-semibold text-ink">
            {opd?.nama_opd}
          </span>{' '}
          (<span className="font-mono text-ink">{opd?.kdunker}</span>)? {/* taste-skill-ignore */}
        </div>
      </div>
    </Modal>
  );
}
