import { motion } from 'framer-motion';
import { Filter, X, MapPin, User, ChevronDown } from 'lucide-react';
import { Location, Provider } from '../types';
import { useState, useRef, useEffect } from 'react';

interface DeskFiltersProps {
  locations: Location[];
  providers: Provider[];
  selectedLocation: string | null;
  selectedProvider: string | null;
  onLocationChange: (location: string | null) => void;
  onProviderChange: (provider: string | null) => void;
}

interface CustomSelectProps {
  value: string | null;
  options: Array<{ name: string; displayName: string }>;
  placeholder: string;
  icon: React.ReactNode;
  onChange: (value: string | null) => void;
}

const CustomSelect = ({ value, options, placeholder, icon, onChange }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) ref.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.name === value);

  return (
    <div ref={ref} className="relative min-w-0 max-w-full" onKeyDown={event => { if (event.key === 'Escape') { setIsOpen(false); ref.current?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')?.focus(); } }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex min-h-11 max-w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
          value
            ? 'bg-[var(--accent-primary-light)] border border-[var(--accent-primary)] text-[var(--accent-primary-text)]'
            : 'bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        {icon}
        <span className="w-[120px] truncate text-left">
          {selectedOption?.displayName || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {isOpen && (
        <motion.div
          role="listbox"
          aria-label={placeholder}
          onKeyDown={event => {
            const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
            const index = options.indexOf(document.activeElement as HTMLButtonElement);
            if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
              options[next]?.focus();
            }
          }}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden z-50"
        >
          <div className="p-2">
            <button role="option" aria-selected={!value}
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                !value
                  ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary-text)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <span className="text-[10px]">All</span>
              </div>
              <span>All {placeholder.replace('All ', '')}</span>
            </button>

            <div className="h-px bg-[var(--border-subtle)] my-2" />

            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  role="option" aria-selected={value === option.name}
                  key={option.name}
                  onClick={() => {
                    onChange(option.name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    value === option.name
                      ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary-text)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    value === option.name ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-strong)]'
                  }`} />
                  <span>{option.displayName}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const DeskFilters = ({
  locations,
  providers,
  selectedLocation,
  selectedProvider,
  onLocationChange,
  onProviderChange,
}: DeskFiltersProps) => {
  const hasFilters = selectedLocation || selectedProvider;

  const clearFilters = () => {
    onLocationChange(null);
    onProviderChange(null);
  };

  const locationOptions = locations.map(l => ({ name: l.name, displayName: l.location_name }));
  const providerOptions = providers.map(p => ({ name: p.name, displayName: p.provider_name }));

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-[var(--bg-elevated)] backdrop-blur-sm border border-[var(--border-default)] rounded-2xl">
      <div className="flex items-center gap-2 text-[var(--text-muted)] pr-4 border-r border-[var(--border-default)]">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>

      <CustomSelect
        value={selectedLocation}
        options={locationOptions}
        placeholder="All Locations"
        icon={<MapPin className="w-4 h-4" />}
        onChange={onLocationChange}
      />

      <CustomSelect
        value={selectedProvider}
        options={providerOptions}
        placeholder="All Providers"
        icon={<User className="w-4 h-4" />}
        onChange={onProviderChange}
      />

      {hasFilters && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--border-subtle)] hover:bg-red-500/20 border border-[var(--border-default)] hover:border-red-500/30 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear</span>
        </motion.button>
      )}
    </div>
  );
};
