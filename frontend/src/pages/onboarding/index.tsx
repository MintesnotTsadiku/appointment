import { FormEvent, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFrappeAuth, useFrappePostCall } from 'frappe-react-sdk';
import { CalendarDays, CheckCircle2, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { TimeInput } from '@/components/time-input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { ClockFormatToggle } from '@/components/clock-format-toggle';
import { useTheme } from '@/components/theme-provider';
import { useSession } from '@/context/session';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { validateWindow, formatWallTime, type ClockFormat } from '@/lib/time';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { reload } = useSession();
  const { logout } = useFrappeAuth();
  const { theme, setTheme } = useTheme();
  const { call: create, loading } = useFrappePostCall('appointment.scheduler.workspace.create');
  const request = useRef<{ payload: string; key: string }>();
  const [clockFormat, setClockFormat] = useState<ClockFormat>('12h');
  const [selectedDays, setSelectedDays] = useState(DAYS.slice(0, 5));
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState<{ business_name: string; public_path: string } | null>(null);
  const [form, setForm] = useState({
    business_name: '',
    location_name: '',
    service_name: '',
    timezone: 'Africa/Addis_Ababa',
    duration: '30',
    opens_at: '09:00',
    closes_at: '17:00',
  });

  const windowError = validateWindow(form.opens_at, form.closes_at);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    if (windowError) {
      setProblem(windowError);
      return;
    }
    if (!selectedDays.length) {
      setProblem('Choose at least one operating day.');
      return;
    }
    const payload = { ...form, weekdays: selectedDays };
    const serialized = JSON.stringify(payload);
    if (!request.current || request.current.payload !== serialized) {
      request.current = { payload: serialized, key: crypto.randomUUID() };
    }
    try {
      const result = await create({ ...payload, request_id: request.current.key });
      setDone(result?.message ?? null);
      const next = await reload();
      if (next?.state === 'workspace') {
        navigate('/home', { replace: false });
      }
    } catch (error) {
      setProblem(parseFrappeErrorMsg(error as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  const fieldLabel = (htmlFor: string, text: string) => (
    <Label htmlFor={htmlFor} className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
      {text}
    </Label>
  );

  const inputStyle = {
    borderColor: 'var(--border-default)',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
  } as const;

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2 font-heading font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary">
              <CalendarDays className="h-4 w-4 text-white" />
            </span>
            Get started
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Theme: ${theme}`}
              onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
            >
              {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void logout().then(() => navigate('/login', { replace: true }))}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {done ? (
          <section data-qa="onboarding-success" className="rounded-2xl border p-8" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
            <CheckCircle2 className="mb-3 h-10 w-10" style={{ color: 'var(--status-confirmed, #16a34a)' }} />
            <h1 className="font-heading text-2xl font-bold">Your business is saved as a draft</h1>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              {done.business_name} is ready. Review your details and publish the booking page when you are ready to accept
              customers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/settings/business">Review and publish</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={done.public_path}>Preview booking page</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            <h1 data-qa="onboarding-heading" className="font-heading text-3xl font-bold">
              Set up your business
            </h1>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
              Create your location and first service. Times use your location’s time zone. Your page stays private until you
              publish it, and no customer messages are sent.
            </p>

            {problem && (
              <p role="alert" data-qa="onboarding-error" className="mt-5 rounded-lg p-3" style={{ backgroundColor: 'var(--status-cancelled-bg, #fee2e2)', color: 'var(--status-cancelled, #b91c1c)' }}>
                {problem}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-6 rounded-2xl border p-6" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  {fieldLabel('business_name', 'Business name')}
                  <Input id="business_name" required maxLength={100} value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  {fieldLabel('location_name', 'Location name')}
                  <Input id="location_name" required maxLength={100} value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  {fieldLabel('service_name', 'First service name')}
                  <Input id="service_name" required maxLength={100} value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  {fieldLabel('duration', 'Appointment length (minutes)')}
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
                  {fieldLabel('opens_at', 'Opens at')}
                  <TimeInput id="opens_at" timeFormat={clockFormat} value={form.opens_at} onChange={(value) => setForm({ ...form, opens_at: value })} />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    24-hour value: {form.opens_at} · {formatWallTime(form.opens_at, clockFormat)}
                  </p>
                </div>
                <div>
                  {fieldLabel('closes_at', 'Closes at')}
                  <TimeInput id="closes_at" timeFormat={clockFormat} value={form.closes_at} onChange={(value) => setForm({ ...form, closes_at: value })} />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    24-hour value: {form.closes_at} · {formatWallTime(form.closes_at, clockFormat)}
                  </p>
                  {windowError && (
                    <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--status-cancelled, #b91c1c)' }}>
                      {windowError}
                    </p>
                  )}
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Operating days
                </legend>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day)}
                        onChange={(e) => setSelectedDays(e.target.checked ? [...selectedDays, day] : selectedDays.filter((d) => d !== day))}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" data-qa="onboarding-submit" disabled={loading || Boolean(windowError)}>
                {loading ? 'Creating…' : 'Create business'}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
