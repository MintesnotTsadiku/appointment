import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Label } from '@/components/label';

const FALLBACK_ZONES = ['Africa/Addis_Ababa', 'UTC', 'Africa/Nairobi', 'Africa/Cairo', 'Asia/Kolkata', 'Europe/London', 'America/New_York'];

function allTimeZones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone');
    if (supported?.length) return supported;
  } catch {
    /* fall through */
  }
  return FALLBACK_ZONES;
}

interface TimeZoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Searchable, human-readable time-zone picker with Addis Ababa first.
 * Time zone is a separate choice from clock format.
 */
export function TimeZoneSelect({ value, onChange, label = 'Time zone', id = 'timezone', disabled }: TimeZoneSelectProps) {
  const zones = useMemo(() => {
    const all = allTimeZones();
    return ['Africa/Addis_Ababa', ...all.filter((zone) => zone !== 'Africa/Addis_Ababa')];
  }, []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = (query || value).toLowerCase().trim();
    const matches = needle ? zones.filter((zone) => zone.toLowerCase().includes(needle)) : zones;
    return matches.slice(0, 60);
  }, [query, value, zones]);

  const choose = (zone: string) => {
    onChange(zone);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Label htmlFor={id} className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          id={id}
          data-qa="timezone-select"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          autoComplete="off"
          disabled={disabled}
          className="h-10 w-full rounded-lg border pl-9 pr-9 text-sm outline-none focus-visible:ring-2"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          value={open ? query : value}
          placeholder="Search time zones, e.g. Addis Ababa"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && open && filtered[0]) {
              event.preventDefault();
              choose(filtered[0]);
            }
            if (event.key === 'Escape') setOpen(false);
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
      </div>
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border p-1 shadow-xl"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              No matching time zone
            </li>
          )}
          {filtered.map((zone) => (
            <li key={zone} role="option" aria-selected={zone === value}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(zone)}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-[var(--border-subtle)]"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>{zone.replace(/_/g, ' ')}</span>
                {zone === value && <Check className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TimeZoneSelect;
