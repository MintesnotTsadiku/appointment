"""Read-only reproduction of the exact calendar filter on the empty QA site."""
import os,json,frappe
B='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
os.chdir(B+'/sites');frappe.init(site='meet-beta-fix-appointment-beta-readiness-01dea7.localhost',sites_path=B+'/sites');frappe.connect()
try:
 out={}
 for name,f in [('current',['>=','2026-09-01','<=','2026-09-30']),('supported_control',['between',['2026-09-01','2026-09-30']])]:
  try:out[name]={'row_count':len(frappe.get_all('Appointment',filters={'appointment_date':f},fields=['name']))}
  except Exception as e:out[name]={'exception':type(e).__name__,'message':str(e)}
 print(json.dumps(out,indent=2))
finally:frappe.destroy()
