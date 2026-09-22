import { useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/dialog';
import { Button } from '@/components/button';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { Appointment } from '../types';

export function OwnedBookingActions({appointment, onClose, onSuccess}: {appointment: Appointment; onClose: ()=>void; onSuccess: ()=>void}) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState(appointment.start_time.slice(0,5));
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
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900 p-6">
    <DialogHeader><DialogTitle>Manage booking</DialogTitle><DialogDescription>{appointment.client_name} · {appointment.service_name}</DialogDescription></DialogHeader>
    <p className="text-sm break-all">Reference: {appointment.name}</p><p data-qa="booking-current-status">Status: {appointment.status}</p>
    <p className="text-sm">Times are in {appointment.booking_timezone}. Changes retain this booking reference. Customer messages are not sent.</p>
    {problem && <p role="alert" className="text-red-700">{problem}</p>}
    {editable && <><label>Date<input id="booking-change-date" type="date" className="block w-full border p-2 rounded" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Start time<input id="booking-change-time" type="time" className="block w-full border p-2 rounded" value={time} onChange={e=>setTime(e.target.value)}/></label>
      <Button data-qa="booking-reschedule" disabled={loading || !date || !time} onClick={()=>change('reschedule')}>Save new time</Button>
      {!confirmCancel ? <Button variant="outline" data-qa="booking-cancel" disabled={loading} onClick={()=>setConfirmCancel(true)}>Cancel booking…</Button> : <div className="border rounded p-3 space-y-3"><p>Cancel this booking and release its time?</p><Button data-qa="booking-confirm-cancel" disabled={loading} onClick={()=>change('cancel')}>Confirm cancellation</Button><Button variant="ghost" onClick={()=>setConfirmCancel(false)}>Keep booking</Button></div>}</>}
    <section><h3 className="font-semibold">Booking history</h3>{error && <p role="alert">History could not be loaded.</p>}<ol className="text-sm space-y-2 mt-2">{data?.message?.map(row=>{
      let description='Booking updated';
      try { const detail=JSON.parse(row.data); description=detail.operation==='created' ? 'Booking created' : (detail.changed || []).filter((item: unknown[])=>String(item[0]) in historyLabels).map((item: unknown[])=>`${historyLabels[String(item[0])]}: ${item[1]} → ${item[2]}`).join('; ') || description; } catch { /* Historical entry without structured changes. */ }
      return <li key={row.name}>{description}<br/><span className="text-slate-600">{row.owner} · {row.creation}</span></li>;
    })}</ol></section>
  </DialogContent></Dialog>;
}
