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
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
            {submitting ? 'Menghapus…' : 'Hapus OPD'}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3 py-1">
        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={16} className="text-rose-500" />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Anda yakin ingin menghapus{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {opd?.nama_opd}
          </span>{' '}
          (<span className="font-mono">{opd?.kdunker}</span>)?
        </div>
      </div>
    </Modal>
  );
}
