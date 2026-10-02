import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column {
  key: string;
  label: string;
  value: number;
  tooltip: ReactNode;
}

interface ColumnChartProps {
  columns: Column[];
  ariaLabel: string;
  /** First/last axis labels; omit to label every column. */
  edgeLabels?: [string, string];
  tone?: 'primary' | 'warning';
  className?: string;
}

/** Single-series columns: ≤24px wide, 4px rounded tops, 2px gaps, hover readout. Grows to fill its parent. */
export function ColumnChart({ columns, ariaLabel, edgeLabels, tone = 'primary', className }: ColumnChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...columns.map((column) => column.value)));
  const hovered = active === null ? null : columns[active];
  return (
    <div className={cn('flex min-h-40 flex-1 flex-col', className)}>
      <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div className="flex flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground" aria-hidden="true">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className="relative min-h-0" onMouseLeave={() => setActive(null)}>
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            <span className="border-t border-border/70" />
            <span className="border-t border-border/70" />
            <span className="border-t border-border" />
          </div>
          <div className="relative flex h-full items-end gap-[2px]" role="img" aria-label={ariaLabel}>
            {columns.map((column, index) => (
              <div key={column.key} className="flex h-full min-w-0 flex-1 items-end justify-center" onMouseEnter={() => setActive(index)}>
                <div
                  className={cn('w-full max-w-[24px] rounded-t-[4px] transition-opacity', tone === 'warning' ? 'bg-warning' : 'bg-chart-1')}
                  style={{ height: `${(column.value / max) * 100}%`, opacity: active === null || active === index ? 1 : 0.45 }}
                />
              </div>
            ))}
          </div>
          {hovered && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-[140px] -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-md border bg-popover px-3 py-2 text-xs shadow-pop"
              style={{ left: `${((active! + 0.5) / columns.length) * 100}%` }}
            >
              {hovered.tooltip}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pl-6 text-[10px] tabular-nums text-muted-foreground">
        {edgeLabels ? (
          <>
            <span>{edgeLabels[0]}</span>
            <span>{edgeLabels[1]}</span>
          </>
        ) : (
          columns.map((column) => (
            <span key={column.key} className="min-w-0 flex-1 truncate text-center">{column.label}</span>
          ))
        )}
      </div>
    </div>
  );
}

/** Round the axis top up to an even, readable number. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = value <= 20 ? 2 : value <= 100 ? 10 : 50;
  return Math.ceil(value / step) * step;
}
