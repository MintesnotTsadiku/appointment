import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { statusLabel } from './widgetRegistry';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/dialog';

export function MatchingBookings({organization,id,period,filters,scope}:{scope:string;organization:string;id:string;period:number;filters:object}) {
 const { t } = useTranslation();
 const [open,setOpen]=useState(false);
 const columns=[t('staff.calendar.detail.reference'),t('staff.dashboard.matching.appointmentDate'),t('staff.calendar.detail.time'),t('staff.locations.fields.timezone'),t('staff.admin.colStatus'),t('staff.receptionDesk.service'),t('staff.reception.provider'),t('staff.receptionDesk.location')];
 const [offset,setOffset]=useState(0);
 const serialized=JSON.stringify(filters);
 const query=useFrappeGetCall<{message:{total:number;records:{reference:string;date:string;time:string;timezone:string;status:string;service:string;provider:string;location:string}[]}}>('appointment.scheduler.analytics.records',{organization,metric_id:id,period,filters:serialized,offset},open?`records-${scope}-${organization}-${id}-${period}-${serialized}-${offset}`:null);
 const data=query.data?.message;
 return <><Button type="button" variant="link" className="mt-3 h-auto px-0 text-xs" onClick={()=>{setOffset(0);setOpen(true);}}>{t('staff.dashboard.matching.view')}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] max-w-4xl overflow-auto p-6"><DialogTitle>{t('staff.dashboard.matching.title')}</DialogTitle><DialogDescription>{t('staff.dashboard.matching.description')}</DialogDescription>{query.error?<p role="alert">{t('staff.dashboard.matching.loadError')}</p>:!data?<p role="status">{t('staff.dashboard.matching.loading')}</p>:<><p>{t('staff.dashboard.matching.count').replace('{0}',String(data.total))}</p><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{columns.map(name=><th scope="col" key={name} className="p-2">{name}</th>)}</tr></thead><tbody>{data.records.map(row=><tr key={row.reference}>{[row.reference,row.date,row.time,row.timezone,statusLabel(t,row.status),row.service,row.provider,row.location].map((value,index)=><td className="border-t p-2" key={index}>{value}</td>)}</tr>)}</tbody></table></div><nav className="flex justify-between text-sm" aria-label={t('staff.dashboard.matching.pages')}><Button type="button" variant="ghost" disabled={!offset} onClick={()=>setOffset(offset-50)}>{t('staff.dashboard.workspace.previous')}</Button><Button type="button" variant="ghost" disabled={offset+50>=data.total} onClick={()=>setOffset(offset+50)}>{t('staff.dashboard.workspace.next')}</Button></nav></>}</DialogContent></Dialog></>;
}
