import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export function SearchableSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Pilih...",
  defaultOptionLabel = "Semua",
  disabled = false,
  className = "",
  size = "sm", // 'xs' | 'sm' | 'md'
  searchable,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 5;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const isXs = size === 'xs';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={`w-full ${
          isXs ? 'px-3 py-1.5 text-xs min-h-[30px]' : 'px-3 py-2 text-sm min-h-[38px]'
        } bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <span className={`truncate pr-2 ${selectedOption ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
          {selectedOption ? selectedOption.label : (defaultOptionLabel || placeholder)}
        </span>
        <ChevronDown 
          size={isXs ? 13 : 15} 
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} 
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#18192d] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden py-1">
          {isSearchEnabled && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                className="w-full text-xs outline-none placeholder:text-slate-400 bg-transparent text-slate-900 dark:text-slate-100"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {defaultOptionLabel && (!search || defaultOptionLabel.toLowerCase().includes(search.toLowerCase())) && (
              <div 
                className={`px-3 ${isXs ? 'py-1.5 text-xs' : 'py-2 text-sm'} cursor-pointer transition-colors flex items-center justify-between ${
                  !value || value === '' || value === 'all'
                    ? "bg-indigo-50 dark:bg-indigo-950/40 font-semibold text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                }`}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <span>{defaultOptionLabel}</span>
                {(!value || value === '' || value === 'all') && (
                  <Check size={isXs ? 13 : 15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </div>
            )}
            {filteredOptions.map(opt => {
              const isSelected = String(value) === String(opt.value);
              return (
                <div 
                  key={opt.value}
                  className={`px-3 ${isXs ? 'py-1.5 text-xs' : 'py-2 text-sm'} cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected 
                      ? "bg-indigo-50 dark:bg-indigo-950/40 font-semibold text-indigo-600 dark:text-indigo-400" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <Check size={isXs ? 13 : 15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (!defaultOptionLabel || !defaultOptionLabel.toLowerCase().includes(search.toLowerCase())) && (
              <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center italic">
                Tidak ada hasil ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
