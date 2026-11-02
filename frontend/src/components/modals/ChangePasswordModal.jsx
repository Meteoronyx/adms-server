import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { KeyRound, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { changeOwnPassword } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

export function ChangePasswordModal({ open, onClose }) {
  const { addToast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
      setErrorMessage('');
      setSubmitting(false);
    }
  }, [open]);

  const isLengthValid = newPassword.length >= 8;
  const isDifferentFromOld = !oldPassword || !newPassword || oldPassword !== newPassword;
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canSubmit = oldPassword && isLengthValid && isDifferentFromOld && isMatch && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMessage('');
    setSubmitting(true);

    try {
      const res = await changeOwnPassword(oldPassword, newPassword);
      if (res.success) {
        addToast('Password berhasil diperbarui', 'success');
        onClose();
      } else {
        setErrorMessage(res.message || 'Gagal mengubah password');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengubah password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title="Ubah Password Akun"
      description="Perbarui kata sandi akun Anda untuk menjaga keamanan akses."
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="change-own-password-form"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-white bg-ink hover:bg-ink/90 rounded-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <KeyRound size={13} />
            {submitting ? 'Menyimpan…' : 'Simpan Password'}
          </button>
        </>
      }
    >
      <form id="change-own-password-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-negative-ink bg-negative-bg border border-[#f9c6c0] rounded-[6px]">
            <AlertCircle size={15} className="flex-shrink-0 text-negative" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Password Lama <span className="text-negative">*</span>
          </label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password saat ini"
              className="w-full h-[38px] pl-3 pr-10 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-2.5 text-muted hover:text-ink transition-colors"
              aria-label={showOld ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">
              Password Baru <span className="text-negative">*</span>
            </label>
            <span
              className={`text-xs font-normal transition-colors ${
                newPassword.length === 0
                  ? 'text-muted'
                  : isLengthValid
                  ? 'text-positive'
                  : 'text-warning'
              }`}
            >
              Minimal 8 karakter
            </span>
          </div>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className={`w-full h-[38px] pl-3 pr-10 text-sm bg-surface border rounded-[6px] focus:outline-none transition-colors text-ink placeholder:text-faint ${
                newPassword && !isDifferentFromOld
                  ? 'border-negative focus:border-negative'
                  : 'border-control focus:border-accent'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-2.5 text-muted hover:text-ink transition-colors"
              aria-label={showNew ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword && !isDifferentFromOld && (
            <p className="text-xs text-negative mt-1">
              Password baru tidak boleh sama dengan password lama.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">
              Konfirmasi Password Baru <span className="text-negative">*</span>
            </label>
            {confirmPassword && (
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  isMatch ? 'text-positive' : 'text-negative'
                }`}
              >
                {isMatch ? (
                  <>
                    <Check size={12} /> Cocok
                  </>
                ) : (
                  'Tidak cocok'
                )}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              className={`w-full h-[38px] pl-3 pr-10 text-sm bg-surface border rounded-[6px] focus:outline-none transition-colors text-ink placeholder:text-faint ${
                confirmPassword && !isMatch
                  ? 'border-negative focus:border-negative'
                  : 'border-control focus:border-accent'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-2.5 text-muted hover:text-ink transition-colors"
              aria-label={showConfirm ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
