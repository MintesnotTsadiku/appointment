import "./home-workspace.css";
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { intlLocale, useTranslation } from '@/lib/i18n';
import { Metric } from './MetricWidget';
import { statusLabel, widgetTitle } from './widgetRegistry';

type Translate = (key: string) => string;

export type ScheduleRow = { booking: string; customer: string; service: string; provider: string; date: string; time: string; end_time: string; status: string };
const surface = { background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' };
const muted = { color: 'var(--text-secondary)' };
const compactTime = (value: string) => { const [hour, minute] = value.split(':'); return `${hour.padStart(2, '0')}:${minute}`; };

export function HomeWorkspace({ today, range, schedule, metrics, render, quickActions, timezone, periodControl }: {
  today: string; range: string; schedule: ScheduleRow[]; metrics: Record<string, Metric>;
  render: (id: string) => ReactNode; quickActions?: ReactNode; timezone?: string; periodControl?: ReactNode;
}) {
  const { t, language } = useTranslation();
  const locale = intlLocale(language);
  const date = parseDay(today);
  const days = weekFrom(date);
  const selectedState = useSelectedDay(today, days, schedule);
  const agenda = schedule.filter(row => row.date === today);
  const preview = schedule.filter(row => row.date === selectedState.selected);
  const nextUp = nextAppointment(agenda, today, timezone);
  const later = schedule.find(row => row.date > today);
  const attention = Number(metrics.attention?.value || 0);
  const summaries = [['total', CalendarDays, 'staff.widgets.categories.bookings'], ['unique_customers', Users, 'staff.analytics.customers'], ['booked_hours', Clock, 'staff.analytics.bookedTime']] as const;
  const indicators: Record<string, string> = { no_show_rate: t('staff.analytics.noShowRate'), utilization: t('staff.analytics.utilization'), catalog_value: t('staff.dashboard.home.catalogEstimate'), recorded_payments: t('staff.widgets.recordedPayments.title') };
  return <>
    {attention > 0 && <Link data-widget="attention" to="/reception" className="home-attention">
      <strong>{t(attention === 1 ? 'staff.dashboard.home.attentionOne' : 'staff.dashboard.home.attentionMany').replace('{0}', String(attention))}</strong>
      <span>{t('staff.home.attention.description')}</span>
      <span className="home-attention-link">{t('staff.dashboard.home.viewAppointments')}</span>
    </Link>}
    <div className="home-workspace-grid">
    <section data-widget="agenda" aria-label={widgetTitle(t, { id: 'agenda', title: "Today's agenda" })} className="home-panel home-agenda" style={surface}>
      <p className="text-xs uppercase tracking-wider" style={muted}>{t('staff.reception.today')}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl font-semibold">{date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <Link to="/reception" className="home-quiet-link">{t('staff.dashboard.home.viewAppointments')}</Link>
      </div>
      <p className="mt-1 text-sm" style={muted}>{t('staff.dashboard.home.confirmedScheduled').replace('{0}', String(agenda.filter(row => row.status === 'Confirmed').length)).replace('{1}', String(agenda.length))}</p>
      {agenda.length ? <ol className="home-agenda-list">{agenda.map(row => <AgendaRow key={row.booking} row={row} next={nextUp?.booking === row.booking} />)}</ol> : <EmptyToday later={later} />}
    </section>
    <section aria-label={t('staff.dashboard.home.weekPreview')} className="home-panel home-week" style={surface}>
      <div className="flex justify-between gap-2"><p className="text-xs uppercase tracking-wider" style={muted}>{t('staff.analytics.nextSeven')}</p><Link to="/calendar" className="home-quiet-link">{t('staff.dashboard.home.viewCalendar')}</Link></div>
      <p className="mt-1 text-sm"><strong className="font-heading text-xl tabular-nums">{schedule.length}</strong> {t('staff.dashboard.home.upcomingSeven')}</p>
      <div className="mt-5 flex items-center justify-between text-sm">
        <strong>{date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</strong>
        <span className="flex gap-1">
          <button type="button" className="home-icon-button" aria-label={t('staff.dashboard.home.previousDay')} disabled={selectedState.selected === days[0].key} onClick={selectedState.back}><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" className="home-icon-button" aria-label={t('staff.dashboard.home.nextDay')} disabled={selectedState.selected === days[6].key} onClick={selectedState.forward}><ChevronRight size={16} aria-hidden="true" /></button>
        </span>
      </div>
      <div className="home-week-strip">{days.map(({ key, day }) => {
        const count = schedule.filter(row => row.date === key).length;
        return <button type="button" key={key} aria-pressed={selectedState.selected === key} aria-label={t(count === 1 ? 'staff.dashboard.home.dayOne' : 'staff.dashboard.home.dayMany').replace('{0}', day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })).replace('{1}', String(count))} onClick={() => selectedState.setSelected(key)} className="home-week-day">
          <span style={muted}>{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
          <strong>{day.getDate()}</strong>
          <span className="home-week-dot" data-busy={count > 0 ? 'true' : 'false'} aria-hidden="true" />
        </button>;
      })}</div>
      <ol className="mt-4 space-y-2">{preview.slice(0, 4).map(row => <li key={row.booking}><Link to="/calendar" className="home-week-event"><strong className="block truncate text-xs">{row.customer}</strong><span className="text-xs" style={muted}>{compactTime(row.time)}–{compactTime(row.end_time)} · {row.service}</span></Link></li>)}</ol>
      {!preview.length && <p className="py-6 text-xs" style={muted}>{selectedState.selected === today ? t('staff.dashboard.home.nothingElseToday') : t('staff.dashboard.home.nothingThisDay')}</p>}
      {preview.length > 4 && <Link to="/calendar" className="mt-3 block text-xs underline">{t('staff.dashboard.home.viewAllCount').replace('{0}', String(preview.length))}</Link>}
    </section>
    <aside className="home-actions space-y-4">{quickActions}<section className="home-panel" style={surface}><div className="flex items-center justify-between"><h3 className="font-heading font-semibold">{t('staff.dashboard.home.popularServices')}</h3><Link to="/analytics" className="home-quiet-link">{t('staff.dashboard.home.viewAll')}</Link></div>{render('services')}</section></aside>
    <section aria-label={t('staff.dashboard.home.summary')} className="home-panel home-summary" style={surface}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold">{t('staff.dashboard.home.summary')}</h3>
        {periodControl}
      </div>
      <p className="mt-1 text-xs" style={muted}>{t('staff.dashboard.home.summaryRange').replace('{0}', range)}</p>
      <div className="my-5 grid gap-4 sm:grid-cols-3">{summaries.map(([id, Icon, label]) => <div key={id} data-widget={id} className="flex items-start gap-3"><span className="rounded-xl p-3" style={{ background: 'var(--accent-primary-light)' }}><Icon size={20} aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-xs" style={muted}>{t(label)}</p>{render(id)}</div></div>)}</div>
      <div data-widget="booking_trend"><h4 className="font-heading font-semibold">{t('staff.analytics.bookingActivity')}</h4>{render('booking_trend')}</div>
    </section>
    <section aria-label={t('staff.dashboard.home.indicators')} className="home-indicators">{['no_show_rate', 'utilization', 'catalog_value', 'recorded_payments'].filter(id => metrics[id]).map(id => <div key={id} data-widget={id} className="home-panel" style={surface}><h3 className="text-xs font-semibold" style={muted}>{indicators[id]}</h3>{render(id)}</div>)}</section>
    </div>
  </>;
}

function AgendaRow({ row, next }: { row: ScheduleRow; next: boolean }) {
  const { t } = useTranslation();
  return <li className="flex items-start gap-3">
    <time className="w-11 shrink-0 pt-4 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{compactTime(row.time)}</time>
    <span className="home-timeline-dot" data-next={next ? 'true' : 'false'} />
    <Link to="/reception" className="home-appointment" data-next={next ? 'true' : 'false'}>
      <div className="min-w-0"><strong className="block truncate text-sm">{row.customer}</strong><span className="mt-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{row.service} · {durationLabel(t, row.time, row.end_time)} · {row.provider}</span></div>
      <span className="home-status" data-status={row.status}>{statusLabel(t, row.status)}{next ? ` · ${t('staff.dashboard.home.upNext')}` : ''}</span>
    </Link>
  </li>;
}

function EmptyToday({ later }: { later?: ScheduleRow }) {
  const { t, language } = useTranslation();
  const locale = intlLocale(language);
  const [before, after = ''] = t('staff.dashboard.home.nextLater').split('{0}');
  const fill = (text: string) => later ? text.replace('{1}', parseDay(later.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })).replace('{2}', compactTime(later.time)) : text;
  return <div className="py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
    <p>{t('staff.dashboard.home.noneToday')} <Link to="/calendar" className="underline">{t('staff.dashboard.home.reviewCalendar')}</Link></p>
    {later && <p className="mt-3">{fill(before)}<Link to="/calendar" className="underline">{later.customer}</Link>{fill(after)}</p>}
  </div>;
}

function useSelectedDay(today: string, days: { key: string }[], schedule: ScheduleRow[]) {
  const firstBusy = days.find(day => schedule.some(row => row.date === day.key))?.key || today;
  const [selected, setSelected] = useState(schedule.some(row => row.date === today) ? today : firstBusy);
  const index = Math.max(0, days.findIndex(day => day.key === selected));
  return {
    selected,
    setSelected,
    back: () => setSelected(days[Math.max(0, index - 1)].key),
    forward: () => setSelected(days[Math.min(6, index + 1)].key),
  };
}

function parseDay(value: string) {
  return new Date(`${value}T12:00:00`);
}

function weekFrom(date: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(date.getDate() + index);
    return { key: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`, day };
  });
}

function durationLabel(t: Translate, start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes > 0 ? t('bookingPicker.minutes').replace('{0}', String(minutes)) : `${compactTime(start)}–${compactTime(end)}`;
}

function nextAppointment(rows: ScheduleRow[], today: string, timezone?: string) {
  const now = clock(timezone);
  return rows.find(row => row.date > today || (row.date === today && row.end_time >= now));
}

function clock(timezone?: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timezone || undefined }).formatToParts(new Date());
    return `${parts.find(part => part.type === 'hour')?.value}:${parts.find(part => part.type === 'minute')?.value}`;
  } catch {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}
