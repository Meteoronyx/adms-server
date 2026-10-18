import { useState } from 'react';
import {
  checkFingerprint,
  checkFace,
  transferFingerprint,
  transferFace,
  transferAllBiometrics,
  enrollFingerprint,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Search, ArrowRight, PlusCircle, ScanFace, Fingerprint as FpIcon, Layers } from 'lucide-react';

export default function Fingerprint() {
  const [tab, setTab] = useState('check');
  const { addToast } = useToast();

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

  const handleCheck = async (e) => {
    e.preventDefault();
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
        sn: checkSn,
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Biometrik (Sidik Jari & Wajah)</h1>
        <p className="text-sm text-slate-500 mt-1">Cek, transfer lintas perangkat (Sidik Jari & 12 Segmen Wajah ADMS), dan enroll sidik jari baru</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
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
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
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
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
            <form onSubmit={handleCheck} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">PIN</label>
                  <input
                    type="text"
                    value={checkPin}
                    onChange={e => setCheckPin(e.target.value)}
                    placeholder="Masukkan PIN"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Device SN</label>
                  <input
                    type="text"
                    value={checkSn}
                    onChange={e => setCheckSn(e.target.value)}
                    placeholder="Serial number device"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={checkLoading}
                    className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
                  >
                    {checkLoading ? 'Checking...' : 'Cek Biometrik'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {checkResult && (
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Hasil Pemeriksaan Biometrik</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    PIN <span className="font-mono font-semibold text-slate-700">{checkResult.pin}</span> pada perangkat{' '}
                    <span className="font-mono font-semibold text-slate-700">{checkResult.sn}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold">
                    <FpIcon size={13} />
                    {checkResult.fpCount} Sidik Jari
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
                    <ScanFace size={13} />
                    {checkResult.faceCount}/12 Segmen Wajah
                  </span>
                </div>
              </div>
              {checkResult.fingerprints?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Finger ID</th>
                        <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Template (preview)</th>
                        <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Synced At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {checkResult.fingerprints.map(fp => (
                        <tr key={fp.finger_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5 font-mono text-slate-700">{fp.finger_id}</td>
                          <td className="px-6 py-3.5 text-slate-400 font-mono text-xs truncate max-w-xs">{fp.template?.slice(0, 40)}...</td>
                          <td className="px-6 py-3.5 text-slate-500 text-xs">{fp.synced_at ? new Date(fp.synced_at).toLocaleString('id-ID') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {checkResult.faces?.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Segmen Wajah Tersimpan (ZKFace v7)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {checkResult.faces.map((fc) => (
                      <span
                        key={fc.face_id}
                        className="px-2 py-1 rounded-md text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/60"
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
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Transfer Biometrik Lintas Perangkat</h3>
            <p className="text-xs text-slate-500 mb-5">Transfer data User, Sidik Jari, dan/atau 12 Segmen Wajah dari perangkat sumber ke perangkat tujuan</p>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Mode Transfer</label>
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
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
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
                <label className="block text-xs font-medium text-slate-500 mb-1.5">PIN</label>
                <input
                  type="text"
                  value={tfPin}
                  onChange={e => setTfPin(e.target.value)}
                  placeholder="Masukkan PIN"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Source Device SN</label>
                <input
                  type="text"
                  value={tfSource}
                  onChange={e => setTfSource(e.target.value)}
                  placeholder="Serial number sumber"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Target Device SN</label>
                <input
                  type="text"
                  value={tfTarget}
                  onChange={e => setTfTarget(e.target.value)}
                  placeholder="Serial number tujuan"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={tfLoading}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
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
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Enroll Fingerprint</h3>
            <p className="text-xs text-slate-500 mb-5">Daftarkan fingerprint baru pada perangkat</p>
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Device SN</label>
                <input
                  type="text"
                  value={enSn}
                  onChange={e => setEnSn(e.target.value)}
                  placeholder="Serial number device"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">PIN</label>
                <input
                  type="text"
                  value={enPin}
                  onChange={e => setEnPin(e.target.value)}
                  placeholder="Masukkan PIN"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Finger ID</label>
                  <input
                    type="number"
                    value={enFid}
                    onChange={e => setEnFid(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Retry</label>
                  <input
                    type="number"
                    value={enRetry}
                    onChange={e => setEnRetry(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Overwrite</label>
                  <select
                    value={enOverwrite}
                    onChange={e => setEnOverwrite(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={enLoading}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
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
