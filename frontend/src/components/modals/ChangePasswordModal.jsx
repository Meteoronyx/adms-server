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

  // Real-time validation checks
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="change-own-password-form"
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <KeyRound size={14} />
            {submitting ? 'Menyimpan…' : 'Simpan Password'}
          </button>
        </>
      }
    >
      <form id="change-own-password-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
            <AlertCircle size={15} className="flex-shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Password Lama */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Password Lama <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password saat ini"
              className="w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 placeholder-slate-400 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label={showOld ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <span className={`text-[11px] font-medium transition-colors ${
              newPassword.length === 0
                ? 'text-slate-400'
                : isLengthValid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              Min. 8 karakter
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
              className={`w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-xl focus:outline-none focus:ring-2 transition-colors dark:text-slate-100 placeholder-slate-400 ${
                newPassword && !isDifferentFromOld
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 dark:border-slate-700/80 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label={showNew ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword && !isDifferentFromOld && (
            <p className="text-[11px] text-rose-500 mt-1">
              Password baru tidak boleh sama dengan password lama
            </p>
          )}
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Konfirmasi Password Baru <span className="text-rose-500">*</span>
            </label>
            {confirmPassword && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${
                isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}>
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
              className={`w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-xl focus:outline-none focus:ring-2 transition-colors dark:text-slate-100 placeholder-slate-400 ${
                confirmPassword && !isMatch
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 dark:border-slate-700/80 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
