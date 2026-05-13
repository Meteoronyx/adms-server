import { useEffect, useState, useCallback, useRef } from 'react';
import { getHealth, listDevices, getCommandQueue, getStats } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import AnimatedNumber from '../components/AnimatedNumber';
import {
  HardDrive, ListOrdered, RefreshCw, Clock, MemoryStick,
  Users, Fingerprint, ShieldCheck, CalendarDays, CalendarRange, Calendar,
  CheckCircle2, AlertCircle, Activity
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

const HIGHLIGHT_THEMES = {
  emerald: {
    border: 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] dark:shadow-[0_0_15px_rgba(52,211,153,0.15)] highlight-pulse -translate-y-1',
    glow: 'bg-emerald-50/50 dark:bg-emerald-500/10',
    text: 'text-emerald-600',
  },
  red: {
    border: 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.3)] dark:shadow-[0_0_15px_rgba(248,113,113,0.15)] highlight-pulse -translate-y-1',
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
  const [commands, setCommands] = useState([]);
  const [stats, setStats] = useState(null);
  const [logsToday, setLogsToday] = useState(0);
  const [logsWeekly, setLogsWeekly] = useState(0);
  const [logsMonth, setLogsMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [highlightedCards, setHighlightedCards] = useState({});
  const prevStats = useRef(null);
  const highlightTimers = useRef({});
  const { socket } = useSocket();

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
        const [h, d, c, s] = await Promise.all([
          getHealth(),
          listDevices(),
          getCommandQueue(),
          getStats(),
        ]);

        // Comparison for Highlight
        if (prevStats.current) {
          const old = prevStats.current;
          const curr = s.stats || {};
          const oldDevs = old.devices || [];
          const currDevs = d.devices || [];

          if (curr.total_pegawai !== old.stats?.total_pegawai) triggerHighlight('pegawai');
          if (curr.total_fingerprints !== old.stats?.total_fingerprints) triggerHighlight('fingerprint');
          if (curr.total_admins !== old.stats?.total_admins) triggerHighlight('admin');
          if (c.commands?.length !== old.commands?.length) triggerHighlight('commands');

          if (currDevs.length !== oldDevs.length) triggerHighlight('total_device');
          const oldOnline = oldDevs.filter(x => x.status === 'online').length;
          const currOnline = currDevs.filter(x => x.status === 'online').length;
          if (currOnline !== oldOnline) triggerHighlight('online_device');
          if (d.offlineDevices?.length !== old.offlineDevices?.length) triggerHighlight('offline_device');
        }

        prevStats.current = { stats: s.stats, devices: d.devices, commands: c.commands, offlineDevices: d.offlineDevices };

        setHealth(h);
        setDevices(d.devices || []);
        setOfflineDevices(d.offlineDevices || []);
        setCommands(c.commands || []);
        setStats(s.stats || null);
        setLogsToday(parseInt(s.stats?.logs_today, 10) || 0);
        setLogsWeekly(parseInt(s.stats?.logs_weekly, 10) || 0);
        setLogsMonth(parseInt(s.stats?.logs_monthly, 10) || 0);
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
  }, []);

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

    socket.on('attendance_update', handleAttendanceUpdate);
    return () => {
      socket.off('attendance_update', handleAttendanceUpdate);
    };
  }, [socket, triggerHighlight]);

  const online = devices.filter(d => d.status === 'online').length;
  const offline = offlineDevices.length;
  const verified = devices.filter(d => d.verified).length;
  const unverifiedDevices = devices.filter(d => !d.verified);

  return (
    <div className="space-y-10 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Selamat Datang di Aplikasi DBSpot</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className={socket ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" : ""}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${socket ? "bg-emerald-500" : "bg-slate-400"}`}></span>
          </span>
          <span>{socket ? "Real-time aktif" : "Auto-refresh every 30s"}</span>
        </div>
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
              <StatCard label="Admin Mesin" value={stats?.total_admins} icon={ShieldCheck} accent="bg-amber-50 text-amber-600" highlight={highlightedCards.admin} />
              <StatCard label="Pending Commands" value={commands.length} icon={ListOrdered} accent="bg-orange-50 text-orange-600" highlight={highlightedCards.commands} />
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
                        <span className={`font-medium text-xs px-2 py-0.5 rounded ${
                          health.database?.status === 'connected' 
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
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
