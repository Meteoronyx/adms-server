import { Modal } from '../../../components/ui/Modal';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

const emptyForm = {
  kdunker: '',
  nama_opd: '',
  latitude: '',
  longitude: '',
  radius: '',
  ip_public: '',
};

export function OpdModal({ open, onClose, onSubmit, opd = null, submitting }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      setFormData(
        opd
          ? {
              kdunker: opd.kdunker || '',
              nama_opd: opd.nama_opd || '',
              latitude: opd.latitude != null ? String(opd.latitude) : '',
              longitude: opd.longitude != null ? String(opd.longitude) : '',
              radius: opd.radius != null ? String(opd.radius) : '',
              ip_public: opd.ip_public || '',
            }
          : emptyForm
      );
    }
  }, [open, opd]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      kdunker: formData.kdunker.trim(),
      nama_opd: formData.nama_opd.trim(),
      latitude: formData.latitude !== '' ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude !== '' ? parseFloat(formData.longitude) : null,
      radius: formData.radius !== '' ? parseFloat(formData.radius) : 80,
      ip_public: formData.ip_public.trim() || null,
    };
    const success = opd
      ? await onSubmit(opd.id, payload)
      : await onSubmit(payload);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => !val && onClose()}
      title={opd ? 'Edit Unit Kerja (OPD)' : 'Tambah Unit Kerja (OPD)'}
      description="Kelola kode unit kerja, nama OPD, koordinat geofencing, radius, dan IP publik"
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
            form="opd-form"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Save size={14} />
            {submitting ? 'Menyimpan…' : 'Simpan'}
          </button>
        </>
      }
    >
      <form id="opd-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kode Unit Kerja <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.kdunker}
              onChange={(e) => setFormData({ ...formData, kdunker: e.target.value })}
              placeholder="misal: 1.01.01"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Radius Geofencing (m)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.radius}
              onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
              placeholder="misal: 80"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama OPD <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.nama_opd}
            onChange={(e) => setFormData({ ...formData, nama_opd: e.target.value })}
            placeholder="misal: Dinas Komunikasi dan Informatika"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              placeholder="misal: -6.178306"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              placeholder="misal: 106.631889"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            IP Publik
          </label>
          <input
            type="text"
            value={formData.ip_public}
            onChange={(e) => setFormData({ ...formData, ip_public: e.target.value })}
            placeholder="misal: 103.20.100.5"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-colors"
          />
        </div>
      </form>
    </Modal>
  );
}
