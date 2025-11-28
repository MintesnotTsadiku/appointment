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

  const selectedOption = options.find(opt => opt.name === value);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
          value 
            ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300' 
            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
        }`}
      >
        {icon}
        <span className="min-w-[120px] text-left">
          {selectedOption?.displayName || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          <div className="p-2">
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                !value 
                  ? 'bg-violet-500/20 text-violet-300' 
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-[10px]">All</span>
              </div>
              <span>All {placeholder.replace('All ', '')}</span>
            </button>
            
            <div className="h-px bg-white/5 my-2" />
            
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.name}
                  onClick={() => {
                    onChange(option.name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    value === option.name 
                      ? 'bg-violet-500/20 text-violet-300' 
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    value === option.name ? 'bg-violet-500' : 'bg-white/20'
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
    <div className="flex items-center gap-4 mb-6 p-4 bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl">
      <div className="flex items-center gap-2 text-gray-500 pr-4 border-r border-white/10">
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
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear</span>
        </motion.button>
      )}
    </div>
  );
};
