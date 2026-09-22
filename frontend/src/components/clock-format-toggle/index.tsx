import type { ClockFormat } from '@/lib/time';

const OPTIONS: Array<{ value: ClockFormat; label: string; hint: string }> = [
  { value: '12h', label: '12-hour', hint: '9:30 AM' },
  { value: '24h', label: '24-hour', hint: '09:30' },
  { value: 'ethiopian', label: 'Ethiopian', hint: '3:30 ጠዋት' },
];

interface ClockFormatToggleProps {
  value: ClockFormat;
  onChange: (value: ClockFormat) => void;
  label?: string;
}

/** Clock format is separate from time zone; changing it never changes the time. */
export function ClockFormatToggle({ value, onChange, label = 'Clock format' }: ClockFormatToggleProps) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--border-subtle)' }}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-qa={`clock-format-${option.value}`}
              onClick={() => onChange(option.value)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: selected ? 'var(--bg-elevated)' : 'transparent',
                color: selected ? 'var(--accent-primary)' : 'var(--text-muted)',
                boxShadow: selected ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span className="block">{option.label}</span>
              <span className="block text-[10px] opacity-70">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ClockFormatToggle;
