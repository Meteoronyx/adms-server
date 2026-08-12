import { useState } from 'react';
import {
  checkFingerprint,
  transferFingerprint,
  enrollFingerprint,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Search, ArrowRight, PlusCircle } from 'lucide-react';

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
      const data = await checkFingerprint(checkPin, checkSn);
      setCheckResult(data);
      addToast(`Found ${data.count} fingerprint(s)`);
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
      await transferFingerprint(tfTarget, { pin: tfPin, source_sn: tfSource });
      addToast('Transfer queued successfully');
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fingerprint Management</h1>
        <p className="text-sm text-slate-500 mt-1">Check, transfer, dan enroll fingerprint pada perangkat</p>
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
                <Icon size={16} strokeWidth={active ? 2 : 1.7} />
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
                    {checkLoading ? 'Checking...' : 'Check Fingerprint'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {checkResult && (
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Hasil Pemeriksaan</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Found <span className="font-semibold text-slate-700">{checkResult.count}</span> fingerprint(s) for PIN{' '}
                  <span className="font-mono text-slate-700">{checkResult.pegawai_pin}</span> on device{' '}
                  <span className="font-mono text-slate-700">{checkResult.device}</span>
                </p>
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
            </div>
          )}
        </div>
      )}

      {/* Transfer Tab */}
      {tab === 'transfer' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Transfer Fingerprint</h3>
            <p className="text-xs text-slate-500 mb-5">Transfer fingerprint dari source device ke target device</p>
            <form onSubmit={handleTransfer} className="space-y-4">
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
