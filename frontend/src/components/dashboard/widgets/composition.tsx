import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WidgetContext } from '../types';
import { number } from './parts';

type Props = { ctx: WidgetContext };
const HOURS = Array.from({ length: 13 }, (_, index) => index + 7);
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Share of bookings by outcome. Status colors are paired with labels and counts. */
export function StatusMix({ ctx }: Props) {
  const { t } = useTranslation();
  const { current } = ctx.report;
  const other = Math.max(0, current.total - current.completed - current.confirmed - current.cancelled - current.no_show);
  const parts = [
    { key: 'completed', label: t('staff.status.completed'), value: current.completed, color: 'bg-success' },
    { key: 'confirmed', label: t('staff.status.confirmed'), value: current.confirmed, color: 'bg-info' },
    { key: 'other', label: t('staff.status.pending'), value: other, color: 'bg-muted-foreground/40' },
    { key: 'cancelled', label: t('staff.status.cancelled'), value: current.cancelled, color: 'bg-destructive' },
    { key: 'noShow', label: t('staff.status.noShow'), value: current.no_show, color: 'bg-warning' },
  ].filter((part) => part.value > 0);
  const total = Math.max(1, current.total);
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((part) => `${part.label} ${part.value}`).join(', ')}>
        {parts.map((part) => (
          <span key={part.key} className={cn('h-full first:rounded-l-full last:rounded-r-full', part.color)} style={{ width: `${(part.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', part.color)} aria-hidden="true" />
            <span className="truncate text-muted-foreground">{part.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">{number.format(part.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Current vs previous period on one scale per row. */
export function PeriodCompare({ ctx }: Props) {
  const { t } = useTranslation();
  const { current, previous } = ctx.report;
  const rows = [
    { key: 'total', label: t('staff.analytics.allBookings'), now: current.total, before: previous.total },
    { key: 'completed', label: t('staff.status.completed'), now: current.completed, before: previous.completed },
    { key: 'cancelled', label: t('staff.status.cancelled'), now: current.cancelled, before: previous.cancelled },
    { key: 'noShow', label: t('staff.status.noShow'), now: current.no_show, before: previous.no_show },
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-chart-1" />{t('staff.widgets.periodCompare.current')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-muted-foreground/40" />{t('staff.widgets.periodCompare.previous')}</span>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const max = Math.max(1, row.now, row.before);
          return (
            <li key={row.key} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-3 text-xs">
              <span className="truncate text-muted-foreground">{row.label}</span>
              <div className="space-y-1" aria-label={`${row.label}: ${row.now} / ${row.before}`}>
                <Bar value={row.now} max={max} className="bg-chart-1" />
                <Bar value={row.before} max={max} className="bg-muted-foreground/40" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={cn('h-full rounded-full', className)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-8 text-right font-semibold tabular-nums text-foreground">{number.format(value)}</span>
    </div>
  );
}

/** One-hue sequential grid of booked hours by weekday. */
export function PopularTimes({ ctx }: Props) {
  const { t } = useTranslation();
  const data = ctx.report.current.heatmap;
  const counts = new Map(data.map((item) => [`${item.weekday}-${item.hour}`, item.count]));
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground" aria-hidden="true">
        {t('staff.analytics.fewer')}
        {[0.15, 0.4, 0.65, 1].map((alpha) => (
          <span key={alpha} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: `hsl(var(--chart-1) / ${alpha})` }} />
        ))}
        {t('staff.analytics.more')}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[520px] gap-[3px]" style={{ gridTemplateColumns: '36px repeat(13, minmax(0, 1fr))' }}>
          <span />
          {HOURS.map((hour) => (
            <span key={hour} className="text-center text-[10px] tabular-nums text-muted-foreground">{hour}</span>
          ))}
          {WEEKDAYS.map((day, weekday) => (
            <div key={day} className="contents">
              <span className="self-center text-xs text-muted-foreground">{t(`staff.analytics.days.${day}`)}</span>
              {HOURS.map((hour) => {
                const count = counts.get(`${weekday}-${hour}`) || 0;
                const label = `${t(`staff.analytics.days.${day}`)} ${hour}:00 · ${count} ${t('staff.analytics.bookings')}`;
                return (
                  <span
                    key={hour}
                    title={label}
                    aria-label={label}
                    className="h-6 rounded-[4px]"
                    style={{ backgroundColor: count ? `hsl(var(--chart-1) / ${(0.15 + (count / max) * 0.85).toFixed(2)})` : 'hsl(var(--muted))' }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
