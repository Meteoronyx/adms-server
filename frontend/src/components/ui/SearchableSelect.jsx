import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export function SearchableSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select...",
  defaultOptionLabel = "All"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-400 transition-shadow flex items-center justify-between cursor-pointer min-h-[38px]"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <span className={`truncate pr-2 ${selectedOption ? "text-slate-900" : "text-slate-500"}`}>
          {selectedOption ? selectedOption.label : (defaultOptionLabel || placeholder)}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              className="w-full text-sm outline-none placeholder:text-slate-400 bg-transparent text-slate-900"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {defaultOptionLabel && defaultOptionLabel.toLowerCase().includes(search.toLowerCase()) && (
              <div 
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${value === "" ? "bg-slate-50 font-medium text-slate-900" : "text-slate-700"}`}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                {defaultOptionLabel}
              </div>
            )}
            {filteredOptions.map(opt => (
              <div 
                key={opt.value}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${value === opt.value ? "bg-slate-50 font-medium text-slate-900" : "text-slate-700"}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                {opt.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (!defaultOptionLabel || !defaultOptionLabel.toLowerCase().includes(search.toLowerCase())) && (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
