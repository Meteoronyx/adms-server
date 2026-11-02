import { useState, useEffect, useCallback } from "react";
import {
  listBroadcastMessages,
  createBroadcastMessage,
  deleteBroadcastMessage,
  listDevices,
  listOpds,
} from "../lib/api";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { Badge } from "../components/ui/Badge";
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
} from "lucide-react";

const DURATION_PRESETS = [
  { label: "1 Jam", minutes: 60 },
  { label: "2 Jam", minutes: 120 },
  { label: "4 Jam", minutes: 240 },
  { label: "Hari Ini (8 Jam)", minutes: 480 },
  { label: "Permanen", minutes: 0 },
];

export default function BroadcastMessages() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { addToast } = useToast();
  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [devices, setDevices] = useState([]);
  const [opds, setOpds] = useState([]);

  // Form state
  const [messageText, setMessageText] = useState("");
  const [targetScope, setTargetScope] = useState("opd"); // 'opd' | 'device'
  const [selectedOpdId, setSelectedOpdId] = useState("");
  const [selectedSn, setSelectedSn] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await listBroadcastMessages({ limit: 50 });
      setMessages(res.messages || []);
    } catch (err) {
      addToast(err.message || "Gagal memuat daftar pengumuman", "error");
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

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchMessages();
    socket.on("device_update", handleUpdate);
    return () => socket.off("device_update", handleUpdate);
  }, [socket, fetchMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = messageText.replace(/[\t\r\n]+/g, " ").trim();
    if (!trimmed) {
      addToast("Teks pengumuman tidak boleh kosong", "error");
      return;
    }
    if (targetScope === "device" && !selectedSn) {
      addToast("Pilih perangkat tujuan terlebih dahulu", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        message: trimmed,
        duration_minutes: Number(durationMinutes) || 0,
        opd_id: targetScope === "opd" && isAdmin ? selectedOpdId || null : null,
        device_sn: targetScope === "device" ? selectedSn : null,
      };
      const res = await createBroadcastMessage(payload);
      addToast(res.message || "Pengumuman berhasil diantrekan ke mesin");
      setMessageText("");
      fetchMessages();
    } catch (err) {
      addToast(err.message || "Gagal mengirim pengumuman", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await deleteBroadcastMessage(id);
      addToast(res.message || "Perintah hapus pengumuman diantrekan");
      fetchMessages();
    } catch (err) {
      addToast(err.message || "Gagal menghapus pengumuman", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDurationLabel = (mins) => {
    const m = Number(mins) || 0;
    if (m === 0) return "Permanen";
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
    <div className="space-y-5 fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink tracking-[-0.015em]">
            Pengumuman Layar Mesin (Broadcast SMS)
          </h1>
          <p className="text-[13px] text-muted mt-0.5">
            Siarkan teks berjalan ke layar standby mesin absensi(ADMS TAG=253)
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMessages}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink bg-surface border border-border rounded-lg hover:bg-raised transition-colors"
        >
          <RefreshCw size={13} />
          <span>Segarkan Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Buat Pengumuman Baru
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Perintah{" "}
                <span className="font-mono">DATA UPDATE SMS (TAG=253)</span>{" "}
                dikirim saat heartbeat berikutnya {/* taste-skill-ignore */}
              </p>
            </div>
            <span
              className={`text-xs font-mono font-medium px-2 py-0.5 rounded border num ${
                /* taste-skill-ignore */
                messageText.length > 300
                  ? "bg-[#fdf5e6] text-warning border-[#edd5a8]"
                  : "bg-raised text-muted border-border"
              }`}
            >
              {messageText.length} / 320
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Cakupan Target Mesin
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-raised border border-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTargetScope("opd")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                      targetScope === "opd"
                        ? "bg-surface text-ink border border-border"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <Building2 size={13} />
                    <span>
                      {isAdmin ? "Per OPD / Global" : "Semua Mesin OPD"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetScope("device")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors ${
                      targetScope === "device"
                        ? "bg-surface text-ink border border-border"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <HardDrive size={13} />
                    <span>Mesin Spesifik</span>
                  </button>
                </div>
              </div>
              <div>
                {targetScope === "opd" ? (
                  isAdmin ? (
                    <>
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        Unit Kerja (OPD) Target
                      </label>
                      <SearchableSelect
                        value={selectedOpdId}
                        onChange={setSelectedOpdId}
                        options={opds.map((o) => ({
                          value: String(o.id),
                          label: o.nama_opd,
                        }))}
                        placeholder="Seluruh Mesin Terverifikasi (Global)"
                        defaultOptionLabel="Seluruh Mesin Terverifikasi (Global)"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        Unit Kerja Anda
                      </label>
                      <div className="px-3 py-2 rounded-lg border border-border bg-raised text-xs font-medium text-ink truncate">
                        {user?.nama_opd ||
                          `Seluruh Mesin OPD (${devices.length} perangkat)`}
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <label className="block text-xs font-medium text-muted mb-1.5">
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
              <label className="block text-xs font-medium text-muted mb-1.5">
                Konten Teks Pengumuman
              </label>
              <textarea
                rows={3}
                maxLength={320}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Contoh: Pemberitahuan: Apel pagi gabungan dilaksanakan pukul 07.30 WIB di halaman utama..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-ink focus:outline-none focus:border-accent placeholder:text-faint resize-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-muted">
                  Durasi Aktif Layar (Menit)
                </label>
                <span className="text-[11px] text-faint">
                  {Number(durationMinutes) === 0
                    ? "Tampil terus hingga dihapus manual"
                    : `Otomatis hilang setelah ${formatDurationLabel(durationMinutes)}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {DURATION_PRESETS.map((preset) => {
                  const active = Number(durationMinutes) === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => setDurationMinutes(preset.minutes)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? "bg-ink text-white border-ink"
                          : "bg-raised/60 text-muted border-border hover:text-ink hover:border-control"
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
                    onChange={(e) =>
                      setDurationMinutes(
                        Math.max(0, parseInt(e.target.value, 10) || 0),
                      )
                    }
                    className="w-20 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-surface text-ink focus:outline-none focus:border-accent num" /* taste-skill-ignore */
                  />
                  <span className="text-xs text-muted">mnt</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-ink text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
                <span>
                  {submitting
                    ? "Mengantrekan Perintah..."
                    : "Siarkan Pengumuman ke Mesin"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Standby Screen Preview */}
        <div className="lg:col-span-5 bg-surface rounded-xl border border-border p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-semibold text-ink">
                Simulasi Layar Standby Mesin
              </h3>
              <span className="text-[11px] font-mono text-muted">
                ZMM220 LCD
              </span>{" "}
              {/* taste-skill-ignore */}
            </div>

            <div className="p-2 rounded-xl bg-ink border border-ink">
              <div className="rounded-lg bg-[#191b1f] p-4 text-white flex flex-col justify-between min-h-[210px] border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] text-[#a0a6b2] border-b border-white/10 pb-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#34d399]">
                    <Radio size={12} />
                    ADMS Connected
                  </span>
                  <span className="font-mono text-[#8e95a2] num">
                    TAG=253 • MIN={durationMinutes || 0}
                  </span>{" "}
                  {/* taste-skill-ignore */}
                </div>

                <div className="py-5 text-center space-y-1">
                  <div className="text-3xl font-mono font-semibold tracking-wider text-white num">
                    {" "}
                    {/* taste-skill-ignore */}
                    {new Date().toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-[11px] text-[#8e95a2]">
                    {new Date().toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <div className="rounded-md bg-[#262218] border border-[#594820] px-3 py-2 flex items-center gap-2 overflow-hidden">
                  <Megaphone size={13} className="text-[#f5b942] shrink-0" />
                  <div className="overflow-hidden whitespace-nowrap w-full">
                    <p className="text-xs font-medium text-[#f9dca0] truncate">
                      {messageText.trim() ||
                        "Ketik pengumuman untuk melihat pratinjau teks di layar mesin..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rule text-[11px] text-muted flex items-center justify-between">
            <span>
              Protokol:{" "}
              <strong className="font-mono text-ink">SMS_INFO (UID)</strong>
            </span>{" "}
            {/* taste-skill-ignore */}
            <span>Maksimal 320 Karakter ASCII</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-raised/40">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Riwayat & Status Pengumuman
            </h2>
            <p className="text-xs text-muted">
              Daftar pesan broadcast beserta status sinkronisasi perintah ke
              perangkat
            </p>
          </div>
          <Badge variant="neutral">{messages.length} Pesan</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-raised/60 text-muted font-medium border-b border-border">
              <tr>
                <th className="px-4 py-2.5">UID</th>
                <th className="px-4 py-2.5">Pesan Pengumuman</th>
                <th className="px-4 py-2.5">Target</th>
                <th className="px-4 py-2.5">Durasi & Mulai</th>
                <th className="px-4 py-2.5">Sinkronisasi Mesin</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted">
                    Memuat daftar pengumuman...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    <Megaphone
                      className="w-6 h-6 mx-auto mb-1.5 text-faint"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm font-medium text-ink">
                      Belum ada pengumuman layar
                    </p>
                    <p className="text-xs mt-0.5">
                      Gunakan formulir di atas untuk mengirim teks berjalan ke
                      mesin absensi.
                    </p>
                  </td>
                </tr>
              ) : (
                messages.map((msg) => {
                  const expired = isExpired(msg);
                  const total = msg.total_targets || 0;
                  const delivered = msg.delivered_count || 0;
                  return (
                    <tr
                      key={msg.id}
                      className="hover:bg-raised/70 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-ink num">
                        {" "}
                        {/* taste-skill-ignore */}#{msg.id}
                      </td>
                      <td className="px-4 py-3 max-w-xs sm:max-w-md">
                        <p className="font-medium text-ink line-clamp-2">
                          {msg.message}
                        </p>
                        {msg.created_by_name && (
                          <span className="text-[11px] text-muted">
                            Oleh: {msg.created_by_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {msg.device_sn ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-ink">
                              {msg.device_name || msg.device_sn}
                            </span>
                            <span className="font-mono text-[11px] text-muted">
                              {msg.device_sn}
                            </span>{" "}
                            {/* taste-skill-ignore */}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                            <Building2 size={12} className="text-accent" />
                            <span>
                              {msg.nama_opd || "Seluruh Mesin (Global)"}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <div className="flex items-center gap-1 font-medium text-ink num">
                          <Clock size={12} className="text-faint" />
                          <span>
                            {formatDurationLabel(msg.duration_minutes)}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted mt-0.5 num">
                          {msg.start_time
                            ? new Date(msg.start_time).toLocaleString("id-ID")
                            : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-medium bg-[#eaf6f0] text-positive border border-[#bde3cf] num">
                            {" "}
                            {/* taste-skill-ignore */}
                            <CheckCircle2 size={11} />
                            Terkirim {delivered}/{total}
                          </span>
                          {msg.pending_count > 0 && (
                            <span className="text-[11px] text-warning num">
                              ({msg.pending_count} antre)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {!msg.is_active ? (
                          <Badge variant="neutral">Dihapus</Badge>
                        ) : expired ? (
                          <Badge variant="warning">Selesai</Badge>
                        ) : (
                          <Badge variant="success">Aktif di Layar</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {msg.is_active ? (
                          <button
                            type="button"
                            disabled={deletingId === msg.id}
                            onClick={() => handleDelete(msg.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-negative bg-[#fdeded] border border-[#f5c2c2] hover:opacity-90 transition-opacity disabled:opacity-50"
                            title="Hapus pesan dari layar mesin (DATA DELETE SMS)"
                          >
                            <Trash2 size={12} />
                            <span>
                              {deletingId === msg.id ? "Menghapus..." : "Hapus"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-faint">-</span>
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
