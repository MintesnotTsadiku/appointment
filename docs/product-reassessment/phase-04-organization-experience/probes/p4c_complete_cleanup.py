"""Complete only the exact orphan manifest audited for Phase 4; preserve QA access."""
import json,os,sys
import frappe
B='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
manifest=json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/p4-audit.json'))
os.chdir(B+'/sites');frappe.init(site='meet-beta-fix-appointment-beta-readiness-01dea7.localhost',sites_path=B+'/sites');frappe.connect();frappe.set_user('Administrator')
try:
 for row in manifest['orphans']:
  assert not frappe.db.exists(row['parenttype'],row['parent']), 'Parent recreated; stop'
  frappe.db.delete(row['doctype'],{k:row[k] for k in ['name','parent','parenttype','parentfield']})
 u='p4-provider-two@example.test'
 assert not frappe.db.exists('User',u)
 frappe.db.delete('DefaultValue',{'parent':u})
 frappe.db.commit()
 print(json.dumps({'removed_children':len(manifest['orphans']),'removed_defaults':manifest['defaults'],'manifest':'p4c-before-cleanup.json'}))
finally:frappe.destroy()
