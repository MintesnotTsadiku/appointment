"""Read-only operational capability check. Export flags, not mail/config secrets."""
import os,json,frappe
B='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
os.chdir(B+'/sites');frappe.init(site='meet-beta-fix-appointment-beta-readiness-01dea7.localhost',sites_path=B+'/sites');frappe.connect();frappe.set_user('Administrator')
try:
 out={'mail_server_configured':bool(frappe.conf.get('mail_server')),'site_rate_limit_configured':bool(frappe.conf.get('rate_limit')),'email_muted':frappe.conf.get('mute_emails'),'scheduler_paused':frappe.conf.get('pause_scheduler'),'unique_indexes':{}}
 for dt in ['Appointment','Booking Event']:
  rows=frappe.db.sql('SHOW INDEX FROM `tab'+dt+'`',as_dict=True)
  out['unique_indexes'][dt]=[{'key':r.Key_name,'column':r.Column_name,'sequence':r.Seq_in_index} for r in rows if not r.Non_unique]
 out['framework_doctypes_present']={d:bool(frappe.db.exists('DocType',d)) for d in ['Email Queue','Data Import','Personal Data Download Request','Personal Data Deletion Request','Version']}
 out['business_counts']={d:frappe.db.count(d) for d in ['Appointment','Booking Event','Organization','Provider','Location','Service','Walk In']}
 print(json.dumps(out,indent=2,default=str))
finally:frappe.destroy()
