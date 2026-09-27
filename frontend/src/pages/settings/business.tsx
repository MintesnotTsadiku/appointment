import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { CalendarCheck2, ExternalLink, FileEdit, Rocket } from 'lucide-react';
import AppTopNav from '@/components/workspace/AppTopNav';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { TimeInput } from '@/components/time-input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { ClockFormatToggle } from '@/components/clock-format-toggle';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { formatWallTime, validateWindow, type ClockFormat } from '@/lib/time';

interface Offering {
  organization: string; business_name: string; service: string;
  timezone: string; public_path: string; published: boolean; offering: string;
}
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BusinessSettings() {
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: Offering[] }>('appointment.scheduler.workspace.overview');
  const { call: create, loading } = useFrappePostCall('appointment.scheduler.workspace.create');
  const { call: publish, loading: publishing } = useFrappePostCall('appointment.scheduler.workspace.publish');
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedDays, setSelectedDays] = useState(days.slice(0, 5));
  const [clockFormat, setClockFormat] = useState<ClockFormat>('12h');
  const request = useRef<{ payload: string; key: string }>();
  const [form, setForm] = useState({ business_name: '', location_name: '', service_name: '', timezone: 'Africa/Addis_Ababa', duration: '30', opens_at: '09:00', closes_at: '17:00' });

  const windowError = validateWindow(form.opens_at, form.closes_at);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    setNotice('');
    if (windowError) {
      setProblem(windowError);
      return;
    }
    const payload = { ...form, weekdays: selectedDays };
    const serialized = JSON.stringify(payload);
    if (!request.current || request.current.payload !== serialized) request.current = { payload: serialized, key: crypto.randomUUID() };
    try {
      await create({ ...payload, request_id: request.current.key });
      await mutate();
      setNotice('Business saved as a draft. Review it below, then publish when ready.');
    } catch (e) {
      setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  async function setPublished(row: Offering) {
    setProblem('');
    setNotice('');
    try {
      await publish({ organization: row.organization, published: row.published ? 0 : 1 });
      await mutate();
      setNotice(row.published ? 'Booking page unpublished. Existing bookings remain available to staff.' : 'Booking page published. Share its link to accept customers.');
    } catch (e) {
      setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  const inputStyle = { borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' } as const;
  const offerings = data?.message ?? [];

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AppTopNav active="settings" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="font-heading text-3xl font-semibold">Business booking setup</h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Set up a location and service. Times use the location’s time zone. Your page stays private until you publish it,
            and no customer messages are sent.
          </p>
        </header>

        {isLoading && <p role="status">Loading your businesses…</p>}
        {(error || problem) && (
          <p role="alert" className="rounded-lg p-3" style={{ backgroundColor: 'var(--status-cancelled-bg, #fee2e2)', color: 'var(--status-cancelled, #b91c1c)' }}>
            {problem || parseFrappeErrorMsg(error!)}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg p-3" style={{ backgroundColor: 'var(--status-confirmed-bg, #dcfce7)', color: 'var(--status-confirmed, #166534)' }}>
            {notice}
          </p>
        )}

        {!error && (
          <form onSubmit={submit} className="space-y-5 rounded-2xl border p-6" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
            <h2 className="text-xl font-semibold">Create a business</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {([['business_name', 'Business name'], ['location_name', 'Location name'], ['service_name', 'Service name']] as const).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={key} className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</Label>
                  <Input id={key} required maxLength={100} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div>
                <Label htmlFor="duration" className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Duration (minutes)</Label>
                <Input id="duration" type="number" min={5} max={480} required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <TimeZoneSelect value={form.timezone} onChange={(timezone) => setForm({ ...form, timezone })} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ClockFormatToggle value={clockFormat} onChange={setClockFormat} />
              <div />
              <div>
                <Label htmlFor="opens_at" className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Opens at</Label>
                <TimeInput id="opens_at" timeFormat={clockFormat} value={form.opens_at} onChange={(value) => setForm({ ...form, opens_at: value })} />
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatWallTime(form.opens_at, clockFormat)} · stored 24-hour</p>
              </div>
              <div>
                <Label htmlFor="closes_at" className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Closes at</Label>
                <TimeInput id="closes_at" timeFormat={clockFormat} value={form.closes_at} onChange={(value) => setForm({ ...form, closes_at: value })} />
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatWallTime(form.closes_at, clockFormat)} · stored 24-hour</p>
                {windowError && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--status-cancelled, #b91c1c)' }}>{windowError}</p>}
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Operating days</legend>
              <div className="flex flex-wrap gap-3">
                {days.map((day) => (
                  <label key={day} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedDays.includes(day)} onChange={(e) => setSelectedDays(e.target.checked ? [...selectedDays, day] : selectedDays.filter((d) => d !== day))} />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You will be the first provider. Payment collection and customer messages are not enabled by this setup.</p>
            <Button type="submit" data-qa="business-save" disabled={loading || !selectedDays.length || Boolean(windowError)}>
              {loading ? 'Saving…' : 'Save draft business'}
            </Button>
          </form>
        )}

        <section className="space-y-4" aria-label="Your booking pages">
          <h2 className="text-xl font-semibold">Your booking pages</h2>
          {!isLoading && offerings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No booking pages yet. Create one above.</p>}
          {offerings.map((row) => (
            <article key={row.offering} data-qa="business-offering" className="space-y-3 rounded-2xl border p-5" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{row.business_name} — {row.service}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{row.timezone}</p>
                </div>
                <span data-qa-state={row.published ? 'published' : 'draft'} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: row.published ? 'var(--status-confirmed-bg, #dcfce7)' : 'var(--border-subtle)', color: row.published ? 'var(--status-confirmed, #166534)' : 'var(--text-muted)' }}>
                  {row.published ? <Rocket className="h-3 w-3" /> : <FileEdit className="h-3 w-3" />}
                  {row.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button data-qa="business-publish" disabled={publishing} onClick={() => setPublished(row)}>
                  {row.published ? 'Unpublish booking page' : 'Publish booking page'}
                </Button>
                {row.published && (
                  <Link data-qa="business-public-link" className="inline-flex items-center gap-1 text-sm underline" to={row.public_path}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open customer booking page
                  </Link>
                )}
                <Link className="inline-flex items-center gap-1 text-sm underline" to="/settings/team">
                  <CalendarCheck2 className="h-3.5 w-3.5" /> Assign staff
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
