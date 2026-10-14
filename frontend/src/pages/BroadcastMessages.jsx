import { useState, useEffect, useCallback } from 'react';
import {
  listBroadcastMessages,
  createBroadcastMessage,
  deleteBroadcastMessage,
  listDevices,
  listOpds,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Badge } from '../components/ui/Badge';
import {
  Megaphone,
  Send,
  Clock,
  HardDrive,
  Building2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Radio,
  Sparkles,
} from 'lucide-react';

const DURATION_PRESETS = [
  { label: '1 Jam', minutes: 60 },
  { label: '2 Jam', minutes: 120 },
  { label: '4 Jam', minutes: 240 },
  { label: 'Hari Ini (8 Jam)', minutes: 480 },
  { label: 'Permanen', minutes: 0 },
];

export default function BroadcastMessages() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { addToast } = useToast();
  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [devices, setDevices] = useState([]);
  const [opds, setOpds] = useState([]);

  // Form state
  const [messageText, setMessageText] = useState('');
  const [targetScope, setTargetScope] = useState('opd'); // 'opd' | 'device'
  const [selectedOpdId, setSelectedOpdId] = useState('');
  const [selectedSn, setSelectedSn] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await listBroadcastMessages({ limit: 50 });
      setMessages(res.messages || []);
    } catch (err) {
      addToast(err.message || 'Gagal memuat daftar pengumuman', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMessages();
    listDevices()
      .then((res) => setDevices((res.devices || []).filter((d) => d.verified)))
      .catch(() => {});
    if (isAdmin) {
      listOpds({ all: true })
        .then((res) => setOpds(res.data || res.opds || []))
        .catch(() => {});
    }
  }, [fetchMessages, isAdmin]);

  // Real-time refresh when a device executes a command
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchMessages();
    socket.on('device_update', handleUpdate);
    return () => socket.off('device_update', handleUpdate);
  }, [socket, fetchMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = messageText.replace(/[\t\r\n]+/g, ' ').trim();
    if (!trimmed) {
      addToast('Teks pengumuman tidak boleh kosong', 'error');
      return;
    }
    if (targetScope === 'device' && !selectedSn) {
      addToast('Pilih perangkat tujuan terlebih dahulu', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        message: trimmed,
        duration_minutes: Number(durationMinutes) || 0,
        opd_id: targetScope === 'opd' && isAdmin ? (selectedOpdId || null) : null,
        device_sn: targetScope === 'device' ? selectedSn : null,
      };
      const res = await createBroadcastMessage(payload);
      addToast(res.message || 'Pengumuman berhasil diantrekan ke mesin');
      setMessageText('');
      fetchMessages();
    } catch (err) {
      addToast(err.message || 'Gagal mengirim pengumuman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await deleteBroadcastMessage(id);
      addToast(res.message || 'Perintah hapus pengumuman diantrekan');
      fetchMessages();
    } catch (err) {
      addToast(err.message || 'Gagal menghapus pengumuman', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDurationLabel = (mins) => {
    const m = Number(mins) || 0;
    if (m === 0) return 'Permanen';
    if (m % 60 === 0) return `${m / 60} Jam (${m} mnt)`;
    return `${m} Menit`;
  };

  const isExpired = (msg) => {
    if (!msg.is_active) return true;
    const dur = Number(msg.duration_minutes) || 0;
    if (dur === 0) return false;
    const start = new Date(msg.start_time).getTime();
    return Date.now() > start + dur * 60 * 1000;
  };

  return (
    <div className="space-y-6 fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Public Broadcast SMS</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kirim Broadcast ke layar mesin absen
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMessages}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#18192d] border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} />
          <span>Segarkan Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-[#18192d] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Buat Pengumuman Baru</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Perintah <span className="font-mono">DATA UPDATE SMS (TAG=253)</span> dikirim saat heartbeat berikutnya
              </p>
            </div>
            <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg ${
              messageText.length > 300
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {messageText.length} / 320
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Cakupan Target Mesin
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTargetScope('opd')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
                      targetScope === 'opd'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Building2 size={13} />
                    <span>{isAdmin ? 'Per OPD / Global' : 'Semua Mesin OPD'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetScope('device')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
                      targetScope === 'device'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <HardDrive size={13} />
                    <span>Mesin Spesifik</span>
                  </button>
                </div>
              </div>
              <div>
                {targetScope === 'opd' ? (
                  isAdmin ? (
                    <>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        Unit Kerja (OPD) Target
                      </label>
                      <SearchableSelect
                        value={selectedOpdId}
                        onChange={setSelectedOpdId}
                        options={opds.map((o) => ({ value: String(o.id), label: o.nama_opd }))}
                        placeholder="Seluruh Mesin Terverifikasi (Global)"
                        defaultOptionLabel="Seluruh Mesin Terverifikasi (Global)"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        Unit Kerja Anda
                      </label>
                      <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {user?.nama_opd || `Seluruh Mesin OPD (${devices.length} perangkat)`}
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Pilih Perangkat Absensi
                    </label>
                    <SearchableSelect
                      value={selectedSn}
                      onChange={setSelectedSn}
                      options={devices.map((d) => ({
                        value: d.sn,
                        label: `${d.device_name || d.name || d.sn} (${d.sn})`,
                      }))}
                      placeholder="Pilih Perangkat..."
                      defaultOptionLabel="Pilih Perangkat..."
                    />
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Konten Teks Pengumuman
              </label>
              <textarea
                rows={3}
                maxLength={320}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Contoh: Pemberitahuan: Apel pagi gabungan dilaksanakan pukul 07.30 WIB di halaman utama..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 resize-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Durasi Aktif Layar (Menit)
                </label>
                <span className="text-[11px] text-slate-400">
                  {Number(durationMinutes) === 0 ? 'Tampil terus hingga dihapus manual' : `Otomatis hilang setelah ${formatDurationLabel(durationMinutes)}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {DURATION_PRESETS.map((preset) => {
                  const active = Number(durationMinutes) === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => setDurationMinutes(preset.minutes)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="number"
                    min={0}
                    max={43200}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-24 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs text-slate-400">mnt</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-all active:scale-[0.99]"
              >
                <Send size={15} />
                <span>{submitting ? 'Mengantrekan Perintah...' : 'Siarkan Pengumuman ke Mesin'}</span>
              </button>
            </div>
          </form>
        </div>
        <div className="lg:col-span-5 bg-white dark:bg-[#18192d] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Simulasi Layar Standby Mesin</h3>
              </div>
              {/* <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                ZMM220 GUI
              </span> */}
            </div>

            <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
              <div className="rounded-xl bg-gradient-to-b from-slate-950 via-[#0d1528] to-slate-950 p-4 text-white flex flex-col justify-between min-h-[210px] border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] text-slate-300 border-b border-white/10 pb-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                    <Radio size={12} className="animate-pulse" />
                    ADMS Connected
                  </span>
                  <span className="font-mono text-slate-400">TAG=253 • MIN={durationMinutes || 0}</span>
                </div>

                <div className="py-5 text-center space-y-1">
                  <div className="text-3xl font-mono font-bold tracking-wider text-white">
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="rounded-lg bg-amber-500/15 border border-amber-400/30 px-3 py-2 flex items-center gap-2 overflow-hidden">
                  <Megaphone size={13} className="text-amber-400 shrink-0" />
                  <div className="overflow-hidden whitespace-nowrap w-full">
                    <p className="text-xs font-medium text-amber-200 truncate">
                      {messageText.trim() || 'Silakan ketik pengumuman untuk melihat pratinjau teks berjalan di layar mesin...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Protokol: <strong className="font-mono text-slate-600 dark:text-slate-300">SMS_INFO (UID)</strong></span>
            <span>Maksimal 320 Karakter ASCII</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#18192d] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Riwayat & Status Pengumuman</h2>
            <p className="text-xs text-slate-400">Daftar pesan broadcast beserta status sinkronisasi perintah ke perangkat</p>
          </div>
          <Badge variant="neutral">{messages.length} Pesan</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">UID</th>
                <th className="px-5 py-3">Pesan Pengumuman</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Durasi & Mulai</th>
                <th className="px-5 py-3">Sinkronisasi Mesin</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Memuat daftar pengumuman...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Belum ada pengumuman layar</p>
                    <p className="text-xs mt-0.5">Gunakan formulir di atas untuk mengirim teks berjalan ke mesin absensi.</p>
                  </td>
                </tr>
              ) : (
                messages.map((msg) => {
                  const expired = isExpired(msg);
                  const total = msg.total_targets || 0;
                  const delivered = msg.delivered_count || 0;
                  return (
                    <tr key={msg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        #{msg.id}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs sm:max-w-md">
                        <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                          {msg.message}
                        </p>
                        {msg.created_by_name && (
                          <span className="text-[11px] text-slate-400">Oleh: {msg.created_by_name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {msg.device_sn ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.device_name || msg.device_sn}</span>
                            <span className="font-mono text-[10px] text-slate-400">{msg.device_sn}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Building2 size={12} className="text-indigo-500" />
                            <span>{msg.nama_opd || 'Seluruh Mesin (Global)'}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1 font-semibold">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formatDurationLabel(msg.duration_minutes)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {msg.start_time ? new Date(msg.start_time).toLocaleString('id-ID') : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            <CheckCircle2 size={11} />
                            Terkirim {delivered}/{total}
                          </span>
                          {msg.pending_count > 0 && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400">
                              ({msg.pending_count} antre)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {!msg.is_active ? (
                          <Badge variant="neutral">Dihapus</Badge>
                        ) : expired ? (
                          <Badge variant="warning">Selesai</Badge>
                        ) : (
                          <Badge variant="success">Aktif di Layar</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {msg.is_active ? (
                          <button
                            type="button"
                            disabled={deletingId === msg.id}
                            onClick={() => handleDelete(msg.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                            title="Hapus pesan dari layar mesin (DATA DELETE SMS)"
                          >
                            <Trash2 size={13} />
                            <span>{deletingId === msg.id ? 'Menghapus...' : 'Hapus dari Layar'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

