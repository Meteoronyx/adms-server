import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  listDevices,
  getCommandQueueCount,
  getStats,
  getRecentAttendancePhotos,
  getAttendancePhotoUrl,
} from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import AnimatedNumber from "../components/AnimatedNumber";
import { Tabs } from "../components/ui/Tabs";
import { AttendancePhotoModal } from "../features/attendance/components/AttendancePhotoModal";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Camera,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../hooks/useAuth";

// Feature flag: Photo Service disembunyikan di tampilan sesuai rencana, namun logika & state tetap disimpan.
const SHOW_PHOTO_SERVICE = false;

function KpiCell({
  label,
  value,
  suffix,
  sub,
  isLead = false,
  tone = "default",
  highlight = false,
  highlightTone = "positive",
}) {
  const valueToneClass =
    tone === "negative"
      ? "text-negative"
      : tone === "warning"
        ? "text-warning"
        : tone === "positive"
          ? "text-positive"
          : "text-ink";

  const flashClass = highlight
    ? highlightTone === "negative"
      ? "flash-negative"
      : "flash-positive"
    : "";

  return (
    <div className={`px-5 py-4 transition-colors duration-300 ${flashClass}`}>
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={`${
            isLead ? "text-[28px]" : "text-[24px]"
          } font-normal leading-tight tracking-tight num ${valueToneClass}`}
        >
          <AnimatedNumber value={value ?? 0} />
        </span>
        {suffix && <span className="text-[13px] text-muted num">{suffix}</span>}
      </div>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [offlineDevices, setOfflineDevices] = useState([]);
  const [pendingCommandCount, setPendingCommandCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [logsToday, setLogsToday] = useState(0);
  const [logsWeekly, setLogsWeekly] = useState(0);
  const [logsMonth, setLogsMonth] = useState(0);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deviceTab, setDeviceTab] = useState("all");
  const [highlightedCards, setHighlightedCards] = useState({});

  const prevStats = useRef(null);
  const highlightTimers = useRef({});
  const { socket } = useSocket();
  const { hasPermission } = useAuth();
  const canViewCommands = hasPermission("devices:command");
  const canViewAttendance = hasPermission("attendance:read");

  const triggerHighlight = useCallback((card) => {
    if (highlightTimers.current[card])
      clearTimeout(highlightTimers.current[card]);
    setHighlightedCards((prev) => ({ ...prev, [card]: true }));
    highlightTimers.current[card] = setTimeout(() => {
      setHighlightedCards((prev) => ({ ...prev, [card]: false }));
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(highlightTimers.current).forEach(clearTimeout);
    };
  }, []);

  const fetchAll = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const [d, c, s, p] = await Promise.allSettled([
          listDevices(),
          canViewCommands
            ? getCommandQueueCount()
            : Promise.resolve({ count: 0 }),
          getStats(),
          canViewAttendance && SHOW_PHOTO_SERVICE
            ? getRecentAttendancePhotos({ limit: 6 })
            : Promise.resolve({ photos: [] }),
        ]);

        const resolved = (r) => (r.status === "fulfilled" ? r.value : null);
        const dRes = resolved(d);
        const cRes = resolved(c);
        const sRes = resolved(s);
        const pRes = resolved(p);

        if (pRes && Array.isArray(pRes.photos)) {
          setRecentPhotos(pRes.photos);
        }

        const currPendingCount = cRes
          ? (cRes.count ?? (cRes.commands?.length || 0))
          : 0;

        if (prevStats.current) {
          const old = prevStats.current;
          const curr = (sRes && sRes.stats) || {};
          const oldDevs = old.devices || [];
          const currDevs = (dRes && dRes.devices) || [];

          if (curr.total_pegawai !== old.stats?.total_pegawai)
            triggerHighlight("pegawai");
          if (curr.total_fingerprints !== old.stats?.total_fingerprints)
            triggerHighlight("fingerprint");
          if (curr.total_faces !== old.stats?.total_faces)
            triggerHighlight("face");
          if (currPendingCount !== (old.pendingCommandCount ?? 0))
            triggerHighlight("commands");

          if (currDevs.length !== oldDevs.length)
            triggerHighlight("total_device");
          const oldOnline = oldDevs.filter((x) => x.status === "online").length;
          const currOnline = currDevs.filter(
            (x) => x.status === "online",
          ).length;
          if (currOnline !== oldOnline) triggerHighlight("online_device");
          if (
            (dRes && dRes.offlineDevices?.length) !== old.offlineDevices?.length
          )
            triggerHighlight("offline_device");
        }

        prevStats.current = {
          stats: (sRes && sRes.stats) || {},
          devices: (dRes && dRes.devices) || [],
          pendingCommandCount: currPendingCount,
          offlineDevices: (dRes && dRes.offlineDevices) || [],
        };

        setDevices((dRes && dRes.devices) || []);
        setOfflineDevices((dRes && dRes.offlineDevices) || []);
        setPendingCommandCount(currPendingCount);
        setStats((sRes && sRes.stats) || null);
        setLogsToday(parseInt(sRes && sRes.stats?.logs_today, 10) || 0);
        setLogsWeekly(parseInt(sRes && sRes.stats?.logs_weekly, 10) || 0);
        setLogsMonth(parseInt(sRes && sRes.stats?.logs_monthly, 10) || 0);
        setLastUpdated(new Date());
      } catch {
        // ignore transient fetch errors
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canViewCommands, canViewAttendance, triggerHighlight],
  );

  useEffect(() => {
    fetchAll();
    const iv = setInterval(() => fetchAll(false), 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  useEffect(() => {
    if (!socket) return;

    const handleAttendanceUpdate = (data) => {
      const count = data.logCount || 0;
      if (count === 0) return;

      setLogsToday((prev) => prev + count);
      setLogsWeekly((prev) => prev + count);
      setLogsMonth((prev) => prev + count);

      triggerHighlight("today");
      triggerHighlight("weekly");
      triggerHighlight("monthly");
    };

    const handleAttendancePhoto = (photoEvent) => {
      if (!photoEvent || !photoEvent.id) return;
      setRecentPhotos((prev) => {
        const filtered = prev.filter((item) => item.id !== photoEvent.id);
        return [photoEvent, ...filtered].slice(0, 6);
      });
      triggerHighlight("photoService");
    };

    socket.on("attendance_update", handleAttendanceUpdate);
    socket.on("attendance_photo", handleAttendancePhoto);
    return () => {
      socket.off("attendance_update", handleAttendanceUpdate);
      socket.off("attendance_photo", handleAttendancePhoto);
    };
  }, [socket, triggerHighlight]);

  const online = devices.filter((d) => d.status === "online").length;
  const offline = offlineDevices.length;
  const verified = devices.filter((d) => d.verified).length;
  const unverifiedDevices = devices.filter((d) => !d.verified);

  const displayedDevices =
    deviceTab === "offline"
      ? offlineDevices
      : deviceTab === "unverified"
        ? unverifiedDevices
        : devices;

  const summarySentence =
    offline > 0
      ? `${offline} dari ${devices.length} mesin presensi sedang offline`
      : unverifiedDevices.length > 0
        ? `Seluruh ${online} perangkat aktif online; ${unverifiedDevices.length} perangkat baru menunggu verifikasi.`
        : `Seluruh ${devices.length} mesin presensi terhubung dan terverifikasi.`;

  return (
    <div className="space-y-6 pb-4">
      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-ink leading-tight">
              Dashboard
            </h1>
            <StatusBadge status={offline > 0 ? "pending" : "online"} />
          </div>
          <p className="text-sm text-muted mt-1">{summarySentence}</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastUpdated && (
            <span className="text-xs text-muted num">
              Diperbarui{" "}
              {lastUpdated.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchAll(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-control bg-surface text-xs font-medium text-ink hover:bg-raised disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Perbarui</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="bg-surface rounded-[8px] border border-border h-[104px] grid grid-cols-2 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-5 space-y-2">
                <div className="h-3 w-20 bg-[#e8eaed] rounded-[4px]" />
                <div className="h-7 w-16 bg-[#e8eaed] rounded-[4px]" />
              </div>
            ))}
          </div>
          <div className="bg-surface rounded-[8px] border border-border h-[340px] p-5 space-y-3">
            <div className="h-5 w-40 bg-[#e8eaed] rounded-[4px]" />
            <div className="h-8 w-full bg-[#e8eaed] rounded-[4px]" />
            <div className="h-8 w-full bg-[#e8eaed] rounded-[4px]" />
            <div className="h-8 w-full bg-[#e8eaed] rounded-[4px]" />
          </div>
        </div>
      ) : (
        <>
          {/* Primary Divided KPI Strip: Perangkat & Log Absensi */}
          <section aria-label="Ringkasan perangkat dan log absensi">
            <div className="bg-surface rounded-[8px] border border-border overflow-hidden grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <KpiCell
                label="Perangkat Online"
                value={online}
                suffix={`/ ${devices.length} unit`}
                sub={`${verified} terverifikasi`}
                isLead
                tone={online > 0 ? "positive" : "default"}
                highlight={
                  highlightedCards.online_device ||
                  highlightedCards.total_device
                }
              />
              <KpiCell
                label="Perangkat Offline"
                value={offline}
                suffix="unit"
                sub={offline === 0 ? "Tidak ada gangguan" : "Perlu pengecekan"}
                tone={offline > 0 ? "negative" : "default"}
                highlight={highlightedCards.offline_device}
                highlightTone="negative"
              />
              <KpiCell
                label="Belum Verifikasi"
                value={unverifiedDevices.length}
                suffix="unit"
                sub={
                  unverifiedDevices.length === 0
                    ? "Semua terotorisasi"
                    : "Menunggu persetujuan"
                }
                tone={unverifiedDevices.length > 0 ? "warning" : "default"}
              />
              <KpiCell
                label="Log Hari Ini"
                value={logsToday}
                suffix="presensi"
                sub="Total hari ini"
                isLead
                highlight={highlightedCards.today}
              />
              <KpiCell
                label="7 Hari Terakhir"
                value={logsWeekly}
                suffix="presensi"
                sub="Akumulasi mingguan"
                highlight={highlightedCards.weekly}
              />
              <KpiCell
                label="Bulan Ini"
                value={logsMonth}
                suffix="presensi"
                sub="Akumulasi bulanan"
                highlight={highlightedCards.monthly}
              />
            </div>
          </section>

          {/* Secondary Divided Strip: Data Induk Biometrik */}
          <section aria-label="Data induk biometrik">
            <div
              className={`bg-surface rounded-[8px] border border-border overflow-hidden grid grid-cols-2 ${
                canViewCommands ? "lg:grid-cols-4" : "lg:grid-cols-3"
              } divide-y lg:divide-y-0 lg:divide-x divide-border`}
            >
              <KpiCell
                label="Total Pegawai"
                value={stats?.total_pegawai ?? 0}
                suffix="orang"
                highlight={highlightedCards.pegawai}
              />
              <KpiCell
                label="Template Sidik Jari"
                value={stats?.total_fingerprints ?? 0}
                suffix="jari"
                highlight={highlightedCards.fingerprint}
              />
              <KpiCell
                label="Template Wajah"
                value={stats?.total_faces ?? 0}
                suffix="wajah"
                highlight={highlightedCards.face}
              />
              {canViewCommands && (
                <KpiCell
                  label="Antrean Perintah"
                  value={pendingCommandCount}
                  suffix="pending"
                  tone={pendingCommandCount > 0 ? "warning" : "default"}
                  highlight={highlightedCards.commands}
                />
              )}
            </div>
          </section>

          {/* Main Operational Block: Unified Device Table */}
          <section className="bg-surface rounded-[8px] border border-border overflow-hidden">
            <div className="px-5 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
              <Tabs
                className="border-b-0"
                activeTab={deviceTab}
                onChange={setDeviceTab}
                tabs={[
                  {
                    id: "all",
                    label: "Semua Perangkat",
                    badge: devices.length,
                  },
                  { id: "offline", label: "Offline", badge: offline },
                  {
                    id: "unverified",
                    label: "Belum Terverifikasi",
                    badge: unverifiedDevices.length,
                  },
                ]}
              />
              <div className="pb-2.5 sm:pb-2 flex items-center gap-3">
                <Link
                  to="/devices"
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-accent transition-colors"
                >
                  <span>Kelola semua perangkat</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              {displayedDevices.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="h-9 px-5 text-left font-normal text-muted text-[13px]">
                        Lokasi / Nama Perangkat
                      </th>
                      <th className="h-9 px-4 text-left font-normal text-muted text-[13px]">
                        Serial Number
                      </th>
                      <th className="h-9 px-4 text-right font-normal text-muted text-[13px]">
                        Alamat IP
                      </th>
                      <th className="h-9 px-4 text-left font-normal text-muted text-[13px]">
                        Status
                      </th>
                      <th className="h-9 px-4 text-left font-normal text-muted text-[13px]">
                        Verifikasi
                      </th>
                      <th className="h-9 px-5 text-right font-normal text-muted text-[13px]">
                        Tindakan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {displayedDevices.slice(0, 8).map((d) => (
                      <tr
                        key={d.sn}
                        onClick={() => navigate(`/devices/${d.sn}`)}
                        className="h-12 hover:bg-raised/70 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-2.5 text-ink font-medium text-sm">
                          <div className="truncate max-w-[280px]">
                            {d.device_name || d.name || "Perangkat Tanpa Nama"}
                          </div>
                          {d.nama_opd && (
                            <div className="text-xs text-muted font-normal truncate max-w-[280px]">
                              {d.nama_opd}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-ink text-[13px]">
                          {" "}
                          {/* taste-skill-ignore */}
                          {d.sn}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted text-[13px] num">
                          {" "}
                          {/* taste-skill-ignore */}
                          {d.ip_address || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          {d.verified ? (
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-positive">
                              <CheckCircle2 size={14} strokeWidth={1.8} />
                              <span>Terverifikasi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-warning">
                              <AlertCircle size={14} strokeWidth={1.8} />
                              <span>Belum</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <span className="text-[13px] font-medium text-ink hover:text-accent">
                            Buka detail
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-10 px-5 text-center">
                  <p className="text-sm font-medium text-ink">
                    {deviceTab === "offline"
                      ? "Seluruh perangkat sedang online."
                      : deviceTab === "unverified"
                        ? "Seluruh perangkat telah terverifikasi."
                        : "Belum ada perangkat yang terdaftar."}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {deviceTab === "offline"
                      ? "Tidak ada mesin absensi yang terputus dari jaringan saat ini."
                      : deviceTab === "unverified"
                        ? "Tidak ada antrean perangkat baru yang membutuhkan otorisasi."
                        : "Perangkat ADMS yang terhubung ke server akan muncul secara otomatis di daftar ini."}
                  </p>
                </div>
              )}
            </div>

            {displayedDevices.length > 8 && (
              <div className="px-5 py-2.5 border-t border-rule flex items-center justify-between bg-raised/40">
                <span className="text-xs text-muted num">
                  Menampilkan 8 dari {displayedDevices.length} perangkat
                </span>
                <Link
                  to="/devices"
                  className="text-xs font-medium text-ink hover:text-accent"
                >
                  Lihat seluruh daftar ({displayedDevices.length})
                </Link>
              </div>
            )}
          </section>

          {/* Hidden in UI via SHOW_PHOTO_SERVICE = false; code preserved for future activation */}
          {SHOW_PHOTO_SERVICE && (
            <section
              className={`bg-surface rounded-[8px] border p-5 transition-colors duration-300 ${
                highlightedCards.photoService
                  ? "flash-positive"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Camera size={16} className="text-muted" />
                  <div>
                    <h2 className="text-sm font-semibold text-ink">
                      Photo Service
                    </h2>
                    <p className="text-xs text-muted">
                      Tangkapan kamera langsung (/iclock/fdata)
                    </p>
                  </div>
                </div>
              </div>
              {recentPhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentPhotos.map((item) => {
                    const thumbUrl =
                      item.photo_url || getAttendancePhotoUrl(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedPhoto(item)}
                        className="flex items-center gap-3 p-2.5 rounded-[6px] bg-raised/60 hover:bg-raised border border-border text-left transition-colors"
                      >
                        <img
                          src={thumbUrl}
                          alt={item.pegawai_name || item.pin}
                          className="w-12 h-12 rounded-[4px] object-cover bg-ink shrink-0 border border-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-ink truncate">
                            {item.pegawai_name || `PIN ${item.pin}`}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {item.device_name || item.sn}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-muted num shrink-0">
                          <Eye size={12} />
                          <span>
                            {item.photo_time
                              ? new Date(item.photo_time).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Belum ada tangkapan kamera terbaru.
                </p>
              )}
            </section>
          )}
        </>
      )}

      <AttendancePhotoModal
        open={Boolean(selectedPhoto)}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
        photo={selectedPhoto}
      />
    </div>
  );
}
