import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const number = new Intl.NumberFormat();
export const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/** Headline number with an optional one-line detail; fills the widget body. */
export function Metric({ value, detail, tone }: { value: ReactNode; detail?: ReactNode; tone?: 'up' | 'down' }) {
  return (
    <div className="flex h-full flex-col justify-end">
      <p className="font-heading text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {detail && <p className={cn('mt-0.5 truncate text-xs', tone === 'up' ? 'text-success' : tone === 'down' ? 'text-destructive' : 'text-muted-foreground')}>{detail}</p>}
    </div>
  );
}

/** Rate headline with a meter and its formula. */
export function RateMeter({ value, rate, detail, comparison }: { value: string; rate: number | null; detail: string; comparison?: string }) {
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.min(100, Math.max(0, rate ?? 0))}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        {comparison && <p className="mt-0.5 text-xs font-medium text-foreground">{comparison}</p>}
      </div>
    </div>
  );
}

/** Ranked single-hue bars; values sit at the tip in text ink. */
export function RankedBars({ rows, empty }: { rows: Array<{ name: string; count: number }>; empty: string }) {
  const largest = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-sm text-foreground" title={row.name}>{row.name}</span>
          <strong className="row-span-2 self-end text-sm font-semibold tabular-nums">{number.format(row.count)}</strong>
          <div className="h-2 rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(row.count / largest) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 1000) / 10 : null;
}

export function validComparison(current: number | null, previous: number | null, available: boolean, suffix: string) {
  if (!available || current === null || previous === null) return undefined;
  const change = Math.round((current - previous) * 10) / 10;
  return `${change > 0 ? '+' : ''}${change} ${suffix}`;
}
