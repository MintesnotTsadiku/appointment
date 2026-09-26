import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import AppTopNav from '@/components/workspace/AppTopNav';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { parseFrappeErrorMsg } from '@/lib/utils';

interface Offering { offering: string; service: string; public_path: string; published: boolean }
interface Workspace { provider: string; offerings: Offering[] }
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function IndependentBookingSettings() {
  const { data, mutate } = useFrappeGetCall<{ message: Workspace }>('appointment.scheduler.independent.workspace');
  const { call: create, loading } = useFrappePostCall('appointment.scheduler.independent.create');
  const { call: publish, loading: publishing } = useFrappePostCall('appointment.scheduler.independent.publish');
  const [location, setLocation] = useState('');
  const [service, setService] = useState('');
  const [zone, setZone] = useState('Africa/Addis_Ababa');
  const [duration, setDuration] = useState('30');
  const [opens, setOpens] = useState('09:00');
  const [closes, setCloses] = useState('17:00');
  const [weekdays, setWeekdays] = useState(days.slice(0, 5));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const workspace = data?.message;
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await create({ provider: workspace?.provider, location_name: location, service_name: service,
        timezone: zone, duration, opens_at: opens, closes_at: closes, weekdays });
      await mutate(); setNotice('Your offering is saved. Review it before publishing.');
    } catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  async function toggle(row: Offering) {
    setError('');
    try {
      await publish({ provider: workspace?.provider, published: row.published ? 0 : 1 });
      await mutate(); setNotice(row.published ? 'Booking is unpublished.' : 'Booking is published.');
    } catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  return <><AppTopNav active="settings" /><main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <h1 className="text-3xl font-semibold">Independent booking setup</h1>
    <p>Set your service and working hours. Booking remains private until you publish it.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!workspace?.offerings.length && <form onSubmit={save} className="space-y-4">
      <label className="block">Location name<Input required maxLength={100} value={location} onChange={event => setLocation(event.target.value)} /></label>
      <label className="block">Service name<Input required maxLength={100} value={service} onChange={event => setService(event.target.value)} /></label>
      <TimeZoneSelect value={zone} onChange={setZone} />
      <label className="block">Duration in minutes<Input required type="number" min={5} max={480} value={duration} onChange={event => setDuration(event.target.value)} /></label>
      <label className="block">Opening time<Input required type="time" value={opens} onChange={event => setOpens(event.target.value)} /></label>
      <label className="block">Closing time<Input required type="time" value={closes} onChange={event => setCloses(event.target.value)} /></label>
      <fieldset><legend>Working days</legend>{days.map(day => <label className="mr-4 inline-flex gap-2" key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={event => setWeekdays(event.target.checked ? [...weekdays, day] : weekdays.filter(value => value !== day))} />{day}</label>)}</fieldset>
      <Button disabled={loading || !workspace} type="submit">Save independent offering</Button>
    </form>}
    {workspace?.offerings.map(row => <section key={row.offering} aria-label="Independent offering" className="space-y-3 rounded-xl border p-5"><h2>{row.service}</h2><p>{row.published ? 'Published' : 'Private draft'}</p><Button disabled={publishing} onClick={() => void toggle(row)}>{row.published ? 'Unpublish booking' : 'Publish booking'}</Button>{row.published && <Link className="ml-4 underline" to={row.public_path}>Open guest booking</Link>}</section>)}
    <nav className="flex gap-6"><Link className="underline" to="/calendar">View schedule</Link><Link className="underline" to="/settings/website">Start Website setup</Link></nav>
  </main></>;
}
