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
            className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-raised rounded-lg border border-border transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="reset-pass-form"
            disabled={submitting || !newPassword}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-lg transition-colors disabled:opacity-50"
          >
            <KeyRound size={13} />
            {submitting ? 'Mereset…' : 'Reset Password'}
          </button>
        </>
      }
    >
      <form id="reset-pass-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Password Baru <span className="text-negative">*</span>
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:border-accent text-ink transition-colors"
          />
        </div>
      </form>
    </Modal>
  );
}
