/**
 * Time Format Toggle - Enhanced with examples
 * Supports 12H, 24H, and Ethiopian time formats
 */

import { cn } from "@/lib/utils";
import { getTimeFormatExample } from "../../../utils/ethiopianTime";
import type { TimeFormatToggleProps } from "../../../types";

export function TimeFormatToggle({
  value,
  onChange,
  showLabels = true,
  className,
}: TimeFormatToggleProps) {
  const formats: Array<{ value: '12h' | '24h' | 'ethiopian'; label: string; example: string }> = [
    { value: '12h', label: '12-Hour', example: getTimeFormatExample('12h') },
    { value: '24h', label: '24-Hour', example: getTimeFormatExample('24h') },
    { value: 'ethiopian', label: 'ሰዓት (Local)', example: getTimeFormatExample('ethiopian') },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Time Format
        </label>
      )}
      
      <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {formats.map((format) => (
          <button
            key={format.value}
            onClick={() => onChange(format.value)}
            className={cn(
              "relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
              "hover:bg-white/50 dark:hover:bg-gray-700/50",
              value === format.value
                ? [
                    "bg-white dark:bg-gray-700",
                    "text-primary-600 dark:text-primary-400",
                    "shadow-sm",
                  ]
                : "text-gray-700 dark:text-gray-300"
            )}
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

