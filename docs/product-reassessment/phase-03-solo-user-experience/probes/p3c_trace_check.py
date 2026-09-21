import json,zipfile
from pathlib import Path
base=Path('/tmp/agent_browser_qa/appointment')
runs={
'handoff_booking':'appointment-p3b-handoff-booking-20260921T201938Z',
'handoff_exists':'appointment-p3b-handoff-exists-before-inspection-20260921T201959Z',
'handoff_reception':'appointment-p3b-handoff-provider-reception-20260921T202005Z',
'handoff_calendar':'appointment-p3b-handoff-provider-calendar-20260921T202016Z',
'no_show':'appointment-p3b-update-afternoon-noshow-20260921T200659Z',
'closed_day':'appointment-p3b-customer-closed-day-20260921T202404Z'}
selected=['book_time_slot','get_events_from_doc','update_appointment','get_desk_appointments','dashboard.get_appointments']
result=[]
for run,directory in runs.items():
 with zipfile.ZipFile(base/directory/'trace.zip') as z:
  for n in z.namelist():
   if not n.endswith('.network'):continue
   for line in z.read(n).splitlines():
    s=json.loads(line).get('snapshot',{});request=s.get('request',{});url=request.get('url','');endpoint=url.split('/api/method/')[-1].split('?')[0]
    if not any(t in endpoint for t in selected):continue
    response=s.get('response',{});sha=response.get('content',{}).get('_sha1');body={}
    if sha:
     try:body=json.loads(z.read('resources/'+sha))
     except (ValueError,KeyError):pass
    payload=body.get('message',body) if isinstance(body,dict) else body
    out={'run':run,'trace':str(base/directory/'trace.zip'),'endpoint':endpoint,'started_at':s.get('startedDateTime'),'http_status':response.get('status'),'response_fields':list(payload) if isinstance(payload,dict) else type(payload).__name__}
    if isinstance(payload,dict):
     for k in ['event_id','success','status','error','message']:
      if k in payload and not isinstance(payload[k],(dict,list)):out[k]=str(payload[k])[:400]
     apt=payload.get('appointment',{})
     if isinstance(apt,dict):out['appointment']={k:apt.get(k) for k in ['name','status','appointment_date','start_time','end_time','modified_by'] if k in apt}
     rows=payload.get('appointments',payload.get('events',[]))
     if isinstance(rows,list) and 'appointments' in payload:
      out['row_count']=len(rows)
      out['handoff_customer_present']='P3B Handoff Customer' in json.dumps(rows)
      out['afternoon_control']=[{k:r.get(k) for k in ['name','status','appointment_date','start_time','end_time']} for r in rows if r.get('name')=='P3B-APT-AFT']
    if isinstance(payload,dict) and endpoint.endswith('get_events_from_doc'):
     out['event_groups']={k:[{f:row.get(f) for f in ['name','subject','starts_on','ends_on'] if f in row} for row in v] for k,v in payload.items() if isinstance(v,list)}
    if isinstance(payload,list):out['row_count']=len(payload);out['handoff_customer_present']='P3B Handoff Customer' in json.dumps(payload)
    if isinstance(body,dict):
     out['exc_type']=body.get('exc_type')
    result.append(out)
print(json.dumps(result,indent=2))
