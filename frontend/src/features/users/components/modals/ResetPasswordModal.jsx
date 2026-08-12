import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { KeyRound } from 'lucide-react';

export function ResetPasswordModal({
  open,
  onClose,
  onSubmit,
  user,
  submitting,
}) {
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (open) {
      setNewPassword('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const success = await onSubmit(user.id, newPassword);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Reset Password Pengguna"
      description={`Buat password baru untuk pengguna "${user?.username || ''}"`}
      size="md"
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
            type="submit"
            form="reset-pass-form"
            disabled={submitting || !newPassword}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <KeyRound size={14} />
            {submitting ? 'Mereset…' : 'Reset Password'}
          </button>
        </>
      }
    >
      <form id="reset-pass-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Password Baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-slate-100 transition-colors"
          />
        </div>
      </form>
    </Modal>
  );
}
