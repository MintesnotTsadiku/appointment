"""Bounded synthetic duplicate-slot check with stored outcomes and exact cleanup."""
import os,sys,json
import frappe
B='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
P='/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-05/docs/product-reassessment/phase-05-customer-experience/probes'
os.chdir(B+'/sites');sys.path.insert(0,P)
frappe.init(site='meet-beta-fix-appointment-beta-readiness-01dea7.localhost',sites_path=B+'/sites');frappe.connect();frappe.set_user('Administrator')
from appointment import qa_fixtures
from appointment.api.personal_meet import book_time_slot,get_time_slots
from p5_fixtures import _duration_and_slots,_first
out={};state=None
try:
 assert not frappe.db.count('Booking Event') and not frappe.db.count('Organization'), 'Site not empty; stop'
 state=dict(qa_fixtures.setup())
 values,w,duration,org,service,date,slots=_duration_and_slots()
 slot=next(s for s in slots['all_available_slots_for_data'] if not s.get('booked'))
 out['selected_slot']={k:slot.get(k) for k in ['start_time','end_time','provider','booked','available']}
 out['time_configuration']={'site':frappe.db.get_single_value('System Settings','time_zone'),'fixture_user':frappe.db.get_value('User',state['user'],'time_zone'),'location':frappe.db.get_value('Location',values['qa_location_id'],'timezone')}
 ids=[];out['attempts']=[]
 for n in (1,2):
  frappe.set_user('Guest')
  try:
   r=_first(book_time_slot(duration_id=duration,date=date,start_time=slot['start_time'],end_time=slot['end_time'],user_timezone_offset='180',user_name='P5C Conflict '+str(n),user_email='p5c-conflict-'+str(n)+'@example.test',organization_id=org,service_id=service,provider_id=slot.get('provider') or values['qa_provider_id'],time_format='12h'))
   eid=(r or {}).get('event_id');out['attempts'].append({'identity':'Guest','event_id':eid,'error':(r or {}).get('error')})
   if eid:ids.append(eid)
  except Exception as e:out['attempts'].append({'exception':type(e).__name__})
  frappe.set_user('Administrator')
  after=_first(get_time_slots(duration_id=duration,date=date,user_timezone_offset='180',organization_id=org,service_id=service))
  out['attempts'][-1]['same_slot_after']=[{k:s.get(k) for k in ['start_time','end_time','booked','available']} for s in after.get('all_available_slots_for_data',[]) if s.get('start_time')==slot['start_time']]
 out['stored_events']=frappe.get_all('Booking Event',filters={'name':['in',ids]},fields=['name','starts_on','ends_on','status','custom_user_calendar'])
finally:
 frappe.set_user('Administrator')
 if state:
  out['cleanup']=qa_fixtures.teardown()
  u=state['user']
  if not frappe.db.exists('User',u):
   defaults=frappe.get_all('DefaultValue',filters={'parent':u},pluck='name')
   for name in defaults:frappe.db.delete('DefaultValue',{'name':name,'parent':u})
   out['extra_default_cleanup']=len(defaults)
  frappe.db.commit()
 out['final_business_counts']={d:frappe.db.count(d) for d in ['Organization','Provider','Location','Service','EventType','Appointment','Booking Event','Appointment Group','User Appointment Availability']}
 print(json.dumps(out,indent=2,default=str))
 frappe.destroy()
