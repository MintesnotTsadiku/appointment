import { useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { TimeInput } from '@/components/time-input';
import { ClockFormatToggle } from '@/components/clock-format-toggle';
import { parseFrappeErrorMsg } from '@/lib/utils';
import type { ClockFormat } from '@/lib/time';
import { Appointment } from '../types';

export function OwnedBookingActions({appointment, onClose, onSuccess}: {appointment: Appointment; onClose: ()=>void; onSuccess: ()=>void}) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState(appointment.start_time.slice(0,5));
  const [clockFormat, setClockFormat] = useState<ClockFormat>('12h');
  const [timeValid, setTimeValid] = useState(true);
  const [problem,setProblem] = useState('');
  const [confirmCancel,setConfirmCancel] = useState(false);
  const {call,loading} = useFrappePostCall('appointment.scheduler.booking.change');
  const {data,error} = useFrappeGetCall<{message: {name:string;owner:string;creation:string;data:string}[]}>('appointment.scheduler.booking.history',{booking_id:appointment.name});
  async function change(action: 'reschedule'|'cancel') {
    setProblem('');
    try {
      await call({booking_id:appointment.name, action, expected_modified:appointment.modified, date, start_time:time});
      onSuccess(); onClose();
    } catch(e) {setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0]));}
  }
  const editable = ['Pending','Confirmed'].includes(appointment.status);
  const historyLabels: Record<string,string> = {appointment_date:'Date',start_time:'Start time',end_time:'End time',status:'Status',client_name:'Customer name',client_email:'Email',client_phone:'Phone',notes:'Notes'};
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
    <DialogHeader><DialogTitle>Manage booking</DialogTitle><DialogDescription>{appointment.client_name}{appointment.service_name ? ` · ${appointment.service_name}` : ''}</DialogDescription></DialogHeader>
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Booking reference: <span data-qa="booking-reference">{appointment.appointment_id || appointment.name}</span></p>
    <p data-qa="booking-current-status">Status: {appointment.status}</p>
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Times are in {appointment.booking_timezone || 'Africa/Addis_Ababa'}. Changes keep this booking reference. Customer messages are not sent.</p>
    {problem && <p role="alert" style={{ color: 'var(--status-cancelled, #b91c1c)' }}>{problem}</p>}
    {editable && <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="booking-change-date" className="mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Date</Label>
          <Input id="booking-change-date" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div>
          <ClockFormatToggle value={clockFormat} onChange={setClockFormat} />
          <Label htmlFor="booking-change-time" className="mb-1.5 mt-3 block" style={{ color: 'var(--text-secondary)' }}>Start time</Label>
          <TimeInput id="booking-change-time" timeFormat={clockFormat} value={time} onChange={setTime} onValidityChange={setTimeValid} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button data-qa="booking-reschedule" disabled={loading || !date || !time || !timeValid} onClick={()=>change('reschedule')}>Save new time</Button>
        {!confirmCancel ? <Button variant="outline" data-qa="booking-cancel" disabled={loading} onClick={()=>setConfirmCancel(true)}>Cancel booking…</Button> : <div className="w-full space-y-3 rounded border p-3"><p>Cancel this booking and release its time?</p><Button data-qa="booking-confirm-cancel" disabled={loading} onClick={()=>change('cancel')}>Confirm cancellation</Button><Button variant="ghost" onClick={()=>setConfirmCancel(false)}>Keep booking</Button></div>}
      </div>
    </>}
    <section><h3 className="font-semibold">Booking history</h3>{error && <p role="alert">History could not be loaded.</p>}<ol className="mt-2 space-y-2 text-sm">{data?.message?.map(row=>{
      let description='Booking updated';
      try { const detail=JSON.parse(row.data); description=detail.operation==='created' ? 'Booking created' : (detail.changed || []).filter((item: unknown[])=>String(item[0]) in historyLabels).map((item: unknown[])=>`${historyLabels[String(item[0])]}: ${item[1]} → ${item[2]}`).join('; ') || description; } catch { /* Historical entry without structured changes. */ }
      return <li key={row.name}>{description}<br/><span style={{ color: 'var(--text-muted)' }}>{row.owner} · {row.creation}</span></li>;
    })}</ol></section>
  </DialogContent></Dialog>;
}
