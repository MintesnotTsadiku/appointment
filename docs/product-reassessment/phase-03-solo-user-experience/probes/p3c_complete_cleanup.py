"""Exact Phase 3 orphan cleanup; refuses to delete children of existing parents."""
import os, json
import frappe
from frappe.sessions import clear_sessions
BENCH='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
SITE='meet-beta-fix-appointment-beta-readiness-01dea7.localhost'
users=['p3b-solo-owner@example.test','p3b-solo-customer@example.test','p3b-onb@example.test']
parents={'Organization':['P3B Org'],'Provider':['P3B Solo Owner','P3B Onboarding'],'Location':['P3B Studio'],'Service':['SRV-2026-0006'],'EventType':['EVT-2026-000001'],'User Appointment Availability':['p3b-solo-owner@example.test'],'User':users}
retained=['appointment-review-'+r+'@example.test' for r in ['manager','provider','reception','customer']]
os.chdir(BENCH+'/sites')
frappe.init(site=SITE,sites_path=BENCH+'/sites');frappe.connect();frappe.set_user('Administrator')
def audit():
 rows=[]
 for dt,names in parents.items():
  for name in names:
   assert not frappe.db.exists(dt,name), 'Parent was recreated; stop for review'
   for f in frappe.get_meta(dt).get_table_fields():
    for row in frappe.get_all(f.options,filters={'parent':name,'parenttype':dt},fields=['name','parent','parenttype','parentfield']):
     rows.append({'doctype':f.options,**dict(row)})
 aux={'auth':frappe.db.sql('SELECT count(*) FROM `__Auth` WHERE doctype=%s AND name IN %s',('User',users))[0][0], 'sessions':frappe.db.count('Sessions',{'user':['in',users]}),'defaults':frappe.db.count('DefaultValue',{'parent':['in',users]})}
 return {'orphan_children':rows,'auxiliary_counts':aux,'retained_users':[u for u in retained if frappe.db.exists('User',u)],'browser_accounts':frappe.db.count('Browser Account'),'browser_sessions':frappe.db.count('Browser Session'),'business_counts':{dt:frappe.db.count(dt) for dt in ['Organization','Provider','Service','Location','EventType','Appointment','Booking Event','Appointment Group']},'email_muted':frappe.conf.get('mute_emails'),'scheduler_paused':frappe.conf.get('pause_scheduler')}
try:
 before=audit()
 assert len(before['retained_users'])==4 and before['browser_accounts']==4 and before['browser_sessions']==4
 for row in before['orphan_children']:
  frappe.db.delete(row['doctype'],{k:row[k] for k in ['name','parent','parenttype','parentfield']})
 for user in users:
  frappe.db.sql('DELETE FROM `__Auth` WHERE doctype=%s AND name=%s',('User',user))
  frappe.db.delete('DefaultValue',{'parent':user})
 frappe.db.commit()
 for user in users:
  clear_sessions(user=user,force=True)
  frappe.clear_cache(user=user)
 frappe.db.commit()
 after=audit()
 assert not after['orphan_children'] and not any(after['auxiliary_counts'].values())
 assert after['retained_users']==before['retained_users'] and after['browser_accounts']==4 and after['browser_sessions']==4
 print(json.dumps({'site':SITE,'before':before,'after':after},indent=2,default=str))
finally:frappe.destroy()
