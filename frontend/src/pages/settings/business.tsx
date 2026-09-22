import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { parseFrappeErrorMsg } from '@/lib/utils';

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
  const request = useRef<{ payload: string; key: string }>();
  const [form, setForm] = useState({business_name: '', location_name: '', service_name: '', timezone: 'Africa/Addis_Ababa', duration: '30', opens_at: '09:00', closes_at: '17:00'});
  async function submit(event: FormEvent) {
    event.preventDefault(); setProblem(''); setNotice('');
    const payload = { ...form, weekdays: selectedDays };
    const serialized = JSON.stringify(payload);
    if (!request.current || request.current.payload !== serialized) request.current = {payload: serialized, key: crypto.randomUUID()};
    try {
      await create({...payload, request_id: request.current.key});
      await mutate(); setNotice('Business saved as a draft. Review it below, then publish when ready.');
    } catch (e) { setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  async function setPublished(row: Offering) {
    setProblem(''); setNotice('');
    try {
      await publish({organization: row.organization, published: row.published ? 0 : 1});
      await mutate(); setNotice(row.published ? 'Booking page unpublished. Existing bookings remain available to staff.' : 'Booking page published. You can share its link.');
    } catch (e) { setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  const inputClass = 'w-full rounded border border-slate-300 p-2 text-slate-900 bg-white';
  return <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="flex gap-5"><Link to="/home">Home</Link><Link to="/reception">Reception</Link></nav>
      <header><h1 className="text-3xl font-semibold">Business booking setup</h1><p className="mt-2">Set up a location and your first service. Your page stays private until you publish it.</p></header>
      {isLoading && <p role="status">Loading your businesses…</p>}
      {(error || problem) && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{problem || parseFrappeErrorMsg(error!)}</p>}
      {notice && <p role="status" className="rounded bg-green-50 p-3 text-green-900">{notice}</p>}
      {!error && <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-6 border">
        <h2 className="text-xl font-semibold">Create a business</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['business_name', 'Business name'], ['location_name', 'Location name'], ['service_name', 'Service name']] as const).map(([key,label]) => <label key={key}>{label}<input className={inputClass} id={key} required maxLength={100} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
          <label>Location time zone<input className={inputClass} id="timezone" required list="timezones" value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}/><datalist id="timezones"><option>Africa/Addis_Ababa</option><option>UTC</option><option>Asia/Kolkata</option><option>America/New_York</option></datalist></label>
          <label>Duration (minutes)<input className={inputClass} id="duration" type="number" min={5} max={480} required value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></label>
          <label>Opens at<input className={inputClass} id="opens_at" type="time" required value={form.opens_at} onChange={e=>setForm({...form,opens_at:e.target.value})}/></label>
          <label>Closes at<input className={inputClass} id="closes_at" type="time" required value={form.closes_at} onChange={e=>setForm({...form,closes_at:e.target.value})}/></label>
        </div>
        <fieldset><legend>Operating days</legend><div className="flex flex-wrap gap-4 mt-2">{days.map(day=><label key={day} className="flex gap-2 items-center"><input type="checkbox" checked={selectedDays.includes(day)} onChange={e=>setSelectedDays(e.target.checked ? [...selectedDays,day] : selectedDays.filter(d=>d!==day))}/>{day}</label>)}</div></fieldset>
        <p className="text-sm text-slate-600">You will be the first provider. Times use the location’s time zone. Payment collection and customer messages are not enabled by this setup.</p>
        <Button type="submit" data-qa="business-save" disabled={loading || !selectedDays.length}>{loading ? 'Saving…' : 'Save draft business'}</Button>
      </form>}
      <section className="space-y-4" aria-label="Your booking pages">
        <h2 className="text-xl font-semibold">Your booking pages</h2>
        {data?.message?.length === 0 && <p>No booking pages yet.</p>}
        {data?.message?.map(row=><article key={row.offering} className="border rounded-xl p-5 bg-white space-y-3" data-qa="business-offering">
          <h3 className="font-semibold">{row.business_name} — {row.service}</h3><p>{row.timezone} · {row.published ? 'Published' : 'Draft'}</p>
          <div className="flex flex-wrap gap-4 items-center"><Button data-qa="business-publish" disabled={publishing} onClick={()=>setPublished(row)}>{row.published ? 'Unpublish booking page' : 'Publish booking page'}</Button>{row.published && <Link data-qa="business-public-link" className="underline" to={row.public_path}>Open customer booking page</Link>}</div>
        </article>)}
      </section>
    </div>
  </main>;
}
