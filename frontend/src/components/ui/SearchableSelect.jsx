import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Loader2 } from 'lucide-react';

export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih…',
  defaultOptionLabel = 'Semua',
  disabled = false,
  className = '',
  size = 'sm', // 'xs' | 'sm' | 'md'
  searchable,
  onSearchChange,
  loading = false,
  searchPlaceholder = 'Cari…',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const isSearchEnabled =
    searchable !== undefined ? searchable : Boolean(onSearchChange) || options.length > 5;

  const updateSearch = (val) => {
    setSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

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
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const isXs = size === 'xs';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full ${
          isXs ? 'px-2.5 h-8 text-xs' : 'px-3 h-[38px] text-sm'
        } bg-surface border border-control rounded-[6px] focus:outline-none focus:border-accent hover:border-muted/60 transition-colors flex items-center justify-between text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={() => {
          if (disabled) return;
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) updateSearch('');
        }}
      >
        <span
          className={`truncate pr-2 ${
            selectedOption ? 'text-ink font-medium' : 'text-muted'
          }`}
        >
          {selectedOption ? selectedOption.label : defaultOptionLabel || placeholder}
        </span>
        <ChevronDown
          size={isXs ? 13 : 15}
          className={`text-muted shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-ink' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-[8px] overflow-hidden py-1">
          {isSearchEnabled && (
            <div className="px-2.5 py-2 border-b border-rule flex items-center gap-2 bg-raised/60">
              {loading ? (
                <Loader2 size={13} className="text-accent shrink-0 animate-spin" />
              ) : (
                <Search size={13} className="text-muted shrink-0" />
              )}
              <input
                type="text"
                autoFocus
                className="w-full text-xs outline-none placeholder:text-faint bg-transparent text-ink"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {defaultOptionLabel &&
              (!search || defaultOptionLabel.toLowerCase().includes(search.toLowerCase())) && (
                <div
                  className={`px-3 ${
                    isXs ? 'py-1.5 text-xs' : 'py-2 text-sm'
                  } cursor-pointer transition-colors flex items-center justify-between ${
                    !value || value === '' || value === 'all'
                      ? 'bg-accent-soft font-medium text-accent-ink'
                      : 'text-ink hover:bg-raised'
                  }`}
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                    updateSearch('');
                  }}
                >
                  <span>{defaultOptionLabel}</span>
                  {(!value || value === '' || value === 'all') && (
                    <Check size={isXs ? 13 : 15} className="text-accent shrink-0" />
                  )}
                </div>
              )}
            {filteredOptions.map((opt) => {
              const isSelected = String(value) === String(opt.value);
              return (
                <div
                  key={opt.value}
                  className={`px-3 ${
                    isXs ? 'py-1.5 text-xs' : 'py-2 text-sm'
                  } cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-accent-soft font-medium text-accent-ink'
                      : 'text-ink hover:bg-raised'
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    updateSearch('');
                  }}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <Check size={isXs ? 13 : 15} className="text-accent shrink-0" />
                  )}
                </div>
              );
            })}
            {filteredOptions.length === 0 &&
              (!defaultOptionLabel ||
                !defaultOptionLabel.toLowerCase().includes(search.toLowerCase())) && (
                <div className="px-3 py-3 text-xs text-muted text-center">
                  {loading ? 'Mencari data…' : 'Tidak ada hasil ditemukan'}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
