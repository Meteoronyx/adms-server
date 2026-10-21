import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  checkFingerprint,
  checkFace,
  transferFingerprint,
  transferFace,
  transferAllBiometrics,
  enrollFingerprint,
  listDevices,
  listPegawai,
  getPegawai,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Search, ArrowRight, PlusCircle, ScanFace, Fingerprint as FpIcon, Layers } from 'lucide-react';

export default function Fingerprint() {
  const [tab, setTab] = useState('check');
  const { addToast } = useToast();

  // Reference data state (Devices & Pegawai)
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [initialPegawai, setInitialPegawai] = useState([]);
  const [searchedPegawai, setSearchedPegawai] = useState(null); // null when no active search query
  const [pegawaiCache, setPegawaiCache] = useState({}); // pin -> pegawai object
  const [pegawaiLoading, setPegawaiLoading] = useState(false);
  const [pegawaiDeviceMappings, setPegawaiDeviceMappings] = useState({}); // pin -> array of device mappings from getPegawai(pin)
  const searchTimerRef = useRef(null);

  // Check state
  const [checkPin, setCheckPin] = useState('');
  const [checkSn, setCheckSn] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);

  // Transfer state
  const [tfPin, setTfPin] = useState('');
  const [tfSource, setTfSource] = useState('');
  const [tfTarget, setTfTarget] = useState('');
  const [tfMode, setTfMode] = useState('all'); // 'all' | 'fp' | 'face'
  const [tfLoading, setTfLoading] = useState(false);

  // Enroll state
  const [enSn, setEnSn] = useState('');
  const [enPin, setEnPin] = useState('');
  const [enFid, setEnFid] = useState(0);
  const [enRetry, setEnRetry] = useState(1);
  const [enOverwrite, setEnOverwrite] = useState(0);
  const [enLoading, setEnLoading] = useState(false);

  // Load initial devices & pegawai list
  useEffect(() => {
    setDevicesLoading(true);
    listDevices()
      .then((res) => {
        setDevices(res.devices || []);
      })
      .catch(() => {
        addToast('Gagal memuat daftar perangkat', 'error');
      })
      .finally(() => {
        setDevicesLoading(false);
      });

    setPegawaiLoading(true);
    listPegawai({ limit: 50 })
      .then((res) => {
        const rows = res.data || [];
        setInitialPegawai(rows);
        setPegawaiCache((prev) => {
          const next = { ...prev };
          rows.forEach((p) => {
            next[String(p.pin)] = p;
          });
          return next;
        });
      })
      .catch(() => {
        addToast('Gagal memuat daftar pegawai', 'error');
      })
      .finally(() => {
        setPegawaiLoading(false);
      });
  }, [addToast]);

  // Debounced server-side pegawai search by name or PIN
  const handlePegawaiSearch = useCallback((query) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = (query || '').trim();
    if (!trimmed) {
      setSearchedPegawai(null);
      setPegawaiLoading(false);
      return;
    }

    setPegawaiLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await listPegawai({ limit: 50, search: trimmed });
        const rows = res.data || [];
        setSearchedPegawai(rows);
        setPegawaiCache((prev) => {
          const next = { ...prev };
          rows.forEach((p) => {
            next[String(p.pin)] = p;
          });
          return next;
        });
      } catch {
        setSearchedPegawai([]);
      } finally {
        setPegawaiLoading(false);
      }
    }, 300);
  }, []);

  // Fetch pegawai's per-device biometric counts when a PIN is selected
  const ensurePegawaiDeviceMapping = useCallback(async (pin) => {
    if (!pin || pegawaiDeviceMappings[pin]) return;
    try {
      const res = await getPegawai(pin);
      if (res?.pegawai?.devices) {
        setPegawaiDeviceMappings((prev) => ({
          ...prev,
          [pin]: res.pegawai.devices,
        }));
      }
    } catch {
      // Ignore if pegawai detail cannot be fetched
    }
  }, [pegawaiDeviceMappings]);

  useEffect(() => {
    if (checkPin) ensurePegawaiDeviceMapping(checkPin);
  }, [checkPin, ensurePegawaiDeviceMapping]);

  useEffect(() => {
    if (tfPin) ensurePegawaiDeviceMapping(tfPin);
  }, [tfPin, ensurePegawaiDeviceMapping]);

  // Build pegawai options ensuring selected PINs are always present in options
  const pegawaiOptions = useMemo(() => {
    const activeList = searchedPegawai !== null ? searchedPegawai : initialPegawai;
    const seen = new Set();
    const list = [];

    // Ensure currently selected PINs remain in the option list so their label stays visible
    [checkPin, tfPin, enPin].forEach((pin) => {
      if (pin && pegawaiCache[String(pin)] && !seen.has(String(pin))) {
        seen.add(String(pin));
        list.push(pegawaiCache[String(pin)]);
      }
    });

    activeList.forEach((p) => {
      const key = String(p.pin);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    });

    return list.map((p) => ({
      value: String(p.pin),
      label: `${p.name || 'Tanpa Nama'} — PIN: ${p.pin}${p.nama_opd ? ` (${p.nama_opd})` : ''}`,
    }));
  }, [initialPegawai, searchedPegawai, pegawaiCache, checkPin, tfPin, enPin]);

  // Helper to build device options (optionally enriched with biometric counts for a selected PIN)
  const buildDeviceOptions = useCallback(
    (pinForBiometricHint = '', excludeSn = '') => {
      const mappings = pinForBiometricHint ? pegawaiDeviceMappings[pinForBiometricHint] || [] : [];
      const mappingBySn = {};
      mappings.forEach((m) => {
        mappingBySn[m.device_sn] = m;
      });

      return devices
        .filter((d) => !excludeSn || d.sn !== excludeSn)
        .map((d) => {
          const baseName = d.device_name || d.name || d.sn;
          const baseLabel = baseName !== d.sn ? `${baseName} (${d.sn})` : d.sn;
          const m = mappingBySn[d.sn];
          const fpCount = Number(m?.fingerprint_count || 0);
          const faceCount = Number(m?.face_count || 0);
          const bioHint =
            m && (fpCount > 0 || faceCount > 0)
              ? ` — [${fpCount} FP, ${faceCount} Wajah]`
              : '';
          return {
            value: d.sn,
            label: `${baseLabel}${bioHint}`,
          };
        });
    },
    [devices, pegawaiDeviceMappings]
  );

  const checkDeviceOptions = useMemo(
    () => buildDeviceOptions(checkPin),
    [buildDeviceOptions, checkPin]
  );

  const tfSourceDeviceOptions = useMemo(
    () => buildDeviceOptions(tfPin),
    [buildDeviceOptions, tfPin]
  );

  const tfTargetDeviceOptions = useMemo(
    () => buildDeviceOptions('', tfSource),
    [buildDeviceOptions, tfSource]
  );

  const enrollDeviceOptions = useMemo(
    () => buildDeviceOptions(enPin),
    [buildDeviceOptions, enPin]
  );

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!checkPin || !checkSn) {
      addToast('Pilih Pegawai (PIN) dan Perangkat (Device SN) terlebih dahulu', 'error');
      return;
    }
    setCheckLoading(true);
    try {
      const [fpRes, faceRes] = await Promise.allSettled([
        checkFingerprint(checkPin, checkSn),
        checkFace(checkPin, checkSn),
      ]);
      const fpData = fpRes.status === 'fulfilled' ? fpRes.value : { count: 0, fingerprints: [] };
      const faceData = faceRes.status === 'fulfilled' ? faceRes.value : { count: 0, faces: [] };

      setCheckResult({
        pin: checkPin,
        pegawaiName: pegawaiCache[String(checkPin)]?.name || null,
        sn: checkSn,
        deviceName: devices.find((d) => d.sn === checkSn)?.device_name || devices.find((d) => d.sn === checkSn)?.name || null,
        fpCount: fpData.count || 0,
        fingerprints: fpData.fingerprints || [],
        faceCount: faceData.count || 0,
        faces: faceData.faces || [],
      });
      addToast(`Ditemukan ${fpData.count || 0} sidik jari & ${faceData.count || 0} segmen wajah`);
    } catch (err) {
      setCheckResult(null);
      addToast(err.message || 'Check failed', 'error');
    } finally {
      setCheckLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!tfPin || !tfSource || !tfTarget) {
      addToast('Pilih Pegawai (PIN), Source Device, dan Target Device terlebih dahulu', 'error');
      return;
    }
    if (tfSource === tfTarget) {
      addToast('Source Device dan Target Device tidak boleh sama', 'error');
      return;
    }
    setTfLoading(true);
    try {
      let res;
      if (tfMode === 'face') {
        res = await transferFace(tfTarget, { pin: tfPin, source_sn: tfSource });
      } else if (tfMode === 'fp') {
        res = await transferFingerprint(tfTarget, { pin: tfPin, source_sn: tfSource });
      } else {
        res = await transferAllBiometrics(tfTarget, { pin: tfPin, source_sn: tfSource });
      }
      addToast(res.message || 'Transfer biometrik berhasil diantrekan');
    } catch (err) {
      addToast(err.message || 'Transfer failed', 'error');
    } finally {
      setTfLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!enSn || !enPin) {
      addToast('Pilih Perangkat (Device SN) dan Pegawai (PIN) terlebih dahulu', 'error');
      return;
    }
    setEnLoading(true);
    try {
      await enrollFingerprint(enSn, { pin: enPin, fid: enFid, retry: enRetry, overwrite: enOverwrite });
      addToast('Enroll command queued');
    } catch (err) {
      addToast(err.message || 'Enroll failed', 'error');
    } finally {
      setEnLoading(false);
    }
  };

  const tabs = [
    { key: 'check', label: 'Check', icon: Search },
    { key: 'transfer', label: 'Transfer', icon: ArrowRight },
    { key: 'enroll', label: 'Enroll', icon: PlusCircle },
  ];

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Biometrik (Sidik Jari & Wajah)</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cek, transfer lintas perangkat (Sidik Jari & 12 Segmen Wajah ADMS), dan enroll sidik jari baru</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-0">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  active
                    ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Check Tab */}
      {tab === 'check' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#18192d] rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-5">
            <form onSubmit={handleCheck} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Pegawai (PIN)</label>
                  <SearchableSelect
                    value={checkPin}
                    onChange={setCheckPin}
                    options={pegawaiOptions}
                    onSearchChange={handlePegawaiSearch}
                    loading={pegawaiLoading}
                    searchable={true}
                    defaultOptionLabel={null}
                    placeholder="Cari nama atau pilih PIN..."
                    searchPlaceholder="Ketik nama pegawai atau PIN..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Device SN</label>
                  <SearchableSelect
                    value={checkSn}
                    onChange={setCheckSn}
                    options={checkDeviceOptions}
                    loading={devicesLoading}
                    searchable={true}
                    defaultOptionLabel={null}
                    placeholder="Pilih perangkat..."
                    searchPlaceholder="Cari nama perangkat atau SN..."
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={checkLoading || !checkPin || !checkSn}
                    className="w-full px-4 py-2 text-sm font-medium rounded-xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98] min-h-[38px]"
                  >
                    {checkLoading ? 'Checking...' : 'Cek Biometrik'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {checkResult && (
            <div className="bg-white dark:bg-[#18192d] rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hasil Pemeriksaan Biometrik</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {checkResult.pegawaiName && (
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{checkResult.pegawaiName} </span>
                    )}
                    (PIN <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{checkResult.pin}</span>) pada perangkat{' '}
                    {checkResult.deviceName && (
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{checkResult.deviceName} </span>
                    )}
                    (<span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{checkResult.sn}</span>)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <FpIcon size={13} />
                    {checkResult.fpCount} Sidik Jari
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                    <ScanFace size={13} />
                    {checkResult.faceCount}/12 Segmen Wajah
                  </span>
                </div>
              </div>
              {checkResult.fingerprints?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Finger ID</th>
                        <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Template (preview)</th>
                        <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Synced At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {checkResult.fingerprints.map(fp => (
                        <tr key={fp.finger_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-200">{fp.finger_id}</td>
                          <td className="px-6 py-3.5 text-slate-400 font-mono text-xs truncate max-w-xs">{fp.template?.slice(0, 40)}...</td>
                          <td className="px-6 py-3.5 text-slate-500 text-xs">{fp.synced_at ? new Date(fp.synced_at).toLocaleString('id-ID') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {checkResult.faces?.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Segmen Wajah Tersimpan (ZKFace v7)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {checkResult.faces.map((fc) => (
                      <span
                        key={fc.face_id}
                        className="px-2 py-1 rounded-md text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                      >
                        FID #{fc.face_id} ({fc.size}B)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transfer Tab */}
      {tab === 'transfer' && (
        <div className="max-w-lg">
          <div className="bg-white dark:bg-[#18192d] rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Transfer Biometrik Lintas Perangkat</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Transfer data User, Sidik Jari, dan/atau 12 Segmen Wajah dari perangkat sumber ke perangkat tujuan</p>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Mode Transfer</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Semua (FP + Face)', icon: Layers },
                    { id: 'fp', label: 'Sidik Jari Saja', icon: FpIcon },
                    { id: 'face', label: 'Wajah Saja (12 FID)', icon: ScanFace },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = tfMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setTfMode(mode.id)}
                        className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={15} />
                        <span className="text-[11px] text-center">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Pegawai (PIN)</label>
                <SearchableSelect
                  value={tfPin}
                  onChange={setTfPin}
                  options={pegawaiOptions}
                  onSearchChange={handlePegawaiSearch}
                  loading={pegawaiLoading}
                  searchable={true}
                  defaultOptionLabel={null}
                  placeholder="Cari nama atau pilih PIN..."
                  searchPlaceholder="Ketik nama pegawai atau PIN..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Source Device SN</label>
                <SearchableSelect
                  value={tfSource}
                  onChange={(val) => {
                    setTfSource(val);
                    if (val && val === tfTarget) {
                      setTfTarget('');
                    }
                  }}
                  options={tfSourceDeviceOptions}
                  loading={devicesLoading}
                  searchable={true}
                  defaultOptionLabel={null}
                  placeholder="Pilih perangkat sumber..."
                  searchPlaceholder="Cari perangkat sumber (nama / SN)..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Target Device SN</label>
                <SearchableSelect
                  value={tfTarget}
                  onChange={setTfTarget}
                  options={tfTargetDeviceOptions}
                  loading={devicesLoading}
                  searchable={true}
                  defaultOptionLabel={null}
                  placeholder="Pilih perangkat tujuan..."
                  searchPlaceholder="Cari perangkat tujuan (nama / SN)..."
                />
              </div>
              <button
                type="submit"
                disabled={tfLoading || !tfPin || !tfSource || !tfTarget}
                className="w-full px-4 py-2 text-sm font-medium rounded-xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
              >
                {tfLoading ? 'Queueing...' : 'Queue Transfer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Tab */}
      {tab === 'enroll' && (
        <div className="max-w-lg">
          <div className="bg-white dark:bg-[#18192d] rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Enroll Fingerprint</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Daftarkan fingerprint baru pada perangkat</p>
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Device SN</label>
                <SearchableSelect
                  value={enSn}
                  onChange={setEnSn}
                  options={enrollDeviceOptions}
                  loading={devicesLoading}
                  searchable={true}
                  defaultOptionLabel={null}
                  placeholder="Pilih perangkat..."
                  searchPlaceholder="Cari nama perangkat atau SN..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Pegawai (PIN)</label>
                <SearchableSelect
                  value={enPin}
                  onChange={setEnPin}
                  options={pegawaiOptions}
                  onSearchChange={handlePegawaiSearch}
                  loading={pegawaiLoading}
                  searchable={true}
                  defaultOptionLabel={null}
                  placeholder="Cari nama atau pilih PIN..."
                  searchPlaceholder="Ketik nama pegawai atau PIN..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Finger ID</label>
                  <select
                    value={enFid}
                    onChange={e => setEnFid(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
                  >
                    {[...Array(10).keys()].map((i) => (
                      <option key={i} value={i}>
                        Jari #{i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Retry</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={enRetry}
                    onChange={e => setEnRetry(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Overwrite</label>
                  <select
                    value={enOverwrite}
                    onChange={e => setEnOverwrite(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={enLoading || !enSn || !enPin}
                className="w-full px-4 py-2 text-sm font-medium rounded-xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
              >
                {enLoading ? 'Queueing...' : 'Queue Enroll'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
