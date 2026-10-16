import { useEffect, useState, useCallback, useRef } from 'react';
import { getHealth, listDevices, getCommandQueueCount, getStats, getRecentAttendancePhotos, getAttendancePhotoUrl } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import AnimatedNumber from '../components/AnimatedNumber';
import { AttendancePhotoModal } from '../features/attendance/components/AttendancePhotoModal';
import {
  HardDrive, ListOrdered, RefreshCw, Clock, MemoryStick,
  Users, Fingerprint, ScanFace, CalendarDays, CalendarRange, Calendar,
  CheckCircle2, AlertCircle, Camera, Eye
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

const HIGHLIGHT_THEMES = {
  emerald: {
    border: 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] dark:shadow-[0_0_15px_rgba(52,211,153,0.15)] highlight-pulse-emerald -translate-y-1',
    glow: 'bg-emerald-50/50 dark:bg-emerald-500/10',
    text: 'text-emerald-600',
  },
  red: {
    border: 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.3)] dark:shadow-[0_0_15px_rgba(248,113,113,0.15)] highlight-pulse-red -translate-y-1',
    glow: 'bg-red-50/50 dark:bg-red-500/10',
    text: 'text-red-600',
  },
};

function StatCard({ label, value, sub, icon: Icon, accent, highlight, highlightTone = 'emerald' }) {
  const highlightTheme = HIGHLIGHT_THEMES[highlightTone] || HIGHLIGHT_THEMES.emerald;

  return (
    <div className={`
      group bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden
      ${highlight
        ? highlightTheme.border
        : 'border-slate-200/60 hover:border-slate-200'
      }
    `}>
      {/* Glow Background Effect */}
      <div className={`absolute inset-0 ${highlightTheme.glow} transition-opacity duration-300 ${highlight ? 'opacity-100' : 'opacity-0'} pointer-events-none`} />

      {/* Shimmer Effect */}
      {highlight && <div className="shimmer-sweep" />}

      <div className="flex items-start justify-between mb-3 relative z-10">
        <span className={`text-xs font-semibold uppercase tracking-widest transition-colors duration-300 ${highlight ? highlightTheme.text : 'text-slate-400'}`}>{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} group-hover:scale-110 transition-transform duration-300 ${highlight ? 'scale-110' : ''}`}>
          <Icon size={16} strokeWidth={2} className={highlight ? 'animate-pulse' : ''} />
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight relative z-10 transition-colors duration-300 ${highlight ? highlightTheme.text : 'text-slate-900'}`}>
        <AnimatedNumber value={value} />
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1 relative z-10">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState(null);
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
  const [highlightedCards, setHighlightedCards] = useState({});
  const prevStats = useRef(null);
  const highlightTimers = useRef({});
  const { socket } = useSocket();
  const { hasPermission } = useAuth();
  const canViewCommands = hasPermission('devices:command');
  const canViewAttendance = hasPermission('attendance:read');

  const triggerHighlight = useCallback((card) => {
    // Clear previous timers
    if (highlightTimers.current[card]) clearTimeout(highlightTimers.current[card]);

    // Set highlight ON
    setHighlightedCards(prev => ({ ...prev, [card]: true }));

    // Auto-off highlight after 2s
    highlightTimers.current[card] = setTimeout(() => {
      setHighlightedCards(prev => ({ ...prev, [card]: false }));
    }, 2000);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(highlightTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch per-endpoint agar satu kegagalan (mis. 403 karena kurang permission)
        // tidak merusak seluruh halaman dashboard
        const [h, d, c, s, p] = await Promise.allSettled([
          getHealth(),
          listDevices(),
          canViewCommands ? getCommandQueueCount() : Promise.resolve({ count: 0 }),
          getStats(),
          canViewAttendance ? getRecentAttendancePhotos({ limit: 6 }) : Promise.resolve({ photos: [] }),
        ]);

        const resolved = (r) => (r.status === 'fulfilled' ? r.value : null);
        const hRes = resolved(h);
        const dRes = resolved(d);
        const cRes = resolved(c);
        const sRes = resolved(s);
        const pRes = resolved(p);
        if (pRes && Array.isArray(pRes.photos)) {
          setRecentPhotos(pRes.photos);
        }

        const currPendingCount = cRes ? (cRes.count ?? (cRes.commands?.length || 0)) : 0;

        // Comparison for Highlight
        if (prevStats.current) {
          const old = prevStats.current;
          const curr = (sRes && sRes.stats) || {};
          const oldDevs = old.devices || [];
          const currDevs = (dRes && dRes.devices) || [];

          if (curr.total_pegawai !== old.stats?.total_pegawai) triggerHighlight('pegawai');
          if (curr.total_fingerprints !== old.stats?.total_fingerprints) triggerHighlight('fingerprint');
          if (curr.total_faces !== old.stats?.total_faces) triggerHighlight('face');
          if (currPendingCount !== (old.pendingCommandCount ?? 0)) triggerHighlight('commands');

          if (currDevs.length !== oldDevs.length) triggerHighlight('total_device');
          const oldOnline = oldDevs.filter(x => x.status === 'online').length;
          const currOnline = currDevs.filter(x => x.status === 'online').length;
          if (currOnline !== oldOnline) triggerHighlight('online_device');
          if ((dRes && dRes.offlineDevices?.length) !== old.offlineDevices?.length) triggerHighlight('offline_device');
        }

        prevStats.current = {
          stats: (sRes && sRes.stats) || {},
          devices: (dRes && dRes.devices) || [],
          pendingCommandCount: currPendingCount,
          offlineDevices: (dRes && dRes.offlineDevices) || [],
        };

        if (hRes) setHealth(hRes);
        setDevices((dRes && dRes.devices) || []);
        setOfflineDevices((dRes && dRes.offlineDevices) || []);
        setPendingCommandCount(currPendingCount);
        setStats((sRes && sRes.stats) || null);
        setLogsToday(parseInt((sRes && sRes.stats?.logs_today), 10) || 0);
        setLogsWeekly(parseInt((sRes && sRes.stats?.logs_weekly), 10) || 0);
        setLogsMonth(parseInt((sRes && sRes.stats?.logs_monthly), 10) || 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    // Kurangi beban polling jadi per 30 detik karena sekarang ada WebSocket
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [canViewCommands]);

  useEffect(() => {
    if (!socket) return;

    const handleAttendanceUpdate = (data) => {
      const count = data.logCount || 0;
      if (count === 0) return;

      // Real-time increment
      setLogsToday(prev => prev + count);
      setLogsWeekly(prev => prev + count);
      setLogsMonth(prev => prev + count);

      // Trigger highlight animation on all 3 cards
      triggerHighlight('today');
      triggerHighlight('weekly');
      triggerHighlight('monthly');
    };

    const handleAttendancePhoto = (photoEvent) => {
      if (!photoEvent || !photoEvent.id) return;
      setRecentPhotos((prev) => {
        const filtered = prev.filter((item) => item.id !== photoEvent.id);
        return [photoEvent, ...filtered].slice(0, 6);
      });
      triggerHighlight('photoService');
    };

    socket.on('attendance_update', handleAttendanceUpdate);
    socket.on('attendance_photo', handleAttendancePhoto);
    return () => {
      socket.off('attendance_update', handleAttendanceUpdate);
      socket.off('attendance_photo', handleAttendancePhoto);
    };
  }, [socket, triggerHighlight]);

  const online = devices.filter(d => d.status === 'online').length;
  const offline = offlineDevices.length;
  const verified = devices.filter(d => d.verified).length;
  const unverifiedDevices = devices.filter(d => !d.verified);

  return (
    <div className="space-y-10 pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Selamat Datang di Aplikasi DBSpot</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900"></div>
            <p className="text-sm text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Section: Data Induk */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-900 rounded-full" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Induk</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Pegawai" value={stats?.total_pegawai} icon={Users} accent="bg-blue-50 text-blue-600" highlight={highlightedCards.pegawai} />
              <StatCard label="Total Fingerprint" value={stats?.total_fingerprints} icon={Fingerprint} accent="bg-violet-50 text-violet-600" highlight={highlightedCards.fingerprint} />
              <StatCard label="Total Wajah" value={stats?.total_faces} icon={ScanFace} accent="bg-indigo-50 text-indigo-600" highlight={highlightedCards.face} />
              {canViewCommands && (
                <StatCard label="Pending Commands" value={pendingCommandCount} icon={ListOrdered} accent="bg-orange-50 text-orange-600" highlight={highlightedCards.commands} />
              )}
            </div>
          </section>

          {/* Section: Log Absen */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-900 rounded-full" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Log Absen</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Hari Ini"
                value={logsToday}
                icon={CalendarDays}
                accent="bg-emerald-50 text-emerald-600"
                highlight={highlightedCards.today}
              />
              <StatCard
                label="7 Hari Terakhir"
                value={logsWeekly}
                icon={CalendarRange}
                accent="bg-teal-50 text-teal-600"
                highlight={highlightedCards.weekly}
              />
              <StatCard
                label="Bulan Ini"
                value={logsMonth}
                icon={Calendar}
                accent="bg-cyan-50 text-cyan-600"
                highlight={highlightedCards.monthly}
              />
            </div>
          </section>

          {/* Section: Devices */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-900 rounded-full" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Perangkat</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Device" value={devices.length} icon={HardDrive} accent="bg-slate-100 text-slate-600" highlight={highlightedCards.total_device} />
              <StatCard label="Online" value={online} icon={RefreshCw} accent="bg-emerald-50 text-emerald-600" highlight={highlightedCards.online_device} />
              <StatCard label="Offline" value={offline} icon={Clock} accent="bg-slate-100 text-slate-500" highlight={highlightedCards.offline_device} highlightTone="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Left column: Tables */}
              <div className="lg:col-span-2 space-y-6">

                {/* Daftar Device Table */}
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Daftar Device</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{verified} of {devices.length} verified</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-t border-slate-100 bg-slate-50/50">
                          <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">SN</th>
                          <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Lokasi</th>
                          <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">IP</th>
                          <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Status</th>
                          <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Verified</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {devices.slice(0, 10).map(d => (
                          <tr key={d.sn} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-3.5 font-mono text-slate-700 text-sm">{d.sn}</td>
                            <td className="px-6 py-3.5 text-slate-700 font-medium text-sm">{d.device_name || d.name || '-'}</td>
                            <td className="px-6 py-3.5 text-slate-400 text-sm">{d.ip_address || '-'}</td>
                            <td className="px-6 py-3.5">
                              <StatusBadge status={d.status} />
                            </td>
                            <td className="px-6 py-3.5">
                              {d.verified ? (
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                  <CheckCircle2 size={15} strokeWidth={2} />
                                  <span className="text-xs font-medium">Ya</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <AlertCircle size={15} strokeWidth={1.5} />
                                  <span className="text-xs font-medium">Tidak</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {devices.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">Tidak ada perangkat.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daftar Device Offline Table */}
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Device Offline</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{offlineDevices.length} perangkat offline</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    {offlineDevices.length > 0 ? (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-t border-slate-100 bg-slate-50/50">
                            <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">SN</th>
                            <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Device Name</th>
                            <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">IP</th>
                            <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {offlineDevices.slice(0, 10).map(d => (
                            <tr key={d.sn} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-3.5 font-mono text-slate-700 text-sm">{d.sn}</td>
                              <td className="px-6 py-3.5 text-slate-700 font-medium text-sm">{d.device_name || d.name || '-'}</td>
                              <td className="px-6 py-3.5 text-slate-400 text-sm">{d.ip_address || '-'}</td>
                              <td className="px-6 py-3.5"><StatusBadge status={d.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                          <CheckCircle2 className="text-emerald-500" size={24} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Semua perangkat online</p>
                        <p className="text-xs text-slate-400 mt-1">Sistem berjalan dengan sangat baik.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: Cards */}
              <div className="space-y-6">
                {/* Server Health Card */}
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <MemoryStick size={16} className="text-slate-500" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Server Health</h2>
                  </div>
                  {health ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Status</span>
                        <StatusBadge status={health.status} />
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Uptime</span>
                        <span className="font-medium text-slate-700 text-sm">{health.uptime}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Version</span>
                        <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{health.app_version}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">DB Status</span>
                        <span className={`font-medium text-xs px-2 py-0.5 rounded ${health.database?.status === 'connected'
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-red-700 bg-red-50'
                          }`}>
                          {health.database?.status || 'disconnected'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">DB Pool</span>
                        <span className="font-medium text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {health.database?.pool?.active || 0}/{health.database?.pool?.max || 0} (Wait: {health.database?.pool?.waiting || 0})
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Memory Heap</span>
                        <span className="font-medium text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {health.memory?.used} / {health.memory?.total}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500">Memory RSS</span>
                        <span className="font-medium text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {health.memory?.rss}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Unavailable</p>
                  )}
                </div>

                {/* Unverified Devices Card */}
                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <AlertCircle size={16} className="text-amber-500" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Unverified Devices</h2>
                  </div>
                  {unverifiedDevices.length > 0 ? (
                    <ul className="space-y-2 text-sm max-h-[250px] overflow-y-auto pr-1">
                      {unverifiedDevices.map(d => (
                        <li key={d.sn} className="flex justify-between items-center text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5">
                          <span className="font-mono text-xs">{d.sn}</span>
                          <span className="text-xs text-slate-400">{d.device_name || d.name || 'Unknown'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2">
                        <CheckCircle2 size={20} className="text-emerald-500" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Semua Terverifikasi</p>
                      <p className="text-xs text-slate-400 mt-1">Tidak ada perangkat yang belum diverifikasi.</p>
                    </div>
                  )}
                </div>

                {/* Live Photo Service Card (Real-time WebSocket) */}
                <div className={`
                  bg-white rounded-xl border shadow-sm p-6 transition-all duration-300 relative overflow-hidden
                  ${highlightedCards.photoService
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] highlight-pulse-emerald'
                    : 'border-slate-200/60'
                  }
                `}>
                  {highlightedCards.photoService && <div className="shimmer-sweep" />}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Camera size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Photo Service</h2>
                        <p className="text-[11px] text-slate-400">Live Capture Stream (/iclock/fdata)</p>
                      </div>
                    </div>
                    {/* <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE WS
                    </span> */}
                  </div>
                  {recentPhotos.length > 0 ? (
                    <div className="space-y-3 relative z-10">
                      {(() => {
                        const latest = recentPhotos[0];
                        const latestUrl = latest.photo_url || getAttendancePhotoUrl(latest.id);
                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(latest)}
                            className="group w-full text-left p-1.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-indigo-300 transition-all"
                          >
                            <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-slate-950">
                              <img
                                src={latestUrl}
                                alt={latest.pegawai_name || latest.pin}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between text-white">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">
                                    {latest.pegawai_name || `PIN ${latest.pin}`}
                                  </p>
                                  <p className="text-[10px] text-slate-300 truncate">
                                    {latest.device_name || latest.sn} • {latest.photo_time ? new Date(latest.photo_time).toLocaleTimeString('id-ID') : '-'}
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 text-[10px] font-medium shrink-0">
                                  <Eye size={11} />
                                  Detail
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })()}

                      {recentPhotos.length > 1 && (
                        <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-0.5">
                          {recentPhotos.slice(1).map((item) => {
                            const thumbUrl = item.photo_url || getAttendancePhotoUrl(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedPhoto(item)}
                                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 text-left transition-colors"
                              >
                                <img
                                  src={thumbUrl}
                                  alt={item.pin}
                                  className="w-9 h-9 rounded-md object-cover bg-slate-900 shrink-0 border border-slate-200"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {item.pegawai_name || `PIN ${item.pin}`}
                                  </p>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {item.device_name || item.sn}
                                  </p>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {item.photo_time ? new Date(item.photo_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
                        <Camera size={20} className="text-slate-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Menunggu Tangkapan Kamera</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Foto verifikasi wajah/absensi akan tampil secara real-time di sini.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
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
