import { useTranslation } from '@/lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import type { Trend } from '@/components/analytics/types';
import type { WidgetContext } from '../types';
import { ColumnChart } from './ColumnChart';
import { RankedBars, number } from './parts';

type Props = { ctx: WidgetContext };
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function BookingTrend({ ctx }: Props) {
  const { t } = useTranslation();
  const trend = ctx.report.current.trend;
  const weekly = ctx.period === 90;
  const buckets = weekly ? toWeeks(trend) : trend;
  const total = trend.reduce((sum, row) => sum + row.bookings, 0);
  const label = weekly ? t('staff.analytics.weeklyBookings') : t('staff.analytics.dailyBookings');
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">{label} · {number.format(total)} {t('staff.analytics.inPeriod')}</p>
      <ColumnChart
        ariaLabel={`${label}: ${total}`}
        edgeLabels={[trend[0]?.date ?? '', trend[trend.length - 1]?.date ?? '']}
        columns={buckets.map((row) => ({
          key: row.date,
          label: row.date,
          value: row.bookings,
          tooltip: (
            <>
              <p className="font-medium text-muted-foreground">{weekly ? `${t('staff.analytics.weekOf')} ${row.date}` : row.date}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{row.bookings} {t('staff.analytics.bookings')}</p>
              <p className="tabular-nums text-muted-foreground">{row.completed} {t('staff.analytics.completed')} · {row.cancelled} {t('staff.analytics.cancelled')}</p>
            </>
          ),
        }))}
      />
      <TrendTable trend={trend} />
    </div>
  );
}

export function CancellationTrend({ ctx }: Props) {
  const { t } = useTranslation();
  const trend = ctx.period === 90 ? toWeeks(ctx.report.current.trend) : ctx.report.current.trend;
  const total = trend.reduce((sum, row) => sum + row.cancelled + row.no_show, 0);
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">{number.format(total)} {t('staff.widgets.cancellationTrend.summary')}</p>
      <ColumnChart
        tone="warning"
        ariaLabel={`${t('staff.widgets.cancellationTrend.title')}: ${total}`}
        edgeLabels={[trend[0]?.date ?? '', trend[trend.length - 1]?.date ?? '']}
        columns={trend.map((row) => ({
          key: row.date,
          label: row.date,
          value: row.cancelled + row.no_show,
          tooltip: (
            <>
              <p className="font-medium text-muted-foreground">{row.date}</p>
              <p className="tabular-nums text-foreground">{row.cancelled} {t('staff.analytics.cancelled')} · {row.no_show} {t('staff.status.noShow')}</p>
            </>
          ),
        }))}
      />
    </div>
  );
}

export function WeekdayLoad({ ctx }: Props) {
  const { t } = useTranslation();
  const totals = WEEKDAYS.map((_, weekday) => ctx.report.current.heatmap.filter((cell) => cell.weekday === weekday).reduce((sum, cell) => sum + cell.count, 0));
  return (
    <ColumnChart
      ariaLabel={t('staff.widgets.weekdayLoad.title')}
      columns={WEEKDAYS.map((day, index) => ({
        key: day,
        label: t(`staff.analytics.days.${day}`),
        value: totals[index],
        tooltip: <p className="tabular-nums text-foreground">{t(`staff.analytics.days.${day}`)} · {totals[index]} {t('staff.analytics.bookings')}</p>,
      }))}
    />
  );
}

export function HourLoad({ ctx }: Props) {
  const { t } = useTranslation();
  const hours = Array.from({ length: 13 }, (_, index) => index + 7);
  const totals = hours.map((hour) => ctx.report.current.heatmap.filter((cell) => cell.hour === hour).reduce((sum, cell) => sum + cell.count, 0));
  return (
    <ColumnChart
      ariaLabel={t('staff.widgets.hourLoad.title')}
      columns={hours.map((hour, index) => ({
        key: String(hour),
        label: String(hour),
        value: totals[index],
        tooltip: <p className="tabular-nums text-foreground">{hour}:00 · {totals[index]} {t('staff.analytics.bookings')}</p>,
      }))}
    />
  );
}

export function TopServices({ ctx }: Props) {
  const { t } = useTranslation();
  return <RankedBars rows={ctx.report.current.services} empty={t('staff.analytics.noServices')} />;
}

export function ProviderActivity({ ctx }: Props) {
  const { t } = useTranslation();
  return <RankedBars rows={ctx.report.current.providers} empty={t('staff.analytics.noProviders')} />;
}

export function LocationActivity({ ctx }: Props) {
  const { t } = useTranslation();
  return <RankedBars rows={ctx.report.current.locations} empty={t('staff.analytics.noLocations')} />;
}

function TrendTable({ trend }: { trend: Trend[] }) {
  const { t } = useTranslation();
  return (
    <details className="text-sm">
      <summary className="cursor-pointer rounded-sm text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">{t('staff.analytics.viewData')}</summary>
      <div className="mt-2 max-h-48 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>{t('staff.analytics.date')}</TableHead>
              <TableHead className="text-right">{t('staff.analytics.bookings')}</TableHead>
              <TableHead className="text-right">{t('staff.analytics.completed')}</TableHead>
              <TableHead className="text-right">{t('staff.analytics.cancelled')}</TableHead>
              <TableHead className="text-right">{t('staff.status.noShow')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trend.map((row) => (
              <TableRow key={row.date}>
                <TableCell>{row.date}</TableCell>
                <TableCell className="text-right">{row.bookings}</TableCell>
                <TableCell className="text-right">{row.completed}</TableCell>
                <TableCell className="text-right">{row.cancelled}</TableCell>
                <TableCell className="text-right">{row.no_show}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

function toWeeks(trend: Trend[]) {
  return trend.reduce<Trend[]>((acc, row, index) => {
    if (index % 7 === 0) acc.push({ ...row });
    else {
      const bucket = acc[acc.length - 1];
      bucket.bookings += row.bookings;
      bucket.completed += row.completed;
      bucket.cancelled += row.cancelled;
      bucket.no_show += row.no_show;
    }
    return acc;
  }, []);
}

export function ResourceUse({ ctx }: Props) {
  const { t } = useTranslation();
  const rows = ctx.report.current.resources;
  if (rows === null || rows === undefined) return <p className="text-sm text-muted-foreground">{t('staff.widgets.resourceUse.notForProviders')}</p>;
  if (!rows.length) return <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t('staff.widgets.resourceUse.empty')}</p>;
  return (
    <ol className="space-y-3" data-qa="analytics-resource-use">
      {rows.map((row) => (
        <li key={row.resource} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1" data-qa="analytics-resource-row">
          <span className="truncate text-sm text-foreground" title={`${row.name} · ${row.type_name} · ${row.location_name}`}>
            {row.name}
            <span className="text-muted-foreground"> · {row.location_name}{row.capacity > 1 ? ` · ${t('staff.resources.count').replace('{0}', String(row.capacity))}` : ''}</span>
          </span>
          <strong className="row-span-2 self-end text-sm font-semibold tabular-nums">{row.rate === null ? '—' : `${row.rate}%`}</strong>
          <div className="h-2 rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-chart-2" style={{ width: `${Math.min(100, row.rate ?? 0)}%` }} />
          </div>
          <span className="col-span-2 text-xs text-muted-foreground tabular-nums">
            {t('staff.widgets.resourceUse.hours').replace('{0}', number.format(row.booked_hours)).replace('{1}', number.format(row.available_hours))}
          </span>
        </li>
      ))}
    </ol>
  );
}
