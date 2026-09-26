"""Explicit development-only managed browser bootstrap."""
import hashlib
import json
import subprocess
import os
import secrets
from pathlib import Path
import frappe
from frappe.utils.password import update_password

SITE = 'meet-beta-feat-content-publishing-galler-5839d4.localhost'
RUNTIME = Path('/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4')
USER = 'content-browser-owner@example.test'
LABEL = 'Appointment content development owner'

def run():
    if frappe.local.site != SITE or not frappe.conf.get('worktree_development'):
        raise RuntimeError('This bootstrap is restricted to the isolated content site')
    frappe.set_user('Administrator')
    private = RUNTIME / 'browser-credentials.json'
    if private.exists():
        credentials = json.loads(private.read_text())
        if credentials.get('username') != USER or credentials.get('site') != SITE:
            raise RuntimeError('Private bootstrap identity does not match')
    else:
        credentials = {'site': SITE, 'username': USER, 'password': secrets.token_urlsafe(32)}
        descriptor = os.open(private, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as stream:
            json.dump(credentials, stream)
    if not frappe.db.exists('User', USER):
        frappe.get_doc({'doctype':'User', 'email':USER, 'first_name':'Content Browser Owner',
            'enabled':1, 'user_type':'System User', 'send_welcome_email':0,
            'roles':[{'role':'Provider'}, {'role':'Organization Manager'}]}).insert(ignore_permissions=True)
    forbidden = {'System Manager', 'Platform Admin', 'Framework Builder'}
    roles = set(frappe.get_roles(USER))
    if forbidden & roles:
        raise RuntimeError('Browser identity has forbidden platform roles')
    update_password(USER, credentials['password'], logout_all_sessions=False)
    name = frappe.db.get_value('Browser Account', {'account_label':LABEL}, 'name')
    if not name:
        from agent_plane.managed_browser.service import create_browser_profile
        name = create_browser_profile(account_label=LABEL, owner_user=USER,
            base_domains=[SITE, '127.0.0.11'], runtime_provider_key='')['browser_account']
    account = frappe.get_doc('Browser Account', name)
    if account.owner_user != USER:
        raise RuntimeError('Existing browser profile belongs to another identity')
    account.update({'status':'Active', 'session_health':'Healthy', 'allow_stored_login_credentials':1,
        'credential_username':USER, 'credential_password':credentials['password'],
        'login_strategy':'Direct HTTP Credential Login', 'login_start_url':'/login',
        'login_success_url_contains':'/onboarding', 'base_domains_json':json.dumps([SITE, '127.0.0.11'])})
    account.save(ignore_permissions=True)
    name_session = frappe.db.get_value('Browser Session', {'browser_account':name, 'session_label':'primary'}, 'name')
    session = frappe.get_doc('Browser Session', name_session)
    if session.lock_status == 'Locked' or session.locked_by_run or session.locked_by_browser_qa_run:
        raise RuntimeError('Existing browser session is in use')
    session.update({'status':'Active', 'lock_status':'Free', 'capture_redaction_mode':'Auth Challenge Screens'})
    session.save(ignore_permissions=True)
    settings = frappe.get_single('Runtime Settings')
    domains = set(str(settings.browser_allowed_domains or '').replace('\n', ',').split(',')) - {''}
    domains.update([SITE, '127.0.0.11'])
    settings.browser_allowed_domains = ','.join(sorted(domains))
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    return {'site':SITE, 'browser_account':name, 'browser_session':name_session,
        'username':USER, 'roles':sorted(roles), 'credentials_file':str(private)}

def enqueue_smoke(update_baseline=0, suite='content-runtime'):
    if frappe.local.site != SITE or not frappe.conf.get('worktree_development'):
        raise RuntimeError('This smoke test is restricted to the isolated content site')
    from frappe.utils import get_bench_path
    if Path(get_bench_path()) != RUNTIME / 'bench':
        raise RuntimeError('Export FRAPPE_BENCH_ROOT for the isolated queue namespace')
    from agent_plane.qa_workflows.browser_qa_service import enqueue_browser_qa_request
    if suite not in ('content-runtime', 'website-setup'):
        raise RuntimeError('Unsupported development suite')
    account = frappe.db.get_value('Browser Account', {'account_label':LABEL}, 'name')
    if not account:
        raise RuntimeError('Bootstrap the managed browser account first')
    checkout = Path(frappe.get_app_path('appointment', '..')).resolve()
    revision = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=checkout).decode().strip()
    changes = subprocess.check_output(['git', 'diff', 'HEAD', '--', 'appointment', 'frontend/src', 'frontend/index.html'], cwd=checkout)
    untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '--', 'appointment', 'frontend/src'], cwd=checkout).decode().splitlines()
    source_hash = hashlib.sha256(changes + b''.join((checkout / path).read_bytes() for path in sorted(untracked))).hexdigest()[:12]
    suite_hash = hashlib.sha256(b''.join((checkout / path).read_bytes() for path in
        (f'qa/{suite}.spec.mjs', f'qa/{suite}.config.mjs', 'appointment/tests/content_browser_suite.py'))).hexdigest()[:12]
    request = {'schema_version':'browser-qa-run/v1', 'app':'appointment', 'suite':suite,
        'target':{'site':SITE, 'base_url':'http://127.0.0.11:34340', 'environment':'development'},
        'scenarios':[], 'mode':'deterministic', 'cleanup_policy':'always', 'artifact_policy':'retain',
        'capture':{'screenshots':'on', 'trace':'on', 'video':'off'},
        'browser_account':account, 'timeout_seconds':360, 'request_source':'bench',
        'update_baseline':bool(int(update_baseline)), 'source_version':f'{revision}+source-{source_hash}+qa-{suite_hash}'}
    return enqueue_browser_qa_request(request)

def diagnose_workers():
    from frappe.utils import get_bench_path
    from frappe.utils.background_jobs import get_queue
    from rq import Worker
    queue = get_queue('default')
    workers = Worker.all(connection=queue.connection)
    return {'bench':get_bench_path(), 'queue':queue.name,
        'workers':[{'name':w.name, 'queues':[q.name for q in w.queues]} for w in workers]}

def diagnose_public_host():
    from appointment.public_experience.resolver import _platform_hosts
    return {'platform_hosts': sorted(_platform_hosts())}

def smoke_status(name):
    doc = frappe.get_doc('Browser QA Run', name)
    return {key:doc.get(key) for key in ('name','status','lifecycle_phase','outcome','failure_category','failure_reason','scenario_summary_json','baseline_changed_count')}

def baseline_status(name):
    return json.loads(frappe.get_doc('Browser QA Run', name).baseline_json or '{}')

def export_smoke(name):
    import shutil
    if frappe.local.site != SITE:
        raise RuntimeError('Evidence export requires the isolated content site')
    doc = frappe.get_doc('Browser QA Run', name)
    if doc.suite_id != 'content-runtime' or doc.status != 'Passed':
        raise RuntimeError('Only passing runtime-smoke evidence can be exported')
    destination = Path(frappe.get_app_path('appointment', '..')).resolve() / 'qa' / 'evidence' / 'content-runtime'
    destination.mkdir(parents=True, exist_ok=True)
    expected = {'react-desktop.png', 'react-mobile.png', 'desk-desktop.png', 'desk-mobile.png'}
    inventory = []
    for artifact in json.loads(doc.artifact_files_json or '[]'):
        source = Path(artifact.get('path', '')).resolve()
        root = Path('/tmp/agent_browser_qa') / name
        if artifact.get('kind') != 'screenshot' or source.name not in expected:
            continue
        if root not in source.parents:
            raise RuntimeError('Artifact is outside the exact managed run')
        target = destination / source.name
        shutil.copyfile(source, target)
        inventory.append({'file':source.name, 'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    if len(inventory) != len(expected):
        raise RuntimeError('Managed smoke screenshot inventory is incomplete')
    result = {'run':name, 'status':doc.status, 'outcome':doc.outcome,
        'scenario_summary':json.loads(doc.scenario_summary_json or '{}'),
        'baseline_changed_count':doc.baseline_changed_count, 'source_version':doc.source_version,
        'roles':sorted(frappe.get_roles(USER)), 'artifacts':inventory,
        'scope':'Runtime smoke only. Public content acceptance is pending.'}
    (destination / 'validation.json').write_text(json.dumps(result, indent=2)+'\n')
    return result

def export_website(name):
    import shutil
    if frappe.local.site != SITE:
        raise RuntimeError('Evidence export requires the isolated content site')
    doc = frappe.get_doc('Browser QA Run', name)
    if doc.suite_id != 'website-setup' or doc.status != 'Passed' or doc.baseline_changed_count:
        raise RuntimeError('Only strict passing website journey evidence can be exported')
    destination = Path(frappe.get_app_path('appointment', '..')).resolve() / 'qa/evidence/website-setup'
    destination.mkdir(parents=True, exist_ok=True)
    inventory = []
    for artifact in json.loads(doc.artifact_files_json or '[]'):
        source = Path(artifact.get('path', '')).resolve()
        if artifact.get('kind') != 'screenshot' or not source.name.startswith('website-'):
            continue
        if (Path('/tmp/agent_browser_qa') / name) not in source.parents:
            raise RuntimeError('Screenshot is outside the exact managed run')
        target = destination / source.name
        shutil.copyfile(source, target)
        inventory.append({'file': source.name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    if len(inventory) != 13:
        raise RuntimeError('Website journey screenshot inventory is incomplete')
    result = {'run': name, 'status': doc.status, 'source_version': doc.source_version,
        'scenario_summary': json.loads(doc.scenario_summary_json or '{}'),
        'baseline_changed_count': doc.baseline_changed_count,
        'cleanup': json.loads(doc.cleanup_json or '{}'), 'audit': json.loads(doc.audit_json or '{}'),
        'roles': sorted(frappe.get_roles(USER)), 'artifacts': inventory,
        'scope': 'One normal organization owner and the Tena template only. Full Phase 4/5 and Phases 6-10 are not accepted.'}
    (destination / 'validation.json').write_text(json.dumps(result, indent=2)+'\n')
    return {'run': name, 'screenshots': len(inventory), 'destination': str(destination), 'audit': result['audit']}
