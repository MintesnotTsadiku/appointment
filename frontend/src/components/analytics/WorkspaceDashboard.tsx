import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ArrowUpRight, CalendarDays, Clock3, Users, CircleCheck, CircleX, BarChart3, MapPin } from 'lucide-react';
import { useSession } from '@/context/session';
import Spinner from '@/components/spinner';

type Trend = { date: string; bookings: number; completed: number; cancelled: number };
type Mix = { name: string; count: number };
type Rollup = { total: number; active: number; completed: number; confirmed: number; cancelled: number; no_show: number; unique_customers: number; repeat_customers: number; booked_hours: number; catalog_value?: number; recorded_payments?: number; trend: Trend[]; services: Mix[]; providers: Mix[]; locations: Mix[]; heatmap: { weekday: number; hour: number; count: number }[] };
type Report = { business_name: string; role: string; timezone: string; period: number; start: string; end: string; today: string; current: Rollup; previous: Pick<Rollup, 'total' | 'active' | 'completed' | 'cancelled' | 'no_show' | 'booked_hours'>; today_confirmed: number; next_seven_days: number; financial_note?: string };

const number = new Intl.NumberFormat();
const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const card = 'rounded-2xl border p-5 sm:p-6';
const surface = { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' };
const muted = { color: 'var(--text-secondary)' };
const label = { color: 'var(--text-muted)' };

function useReport(organization: string | undefined, period: number) {
  return useFrappeGetCall<{ message: Report }>('appointment.scheduler.analytics.overview', { organization: organization || '', period }, `analytics-${organization || 'none'}-${period}`, { revalidateOnFocus: true });
}

function Kpi({ title, value, detail, Icon }: { title: string; value: string; detail?: string; Icon: typeof CalendarDays }) {
  return <div className={card} style={surface}>
    <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium" style={muted}>{title}</p><Icon className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" /></div>
    <p className="mt-3 font-heading text-3xl font-bold tabular-nums">{value}</p>
    {detail && <p className="mt-1 text-xs" style={label}>{detail}</p>}
  </div>;
}

function MixPanel({ title, rows, empty }: { title: string; rows: Mix[]; empty: string }) {
  const largest = Math.max(1, ...rows.map(row => row.count));
  return <section className={card} style={surface}><h3 className="font-heading text-lg font-semibold">{title}</h3>
    {rows.length ? <ol className="mt-5 space-y-4">{rows.map(row => <li key={row.name}>
      <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate" title={row.name}>{row.name}</span><strong className="tabular-nums">{row.count}</strong></div>
      <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${row.count / largest * 100}%` }} /></div>
    </li>)}</ol> : <p className="mt-5 text-sm" style={muted}>{empty}</p>}
  </section>;
}

function TrendPanel({ trend, period }: { trend: Trend[]; period: number }) {
  const weekly = period === 90;
  const buckets = weekly ? trend.reduce<Trend[]>((acc, row, index) => {
    if (index % 7 === 0) acc.push({ ...row });
    else { const bucket = acc[acc.length - 1]; bucket.bookings += row.bookings; bucket.completed += row.completed; bucket.cancelled += row.cancelled; }
    return acc;
  }, []) : trend;
  const max = Math.max(1, ...buckets.map(row => row.bookings));
  const total = trend.reduce((sum, row) => sum + row.bookings, 0);
  return <section className={card} style={surface} data-qa="analytics-trend">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-heading text-lg font-semibold">Booking activity</h3><p className="mt-1 text-sm" style={muted}>{weekly ? 'Weekly' : 'Daily'} bookings · {number.format(total)} in this period</p></div><span className="text-xs" style={label}>Includes all statuses</span></div>
    <div className="mt-6 flex h-44 items-end gap-1" role="img" aria-label={`${weekly ? 'Weekly' : 'Daily'} booking chart with ${total} bookings in ${period} days`}>
      {buckets.map(row => <div key={row.date} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${row.date}: ${row.bookings} bookings, ${row.completed} completed, ${row.cancelled} cancelled`}>
        <div className="w-full rounded-t-md bg-gradient-primary transition-opacity group-hover:opacity-75" style={{ height: `${row.bookings ? Math.max(5, row.bookings / max * 100) : 0}%` }} />
      </div>)}
    </div>
    <div className="mt-2 flex justify-between text-xs" style={label}><span>{trend[0]?.date}</span><span>{trend[trend.length - 1]?.date}</span></div>
    <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium" style={{ color: 'var(--accent-primary)' }}>View booking data</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left"><thead><tr><th className="py-1">Date</th><th>Bookings</th><th>Completed</th><th>Cancelled</th></tr></thead><tbody>{trend.map(row => <tr key={row.date} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}><td className="py-1">{row.date}</td><td>{row.bookings}</td><td>{row.completed}</td><td>{row.cancelled}</td></tr>)}</tbody></table></div></details>
  </section>;
}

function Heatmap({ data }: { data: Rollup['heatmap'] }) {
  const hours = Array.from({ length: 13 }, (_, index) => index + 7);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const map = new Map(data.map(item => [`${item.weekday}-${item.hour}`, item.count]));
  const max = Math.max(1, ...data.map(item => item.count));
  return <section className={card} style={surface}><h3 className="font-heading text-lg font-semibold">Popular appointment times</h3><p className="mt-1 text-sm" style={muted}>Booked hours in the selected period, in the business time zone.</p>
    <div className="mt-5 overflow-x-auto"><div className="grid min-w-[560px] gap-1" style={{ gridTemplateColumns: '36px repeat(13, minmax(0, 1fr))' }}><span />{hours.map(hour => <span key={hour} className="text-center text-[10px]" style={label}>{hour}</span>)}{weekdays.map((day, weekday) => <div key={day} className="contents"><span className="self-center text-xs" style={muted}>{day}</span>{hours.map(hour => { const count = map.get(`${weekday}-${hour}`) || 0; return <span key={`${weekday}-${hour}`} title={`${day} ${hour}:00 · ${count} bookings`} aria-label={`${day} ${hour}:00, ${count} bookings`} className="h-6 rounded" style={{ backgroundColor: count ? `color-mix(in srgb, var(--accent-primary) ${Math.max(22, Math.round(count / max * 90))}%, var(--bg-elevated))` : 'var(--border-subtle)' }} />; })}</div>)}</div></div>
  </section>;
}

export function InsightBrief({ kind }: { kind: 'provider' | 'reception' }) {
  const { session } = useSession();
  const organization = session?.selected?.organization;
  const { data, error } = useReport(organization, 7);
  if (!organization || error || !data?.message) return null;
  const report = data.message;
  return <section data-qa={`${kind}-insight-brief`} className="mx-auto mt-5 flex max-w-[1800px] flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border px-5 py-4 text-sm" style={surface}>
    <strong>{kind === 'provider' ? 'Your week' : 'Reception brief'}</strong>
    <span><b className="tabular-nums">{report.today_confirmed}</b> confirmed today</span>
    <span><b className="tabular-nums">{report.next_seven_days}</b> upcoming</span>
    <span><b className="tabular-nums">{report.current.completed}</b> completed this week</span>
    <Link to="/analytics" className="ml-auto inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-primary)' }}>View insights <ArrowUpRight className="h-4 w-4" /></Link>
  </section>;
}

export default function WorkspaceDashboard({ embedded = false }: { embedded?: boolean }) {
  const { session } = useSession();
  const [period, setPeriod] = useState(30);
  const organization = session?.selected?.organization;
  const { data, error, isLoading, mutate } = useReport(organization, period);
  if (!organization) return <section role="status" className="rounded-2xl border p-6" style={surface}>Choose a business workspace to view insights.</section>;
  if (isLoading && !data) return <div className="flex min-h-40 items-center justify-center"><Spinner /></div>;
  if (error || !data?.message) return <section role="alert" className={card} style={surface}><h2 className="font-semibold">Insights are unavailable</h2><p className="my-2 text-sm" style={muted}>We could not load the booking data for this workspace.</p><button className="text-sm font-semibold underline" onClick={() => void mutate()}>Try again</button></section>;
  const report = data.message;
  const current = report.current;
  const manager = report.role === 'Owner' || report.role === 'Manager';
  const change = current.total - report.previous.total;
  const appointmentLabel = manager ? 'business appointments' : report.role === 'Provider' ? 'your appointments' : 'appointments in your reception scope';
  return <div data-qa="workspace-analytics" className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: 'var(--accent-primary)' }}>{manager ? 'Business intelligence' : report.role === 'Provider' ? 'Personal insights' : 'Reception insights'}</p><h2 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">{embedded ? 'Your business at a glance' : report.business_name}</h2><p className="mt-1 text-sm" style={muted}>Showing {appointmentLabel} · {report.start} to {report.end} · {report.timezone?.replaceAll('_', ' ') || 'UTC'}</p></div><label className="flex items-center gap-2 text-sm font-medium">Period<select data-qa="analytics-period" value={period} onChange={event => setPeriod(Number(event.target.value))} className="rounded-xl border px-3 py-2" style={{ ...surface, color: 'var(--text-primary)' }}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></div>
    <section className="grid gap-3 sm:grid-cols-3"><Kpi title="Confirmed today" value={number.format(report.today_confirmed)} detail={`As of ${report.today}`} Icon={CircleCheck} /><Kpi title="Next seven days" value={number.format(report.next_seven_days)} detail="Pending and confirmed bookings" Icon={CalendarDays} /><Kpi title="Booked time" value={`${current.booked_hours} h`} detail="Pending, confirmed and completed" Icon={Clock3} /></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi title="All bookings" value={number.format(current.total)} detail={`${change >= 0 ? '+' : ''}${change} versus prior ${period} days`} Icon={BarChart3} /><Kpi title="Completed" value={number.format(current.completed)} detail="Appointments marked completed" Icon={CircleCheck} /><Kpi title="Cancelled" value={number.format(current.cancelled)} detail={`${current.no_show} no-shows`} Icon={CircleX} /><Kpi title="Customers" value={number.format(current.unique_customers)} detail={`${current.repeat_customers} booked more than once`} Icon={Users} /></section>
    {manager && <section className="grid gap-3 sm:grid-cols-2"><Kpi title="Booking value at catalog prices" value={`${money.format(current.catalog_value || 0)} ETB`} detail="Estimate using current service prices" Icon={ArrowUpRight} /><Kpi title="Recorded payments" value={`${money.format(current.recorded_payments || 0)} ETB`} detail="Only payments explicitly recorded on bookings" Icon={ArrowUpRight} /></section>}
    {manager && <p className="text-xs" style={label}>{report.financial_note} Recorded payments stay at zero until amounts are entered on bookings.</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]"><TrendPanel trend={current.trend} period={period} /><MixPanel title="Most booked services" rows={current.services} empty="No services booked in this period." /></div>
    <div className="grid gap-5 lg:grid-cols-2"><MixPanel title={manager ? 'Provider activity' : 'Providers in scope'} rows={current.providers} empty="No provider activity in this period." /><MixPanel title="Location activity" rows={current.locations} empty="No location activity in this period." /></div>
    <Heatmap data={current.heatmap} />
    <p className="flex items-center gap-2 text-xs" style={label}><MapPin className="h-3.5 w-3.5" />Counts follow your selected business and role. Changing workspace updates this report.</p>
  </div>;
}
