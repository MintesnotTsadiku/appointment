import os,json,sys,frappe
B='/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench'
os.chdir(B+'/sites');frappe.init(site='meet-beta-fix-appointment-beta-readiness-01dea7.localhost',sites_path=B+'/sites');frappe.connect();frappe.set_user('Administrator')
u='qa-browser-801f8d@qa.local'
assert not frappe.db.exists('User',u)
frappe.db.delete('DefaultValue',{'name':'j9o407fu4a','parent':u})
frappe.db.commit()
sys.path.insert(0,'/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-05/docs/product-reassessment/phase-05-customer-experience/probes')
from p5_cleanup_audit import main
main()
frappe.destroy()
