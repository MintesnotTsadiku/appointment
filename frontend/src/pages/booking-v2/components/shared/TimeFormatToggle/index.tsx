/**
 * Time Format Toggle - Enhanced with examples
 * Supports 12H, 24H, and Ethiopian time formats
 */

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { getTimeFormatExample } from "../../../utils/ethiopianTime";
import type { TimeFormatToggleProps } from "../../../types";

export function TimeFormatToggle({
  value,
  onChange,
  showLabels = true,
  className,
}: TimeFormatToggleProps) {
  const { t } = useTranslation();
  const formats: Array<{ value: '12h' | '24h' | 'ethiopian'; label: string; example: string }> = [
    { value: '12h', label: t('bookingPicker.h12'), example: getTimeFormatExample('12h') },
    { value: '24h', label: t('bookingPicker.h24'), example: getTimeFormatExample('24h') },
    { value: 'ethiopian', label: 'ሰዓት (Local)', example: getTimeFormatExample('ethiopian') },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("bookingPicker.timeFormat")}
        </label>
      )}
      
      <div className="inline-flex items-center rounded-xl p-1 gap-1" style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
        {formats.map((format) => (
          <button
            key={format.value}
            onClick={() => onChange(format.value)}
            className={cn(
              "relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2",
              value === format.value && "shadow-sm"
            )}
            style={{
              color: value === format.value ? "var(--pe-color-on-primary)" : "var(--text-secondary)",
              background: value === format.value
                ? "linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))"
                : "transparent",
            }}
            aria-label={`Select ${format.label} time format`}
            aria-pressed={value === format.value}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-semibold">{format.label}</span>
              <span className="text-xs opacity-75">{format.example}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

