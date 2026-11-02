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
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export function ExportPegawaiModal({
  open,
  onOpenChange,
  initialPegawai = null,
}) {
  const { addToast } = useToast();

  const now = new Date();
  const [selectedPegawai, setSelectedPegawai] = useState(initialPegawai);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryNip, setSignatoryNip] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [location, setLocation] = useState('');
  const [showSignatory, setShowSignatory] = useState(false);

  const [loadingMode, setLoadingMode] = useState(null);

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

  useEffect(() => {
    if (open) {
      if (initialPegawai) {
        setSelectedPegawai(initialPegawai);
      }
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [initialPegawai, open]);

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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          signatoryName: signatoryName.trim(),
          signatoryNip: signatoryNip.trim(),
          signatoryTitle: signatoryTitle.trim(),
          location: location.trim(),
        })
      );
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
        preview,
      });

      if (!preview) {
        addToast(
          `Rekap presensi ${selectedPegawai.name || `PIN ${selectedPegawai.pin}`} berhasil diunduh`,
          'success'
        );
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
    setMonth(String(d.getMonth() + 1));
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
      description="Unduh atau pratinjau rekapitulasi kehadiran bulanan pegawai dalam format PDF."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(loadingMode)}
            className="h-8 px-3.5 text-xs font-medium text-ink bg-surface border border-control hover:bg-raised rounded-[6px] transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport(true)}
              disabled={!selectedPegawai || Boolean(loadingMode)}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium border border-control bg-surface hover:bg-raised text-ink rounded-[6px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingMode === 'preview' ? (
                <Loader2 size={13} className="animate-spin text-accent" />
              ) : (
                <Eye size={13} />
              )}
              <span>Pratinjau</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport(false)}
              disabled={!selectedPegawai || Boolean(loadingMode)}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium bg-ink hover:bg-ink/90 text-white rounded-[6px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingMode === 'download' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
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
          <label className="block text-sm font-medium text-ink mb-2">
            Pegawai <span className="text-negative">*</span>
          </label>

          {selectedPegawai ? (
            <div className="flex items-center justify-between p-3 bg-raised border border-border rounded-[6px]">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-medium text-ink truncate">
                  {selectedPegawai.name || `Pegawai ${selectedPegawai.pin}`}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  <span className="font-mono font-medium">PIN {selectedPegawai.pin}</span> {/* taste-skill-ignore */}
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
                disabled={Boolean(loadingMode)}
                className="text-xs font-medium text-accent hover:underline px-2 py-1 rounded-[4px] transition-colors shrink-0"
              >
                Ganti
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau PIN pegawai…"
                  className="w-full h-[38px] pl-9 pr-9 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint transition-colors"
                />
                {isSearching ? (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {searchQuery.trim().length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface border border-border rounded-[8px] divide-y divide-rule">
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
                        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-raised text-left text-xs transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{p.name}</p>
                          <p className="text-xs text-muted font-mono"> {/* taste-skill-ignore */}
                            PIN: {p.pin} {p.nama_opd ? `· ${p.nama_opd}` : ''}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-accent shrink-0 ml-2">
                          Pilih
                        </span>
                      </button>
                    ))
                  ) : !isSearching ? (
                    <div className="px-3.5 py-3 text-center text-xs text-muted">
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-ink">
              Periode Laporan
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMonthPreset(0)}
                className="text-xs text-muted hover:text-accent hover:underline"
              >
                Bulan Ini
              </button>
              <span className="text-control">·</span>
              <button
                type="button"
                onClick={() => setMonthPreset(-1)}
                className="text-xs text-muted hover:text-accent hover:underline"
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
                className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink transition-colors"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={String(m.value)}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-[38px] px-3 text-sm bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink num transition-colors"
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

        {/* Data Penandatangan */}
        <div className="pt-2 border-t border-rule">
          <button
            type="button"
            onClick={() => setShowSignatory(!showSignatory)}
            className="flex items-center justify-between w-full text-xs font-medium text-ink hover:text-accent py-1"
          >
            <div className="flex items-center gap-2">
              <span>Data Penandatangan (Opsional)</span>
              {hasSignatoryData && (
                <span className="text-xs font-normal text-positive-ink bg-positive-bg px-1.5 py-0.5 rounded-[4px]">
                  Tersimpan
                </span>
              )}
            </div>
            {showSignatory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSignatory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Nama Atasan / Kepala OPD
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Si"
                  className="w-full h-8 px-2.5 text-xs bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  NIP Atasan
                </label>
                <input
                  type="text"
                  value={signatoryNip}
                  onChange={(e) => setSignatoryNip(e.target.value)}
                  placeholder="Contoh: 19780512 200501 1 002"
                  className="w-full h-8 px-2.5 text-xs bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint num"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Jabatan Atasan
                </label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="Contoh: Kepala Dinas Kominfo"
                  className="w-full h-8 px-2.5 text-xs bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Kota / Lokasi Cetak
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Contoh: Tigaraksa"
                  className="w-full h-8 px-2.5 text-xs bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent text-ink placeholder:text-faint"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
