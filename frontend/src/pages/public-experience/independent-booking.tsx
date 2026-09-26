import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { parseFrappeErrorMsg } from '@/lib/utils';

interface Slot { start_time: string; end_time: string; available: boolean }
interface Offering { business_name: string; service: string; duration: number; timezone: string }

export default function IndependentBooking() {
  const { offeringId } = useParams();
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<Slot>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const [problem, setProblem] = useState('');
  const [booking, setBooking] = useState('');
  const { data, error } = useFrappeGetCall<{ message: Offering }>('appointment.scheduler.independent.public_offering', { offering_id: offeringId });
  const { data: slots } = useFrappeGetCall<{ message: { all_available_slots_for_data: Slot[] } }>('appointment.scheduler.booking.slots', { offering_id: offeringId, date }, date ? undefined : null);
  const { call, loading } = useFrappePostCall('appointment.scheduler.booking.book');
  const offering = data?.message;
  async function submit(event: FormEvent) {
    event.preventDefault(); setProblem('');
    try {
      const response = await call({ offering_id: offeringId, start_time: slot?.start_time, end_time: slot?.end_time,
        user_name: name, user_email: email, request_id: requestId });
      setBooking(response.message.booking_id);
    } catch (reason) { setProblem(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  if (error) return <main className="mx-auto max-w-xl p-8"><h1>Booking unavailable</h1><p>This offering is unavailable. Contact the business for help.</p></main>;
  if (!offering) return <main aria-busy="true" className="p-8">Loading booking…</main>;
  return <main className="mx-auto max-w-2xl space-y-6 px-5 py-10"><h1 className="text-3xl font-semibold">Book with {offering.business_name}</h1><p>{offering.service} · {offering.duration} minutes</p>
    {booking ? <section role="status"><h2>Booking confirmed</h2><p>Reference: {booking}</p><p>No email notification was sent.</p></section> : <form onSubmit={submit} className="space-y-5">
      <label className="block">Appointment date<Input required type="date" value={date} onChange={event => { setDate(event.target.value); setSlot(undefined); }} /></label>
      <fieldset><legend>Available times in {offering.timezone}</legend><div className="flex flex-wrap gap-3">{slots?.message.all_available_slots_for_data.filter(value => value.available).map(value => <label key={value.start_time} className="rounded-lg border p-3"><input type="radio" name="appointment-time" checked={slot?.start_time === value.start_time} onChange={() => setSlot(value)} /> {new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', timeZone: offering.timezone }).format(new Date(value.start_time))}</label>)}</div>{date && slots && !slots.message.all_available_slots_for_data.some(value => value.available) && <p>No times are available on this date. Choose another day.</p>}</fieldset>
      <label className="block">Your name<Input required value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="block">Your email<Input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      {problem && <p role="alert">{problem}</p>}<Button type="submit" disabled={!slot || loading}>Confirm appointment</Button>
    </form>}
  </main>;
}
