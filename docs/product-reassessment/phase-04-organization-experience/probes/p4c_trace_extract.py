"""Export allowlisted synthetic response data; omit headers and secret-bearing URLs."""
import json,zipfile
from pathlib import Path
out=[]
keys=['name','appointment_id','provider','client_name','status','start_time','end_time','appointment_date','modified_by','service']
methods=['update_appointment','get_desk_appointments','assign_walk_in_to_slot','create_desk_appointment','dashboard.get_appointments','get_detailed_checklist','get_management_hierarchy']
for path in sorted(Path('/tmp/agent_browser_qa/appointment').glob('appointment-p4-*/trace.zip')):
 with zipfile.ZipFile(path) as z:
  for f in z.namelist():
   if not f.endswith('.network'):continue
   for line in z.read(f).splitlines():
    s=json.loads(line).get('snapshot',{});req=s.get('request',{});endpoint=req.get('url','').split('/api/method/')[-1].split('?')[0]
    if not any(endpoint.endswith(m) for m in methods):continue
    res=s.get('response',{});sha=res.get('content',{}).get('_sha1')
    try: body=json.loads(z.read('resources/'+sha)) if sha else {}
    except (KeyError,ValueError):continue
    payload=body.get('message',body) if isinstance(body,dict) else body
    r={'trace':str(path),'started_at':s.get('startedDateTime'),'endpoint':endpoint,'http_status':res.get('status')}
    if isinstance(payload,dict):
     r['fields']=list(payload)
     for k in ['success','error']:
      if k in payload:r[k]=payload[k]
     if isinstance(payload.get('appointment'),dict):r['appointment']={k:payload['appointment'].get(k) for k in keys}
     if isinstance(payload.get('appointments'),list):r['appointments']=[{k:a.get(k) for k in keys} for a in payload['appointments'] if a.get('client_name','').startswith('P4 ')]
     if endpoint.endswith('get_detailed_checklist'):r['checklist']=payload
    out.append(r)
print(json.dumps(out,indent=2,default=str))
