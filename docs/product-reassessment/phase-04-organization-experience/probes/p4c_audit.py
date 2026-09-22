import os,json
import frappe
B='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
os.chdir(B+'/sites');frappe.init(site='meet-beta-fix-appointment-beta-readiness-01dea7.localhost',sites_path=B+'/sites');frappe.connect();frappe.set_user('Administrator')
parents={'Organization':['P4 Organization'],'Provider':['P4 Provider One','P4 Provider Two','Appointment Review Manager'],'Location':['P4 Location Alpha','P4 Location Beta'],'Service':['SRV-2026-0008','SRV-2026-0009'],'User Appointment Availability':['appointment-review-provider@example.test'],'User':['p4-provider-two@example.test']}
try:
 rows=[]
 for dt,names in parents.items():
  for n in names:
   if frappe.db.exists(dt,n):raise RuntimeError('Parent exists; stop: '+dt)
   for f in frappe.get_meta(dt).get_table_fields():
    for r in frappe.get_all(f.options,filters={'parent':n,'parenttype':dt},fields=['name','parent','parenttype','parentfield']):rows.append({'doctype':f.options,**dict(r)})
 u='p4-provider-two@example.test'
 print(json.dumps({'loaded_source':__import__('appointment').__file__,'orphans':rows,'auth':frappe.db.sql('SELECT count(*) FROM `__Auth` WHERE doctype=%s AND name=%s',('User',u))[0][0],'sessions':frappe.db.count('Sessions',{'user':u}),'defaults':frappe.db.count('DefaultValue',{'parent':u}),'business_counts':{d:frappe.db.count(d) for d in ['Organization','Provider','Service','Location','EventType','Appointment','Walk In','Booking Event','Appointment Group','User Appointment Availability']},'retained_users':frappe.get_all('User',filters={'name':['in',['appointment-review-'+r+'@example.test' for r in ['manager','provider','reception','customer']]]},pluck='name'),'browser_accounts':frappe.db.count('Browser Account'),'browser_sessions':frappe.db.count('Browser Session'),'email_muted':frappe.conf.get('mute_emails'),'scheduler_paused':frappe.conf.get('pause_scheduler')},indent=2,default=str))
finally:frappe.destroy()
