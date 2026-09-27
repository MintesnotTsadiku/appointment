import "./home-workspace.css";
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { Metric } from './MetricWidget';

export type ScheduleRow = { booking: string; customer: string; service: string; provider: string; date: string; time: string; end_time: string; status: string };
const surface = { background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' };
const muted = { color: 'var(--text-secondary)' };
const compactTime = (value: string) => { const [hour, minute] = value.split(':'); return `${hour.padStart(2, '0')}:${minute}`; };

export function HomeWorkspace({ today, range, schedule, metrics, render, quickActions, timezone, periodControl }: {
  today: string; range: string; schedule: ScheduleRow[]; metrics: Record<string, Metric>;
  render: (id: string) => ReactNode; quickActions?: ReactNode; timezone?: string; periodControl?: ReactNode;
}) {
  const date = parseDay(today);
  const days = weekFrom(date);
  const selectedState = useSelectedDay(today, days, schedule);
  const agenda = schedule.filter(row => row.date === today);
  const preview = schedule.filter(row => row.date === selectedState.selected);
  const nextUp = nextAppointment(agenda, today, timezone);
  const later = schedule.find(row => row.date > today);
  const attention = Number(metrics.attention?.value || 0);
  const summaries = [['total', CalendarDays], ['unique_customers', Users], ['booked_hours', Clock]] as const;
  return <>
    {attention > 0 && <Link data-widget="attention" to="/reception" className="home-attention">
      <strong>{attention} past appointment{attention === 1 ? '' : 's'} need an outcome</strong>
      <span>Record completed, cancelled or no-show so today’s board stays accurate.</span>
      <span className="home-attention-link">View appointments →</span>
    </Link>}
    <div className="home-workspace-grid">
    <section data-widget="agenda" aria-label="Today's agenda" className="home-panel home-agenda" style={surface}>
      <p className="text-xs uppercase tracking-wider" style={muted}>Today</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl font-semibold">{date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <Link to="/reception" className="home-quiet-link">View appointments →</Link>
      </div>
      <p className="mt-1 text-sm" style={muted}>{agenda.filter(row => row.status === 'Confirmed').length} confirmed today · {agenda.length} scheduled</p>
      {agenda.length ? <ol className="home-agenda-list">{agenda.map(row => <AgendaRow key={row.booking} row={row} next={nextUp?.booking === row.booking} />)}</ol> : <EmptyToday later={later} />}
    </section>
    <section aria-label="Week preview" className="home-panel home-week" style={surface}>
      <div className="flex justify-between gap-2"><p className="text-xs uppercase tracking-wider" style={muted}>Next seven days</p><Link to="/calendar" className="home-quiet-link">View calendar →</Link></div>
      <p className="mt-1 text-sm"><strong className="font-heading text-xl tabular-nums">{schedule.length}</strong> upcoming in seven days</p>
      <div className="mt-5 flex items-center justify-between text-sm">
        <strong>{date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <span className="flex gap-1">
          <button type="button" className="home-icon-button" aria-label="Previous preview day" disabled={selectedState.selected === days[0].key} onClick={selectedState.back}><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" className="home-icon-button" aria-label="Next preview day" disabled={selectedState.selected === days[6].key} onClick={selectedState.forward}><ChevronRight size={16} aria-hidden="true" /></button>
        </span>
      </div>
      <div className="home-week-strip">{days.map(({ key, day }) => {
        const count = schedule.filter(row => row.date === key).length;
        return <button type="button" key={key} aria-pressed={selectedState.selected === key} aria-label={`${day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} appointment${count === 1 ? '' : 's'}`} onClick={() => selectedState.setSelected(key)} className="home-week-day">
          <span style={muted}>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
          <strong>{day.getDate()}</strong>
          <span className="home-week-dot" data-busy={count > 0 ? 'true' : 'false'} aria-hidden="true" />
        </button>;
      })}</div>
      <ol className="mt-4 space-y-2">{preview.slice(0, 4).map(row => <li key={row.booking}><Link to="/calendar" className="home-week-event"><strong className="block truncate text-xs">{row.customer}</strong><span className="text-xs" style={muted}>{compactTime(row.time)}–{compactTime(row.end_time)} · {row.service}</span></Link></li>)}</ol>
      {!preview.length && <p className="py-6 text-xs" style={muted}>{selectedState.selected === today ? 'Nothing else is scheduled today.' : 'No scheduled appointments on this day.'}</p>}
      {preview.length > 4 && <Link to="/calendar" className="mt-3 block text-xs underline">View all {preview.length} appointments</Link>}
    </section>
    <aside className="home-actions space-y-4">{quickActions}<section className="home-panel" style={surface}><div className="flex items-center justify-between"><h3 className="font-heading font-semibold">Popular services</h3><Link to="/analytics" className="home-quiet-link">View all</Link></div>{render('services')}</section></aside>
    <section aria-label="Business summary" className="home-panel home-summary" style={surface}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold">Business summary</h3>
        {periodControl}
      </div>
      <p className="mt-1 text-xs" style={muted}>{range} · filters apply to this summary</p>
      <div className="my-5 grid gap-4 sm:grid-cols-3">{summaries.map(([id, Icon]) => <div key={id} data-widget={id} className="flex items-start gap-3"><span className="rounded-xl p-3" style={{ background: 'var(--accent-primary-light)' }}><Icon size={20} aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-xs" style={muted}>{{total:"Bookings",unique_customers:"Customers",booked_hours:"Booked time"}[id]}</p>{render(id)}</div></div>)}</div>
      <div data-widget="booking_trend"><h4 className="font-heading font-semibold">Booking activity</h4>{render('booking_trend')}</div>
    </section>
    <section aria-label="Business indicators" className="home-indicators">{['no_show_rate', 'utilization', 'catalog_value', 'recorded_payments'].filter(id => metrics[id]).map(id => <div key={id} data-widget={id} className="home-panel" style={surface}><h3 className="text-xs font-semibold" style={muted}>{{no_show_rate:'No-show rate',utilization:'Provider utilization',catalog_value:'Catalog value · estimate',recorded_payments:'Recorded payments'}[id]}</h3>{render(id)}</div>)}</section>
    </div>
  </>;
}

function AgendaRow({ row, next }: { row: ScheduleRow; next: boolean }) {
  return <li className="flex items-start gap-3">
    <time className="w-11 shrink-0 pt-4 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{compactTime(row.time)}</time>
    <span className="home-timeline-dot" data-next={next ? 'true' : 'false'} />
    <Link to="/reception" className="home-appointment" data-next={next ? 'true' : 'false'}>
      <div className="min-w-0"><strong className="block truncate text-sm">{row.customer}</strong><span className="mt-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>{row.service} · {durationLabel(row.time, row.end_time)} · {row.provider}</span></div>
      <span className="home-status" data-status={row.status}>{row.status}{next ? ' · next' : ''}</span>
    </Link>
  </li>;
}

function EmptyToday({ later }: { later?: ScheduleRow }) {
  return <div className="py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
    <p>No scheduled appointments today. <Link to="/calendar" className="underline">Review your calendar</Link>.</p>
    {later && <p className="mt-3">Next: <Link to="/calendar" className="underline">{later.customer}</Link> on {parseDay(later.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} at {compactTime(later.time)}.</p>}
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

function durationLabel(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes > 0 ? `${minutes} min` : `${compactTime(start)}–${compactTime(end)}`;
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
