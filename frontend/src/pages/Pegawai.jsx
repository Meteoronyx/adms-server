import { useState } from 'react';
import { getPegawai, searchPegawai } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Search, User, Fingerprint, ChevronRight, ArrowLeft } from 'lucide-react';

export default function Pegawai() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('name');
  const [results, setResults] = useState(null);
  const [pegawai, setPegawai] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setPegawai(null);
    setResults(null);
    try {
      if (mode === 'pin') {
        const data = await getPegawai(query.trim());
        setPegawai(data.pegawai);
      } else {
        const data = await searchPegawai(query.trim(), 10);
        setResults(data.results);
        if (data.results.length === 0) {
          addToast('Tidak ada pegawai ditemukan', 'error');
        }
      }
    } catch (err) {
      setPegawai(null);
      setResults(null);
      addToast(err.message || 'Pegawai not found', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = async (pin) => {
    setLoading(true);
    try {
      const data = await getPegawai(pin);
      setPegawai(data.pegawai);
      setResults(null);
    } catch (err) {
      addToast(err.message || 'Failed to load pegawai', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setPegawai(null);
    setResults(null);
    setQuery('');
  };

  return (
    <div className="space-y-6 fade-in pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pegawai Lookup</h1>
        <p className="text-sm text-slate-500 mt-1">Cari dan lihat detail data pegawai</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 w-fit rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => { setMode('name'); setResults(null); setPegawai(null); setQuery(''); }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'name' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
          >
            Cari by Nama
          </button>
          <button
            onClick={() => { setMode('pin'); setResults(null); setPegawai(null); setQuery(''); }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'pin' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
          >
            Cari by PIN
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={mode === 'name' ? 'Ketik nama pegawai...' : 'Masukkan PIN...'}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-shadow placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            {loading ? 'Mencari...' : 'Cari'}
          </button>
        </form>
      </div>

      {/* Search Results List (name mode) */}
      {results && results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden max-w-2xl">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Hasil Pencarian
              <span className="ml-2 text-xs font-normal text-slate-400">({results.length} ditemukan)</span>
            </h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {results.map(r => (
              <li key={r.pin}>
                <button
                  onClick={() => handleSelectResult(r.pin)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">
                        PIN: <span className="font-mono">{r.pin}</span>
                        <span className="mx-1.5">·</span>
                        <Fingerprint size={11} className="inline mb-0.5" /> {r.total_fingerprints} fingerprint
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Single Pegawai Detail */}
      {pegawai && (
        <div className="space-y-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={13} /> Kembali ke pencarian
          </button>

          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <User size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{pegawai.name || `Pegawai ${pegawai.pin}`}</h2>
                <p className="text-sm text-slate-500 mt-0.5">PIN: <span className="font-mono text-slate-700">{pegawai.pin}</span></p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5 border-t border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Card</p>
                <p className="text-sm font-semibold text-slate-900">{pegawai.card || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Group</p>
                <p className="text-sm font-semibold text-slate-900">{pegawai.group_no ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Timezone</p>
                <p className="text-sm font-semibold text-slate-900">{pegawai.timezone ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Fingerprints</p>
                <p className="text-sm font-semibold text-slate-900">{pegawai.total_fingerprints}</p>
              </div>
            </div>
          </div>

          {/* Device Mappings Table */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-100">
              <Fingerprint size={16} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Device Mappings</h2>
              <span className="ml-auto text-xs text-slate-400">{(pegawai.devices || []).length} devices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Device SN</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Lokasi</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Privilege</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Fingerprints</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Password</th>
                    <th className="text-left px-6 py-2.5 font-semibold text-slate-500 text-xs tracking-wider uppercase">Synced At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(pegawai.devices || []).map(d => (
                    <tr key={d.device_sn} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-700">{d.device_sn}</td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">{d.device_name || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{d.privilege}</td>
                      <td className="px-6 py-3.5 text-slate-600">{d.fingerprint_count}</td>
                      <td className="px-6 py-3.5 text-slate-600">{d.password}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">{d.synced_at ? new Date(d.synced_at).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))}
                  {(!pegawai.devices || pegawai.devices.length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">Belum ada mapping device untuk pegawai ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
