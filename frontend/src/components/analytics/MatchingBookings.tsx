import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/dialog';

export function MatchingBookings({organization,id,period,filters,scope}:{scope:string;organization:string;id:string;period:number;filters:object}) {
 const [open,setOpen]=useState(false);
 const [offset,setOffset]=useState(0);
 const serialized=JSON.stringify(filters);
 const query=useFrappeGetCall<{message:{total:number;records:{reference:string;date:string;time:string;timezone:string;status:string;service:string;provider:string;location:string}[]}}>('appointment.scheduler.analytics.records',{organization,metric_id:id,period,filters:serialized,offset},open?`records-${scope}-${organization}-${id}-${period}-${serialized}-${offset}`:null);
 const data=query.data?.message;
 return <><Button type="button" variant="link" className="mt-3 h-auto px-0 text-xs" onClick={()=>{setOffset(0);setOpen(true);}}>View matching bookings</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] max-w-4xl overflow-auto p-6"><DialogTitle>Matching bookings</DialogTitle><DialogDescription>Same business permissions and supported filters as this widget. Today and upcoming cards keep their declared local windows.</DialogDescription>{query.error?<p role="alert">Unable to load matching records.</p>:!data?<p role="status">Loading records…</p>:<><p>{data.total} matching bookings</p><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Reference','Appointment date','Time','Timezone','Status','Service','Provider','Location'].map(name=><th scope="col" key={name} className="p-2">{name}</th>)}</tr></thead><tbody>{data.records.map(row=><tr key={row.reference}>{[row.reference,row.date,row.time,row.timezone,row.status,row.service,row.provider,row.location].map((value,index)=><td className="border-t p-2" key={index}>{value}</td>)}</tr>)}</tbody></table></div><nav className="flex justify-between text-sm" aria-label="Matching booking pages"><Button type="button" variant="ghost" disabled={!offset} onClick={()=>setOffset(offset-50)}>Previous</Button><Button type="button" variant="ghost" disabled={offset+50>=data.total} onClick={()=>setOffset(offset+50)}>Next</Button></nav></>}</DialogContent></Dialog></>;
}
