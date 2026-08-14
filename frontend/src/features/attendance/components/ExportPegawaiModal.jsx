import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../hooks/useToast';
import { searchPegawai, exportAttendancePdf } from '../../../lib/api';
import {
  FileDown,
  Eye,
  Search,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STORAGE_KEY = 'dbspot_attendance_signatory';

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export function ExportPegawaiModal({
  open,
  onOpenChange,
  initialPegawai = null, // { pin, name, nama_opd }
}) {
  const { addToast } = useToast();

  const now = new Date();
  const [selectedPegawai, setSelectedPegawai] = useState(initialPegawai);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));

  // Signatory & Location fields
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryNip, setSignatoryNip] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [location, setLocation] = useState('');
  const [showSignatory, setShowSignatory] = useState(false);

  const [loadingMode, setLoadingMode] = useState(null); // 'preview' | 'download' | null

  // Load signatory cache from localStorage on open
  useEffect(() => {
    if (open) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.signatoryName) setSignatoryName(parsed.signatoryName);
          if (parsed.signatoryNip) setSignatoryNip(parsed.signatoryNip);
          if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
          if (parsed.location) setLocation(parsed.location);
        }
      } catch {
        // Ignore JSON parse error
      }
    }
  }, [open]);

  // Sync initialPegawai when modal opens or initialPegawai changes
  useEffect(() => {
    if (open) {
      if (initialPegawai) {
        setSelectedPegawai(initialPegawai);
      }
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [initialPegawai, open]);

  // Debounced search for pegawai
  useEffect(() => {
    if (!open || selectedPegawai || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchPegawai(searchQuery.trim(), 8);
        setSearchResults(res.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, selectedPegawai]);

  const saveSignatoryToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        signatoryName: signatoryName.trim(),
        signatoryNip: signatoryNip.trim(),
        signatoryTitle: signatoryTitle.trim(),
        location: location.trim(),
      }));
    } catch {
      // Ignore quota errors
    }
  }, [signatoryName, signatoryNip, signatoryTitle, location]);

  const handleExport = async (preview = false) => {
    if (!selectedPegawai?.pin) {
      addToast('Silakan pilih pegawai terlebih dahulu', 'error');
      return;
    }

    setLoadingMode(preview ? 'preview' : 'download');
    saveSignatoryToStorage();

    try {
      await exportAttendancePdf({
        pin: selectedPegawai.pin,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        signatoryName: signatoryName.trim(),
        signatoryNip: signatoryNip.trim(),
        signatoryTitle: signatoryTitle.trim(),
        location: location.trim(),
        preview
      });

      if (!preview) {
        addToast(`Rekap presensi ${selectedPegawai.name || `PIN ${selectedPegawai.pin}`} berhasil diunduh`, 'success');
        onOpenChange(false);
      }
    } catch (err) {
      addToast(err.message || 'Gagal mengekspor rekap presensi PDF', 'error');
    } finally {
      setLoadingMode(null);
    }
  };

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  const setMonthPreset = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    setMonth(String(d.getMonth() + 1).padStart(2, '0'));
    setYear(String(d.getFullYear()));
  };

  const hasSignatoryData = Boolean(
    signatoryName.trim() || signatoryNip.trim() || signatoryTitle.trim() || location.trim()
  );

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!loadingMode) onOpenChange(isOpen);
      }}
      title="Ekspor Rekap Presensi Pegawai"
      description="Unduh atau pratinjau rekapitulasi kehadiran bulanan pegawai."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={!!loadingMode}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport(true)}
              disabled={!selectedPegawai || !!loadingMode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingMode === 'preview' ? (
                <Loader2 size={14} className="animate-spin text-indigo-600" />
              ) : (
                <Eye size={14} />
              )}
              <span>Pratinjau</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport(false)}
              disabled={!selectedPegawai || !!loadingMode}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingMode === 'download' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileDown size={14} />
              )}
              <span>Unduh Laporan</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* Pegawai Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Pegawai <span className="text-rose-500">*</span>
          </label>

          {selectedPegawai ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {selectedPegawai.name || `Pegawai ${selectedPegawai.pin}`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-mono font-medium">PIN {selectedPegawai.pin}</span>
                  {selectedPegawai.nama_opd && <span> · {selectedPegawai.nama_opd}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPegawai(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                disabled={!!loadingMode}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline px-2 py-1 rounded-md transition-colors shrink-0"
              >
                Ganti
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau PIN pegawai..."
                  className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors"
                />
                {isSearching ? (
                  <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Autocomplete Search Dropdown */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.pin}
                        type="button"
                        onClick={() => {
                          setSelectedPegawai(p);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-left text-xs transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            PIN: {p.pin} {p.nama_opd ? `· ${p.nama_opd}` : ''}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                          Pilih
                        </span>
                      </button>
                    ))
                  ) : !isSearching ? (
                    <div className="px-3.5 py-3 text-center text-xs text-slate-400">
                      Tidak ditemukan pegawai
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Periode Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Periode
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMonthPreset(0)}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
              >
                Bulan Ini
              </button>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <button
                type="button"
                onClick={() => setMonthPreset(-1)}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
              >
                Bulan Lalu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-colors"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-colors"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Penandatangan (Collapsible) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowSignatory(!showSignatory)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 py-1"
          >
            <div className="flex items-center gap-2">
              <span>Data Penandatangan (Opsional)</span>
              {hasSignatoryData && (
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  Tersimpan
                </span>
              )}
            </div>
            {showSignatory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSignatory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Nama Atasan / Kepala OPD
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="misal: Drs. H. Ahmad Fauzi, M.Si"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  NIP Atasan
                </label>
                <input
                  type="text"
                  value={signatoryNip}
                  onChange={(e) => setSignatoryNip(e.target.value)}
                  placeholder="misal: 19780512 200501 1 002"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Jabatan Atasan
                </label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="misal: Kepala Dinas Kominfo"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Kota / Lokasi Cetak
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="misal: Surabaya"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

