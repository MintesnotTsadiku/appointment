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
ALLOWED_SITES = (SITE, 'meet-beta-content-fresh-a.localhost', 'meet-beta-content-fresh-b.localhost', 'meet-beta-content-fresh-c.localhost', 'meet-beta-content-restore.localhost')
RUNTIME = Path('/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4')
USER = 'content-browser-owner@example.test'
LABEL = 'Appointment content development owner'

def account_label(site):
    return LABEL if site == SITE else f'{LABEL} — {site}'

def run():
    site = frappe.local.site
    if site not in ALLOWED_SITES or not frappe.conf.get('worktree_development'):
        raise RuntimeError('This bootstrap is restricted to the isolated content site')
    frappe.set_user('Administrator')
    private = RUNTIME / ('browser-credentials.json' if site == SITE else f'{site}-browser-credentials.json')
    if private.exists():
        credentials = json.loads(private.read_text())
        if credentials.get('username') != USER or credentials.get('site') != site:
            raise RuntimeError('Private bootstrap identity does not match')
    else:
        credentials = {'site': site, 'username': USER, 'password': secrets.token_urlsafe(32)}
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
    label = account_label(site)
    name = frappe.db.get_value('Browser Account', {'account_label':label}, 'name')
    if not name:
        from agent_plane.managed_browser.service import create_browser_profile
        name = create_browser_profile(account_label=label, owner_user=USER,
            base_domains=[site, '127.0.0.11'], runtime_provider_key='')['browser_account']
    account = frappe.get_doc('Browser Account', name)
    if account.owner_user != USER:
        raise RuntimeError('Existing browser profile belongs to another identity')
    account.update({'status':'Active', 'session_health':'Healthy', 'allow_stored_login_credentials':1,
        'credential_username':USER, 'credential_password':credentials['password'],
        'login_strategy':'Direct HTTP Credential Login', 'login_start_url':'/login',
        'login_success_url_contains':'/onboarding', 'base_domains_json':json.dumps([site, '127.0.0.11'])})
    account.save(ignore_permissions=True)
    name_session = frappe.db.get_value('Browser Session', {'browser_account':name, 'session_label':'primary'}, 'name')
    session = frappe.get_doc('Browser Session', name_session)
    if session.lock_status == 'Locked' or session.locked_by_run or session.locked_by_browser_qa_run:
        raise RuntimeError('Existing browser session is in use')
    session.update({'status':'Active', 'lock_status':'Free', 'capture_redaction_mode':'Auth Challenge Screens'})
    session.save(ignore_permissions=True)
    settings = frappe.get_single('Runtime Settings')
    domains = set(str(settings.browser_allowed_domains or '').replace('\n', ',').split(',')) - {''}
    domains.update([site, '127.0.0.11'])
    settings.browser_allowed_domains = ','.join(sorted(domains))
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    return {'site':site, 'browser_account':name, 'browser_session':name_session,
        'username':USER, 'roles':sorted(roles), 'credentials_file':str(private)}

def enqueue_smoke(update_baseline=0, suite='content-runtime', scenarios=None):
    site = frappe.local.site
    if site not in ALLOWED_SITES or not frappe.conf.get('worktree_development'):
        raise RuntimeError('This smoke test is restricted to the isolated content site')
    from frappe.utils import get_bench_path
    if Path(get_bench_path()) != RUNTIME / 'bench':
        raise RuntimeError('Export FRAPPE_BENCH_ROOT for the isolated queue namespace')
    from agent_plane.qa_workflows.browser_qa_service import enqueue_browser_qa_request
    if suite not in ('content-runtime', 'website-setup', 'content-templates', 'content-accessibility', 'individual-owner', 'content-recovery', 'content-production'):
        raise RuntimeError('Unsupported development suite')
    account = frappe.db.get_value('Browser Account', {'account_label':account_label(site)}, 'name')
    if not account:
        raise RuntimeError('Bootstrap the managed browser account first')
    checkout = Path(frappe.get_app_path('appointment', '..')).resolve()
    revision = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=checkout).decode().strip()
    changes = subprocess.check_output(['git', 'diff', 'HEAD', '--', 'appointment', 'frontend'], cwd=checkout)
    untracked = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '--', 'appointment', 'frontend'], cwd=checkout).decode().splitlines()
    source_hash = hashlib.sha256(changes + b''.join((checkout / path).read_bytes() for path in sorted(untracked))).hexdigest()[:12]
    suite_hash = hashlib.sha256(b''.join((checkout / path).read_bytes() for path in
        (f'qa/{suite}.spec.mjs', f'qa/{suite}.config.mjs', 'qa/owner-validation.mjs', 'appointment/tests/content_browser_suite.py'))).hexdigest()[:12]
    request = {'schema_version':'browser-qa-run/v1', 'app':'appointment', 'suite':suite,
        'target':{'site':site, 'base_url':'http://127.0.0.11:34340', 'environment':'development'},
        'scenarios':scenarios or [], 'mode':'deterministic', 'cleanup_policy':'always', 'artifact_policy':'retain',
        'capture':{'screenshots':'on', 'trace':'on', 'video':'off'},
        'browser_account':account, 'timeout_seconds':1800 if suite in ('content-templates', 'content-accessibility') else 720, 'request_source':'bench',
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
    if frappe.local.site not in ALLOWED_SITES:
        raise RuntimeError('Evidence export requires the isolated content site')
    doc = frappe.get_doc('Browser QA Run', name)
    if doc.suite_id != 'website-setup' or doc.status != 'Passed' or doc.baseline_changed_count:
        raise RuntimeError('Only strict passing website journey evidence can be exported')
    folder = 'website-setup' if frappe.local.site == SITE else f'fresh-site/{frappe.local.site}'
    destination = Path(frappe.get_app_path('appointment', '..')).resolve() / 'qa/evidence' / folder
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
    if len(inventory) != 39:
        raise RuntimeError('Website journey screenshot inventory is incomplete')
    proof_keys = {
        "website-staff-validation.json": {"managed_browser_account", "managed_browser_session", "roles", "user", "scope", "cross_business_workspace_count", "publication_denied", "account_created_by", "role_assigned_by"},
        "website-isolation-validation.json": {"separate_managed_owner_profile", "business_created_by", "denied_cross_business_requests", "denied_entitlement_requests", "limits_enforced", "immutable_releases_preserved", "entitlement_changes_by"},
    }
    for filename, keys in proof_keys.items():
        paths = list((Path('/tmp/agent_browser_qa') / name / 'attempt-1/playwright').rglob(filename))
        if len(paths) != 1:
            raise RuntimeError('The managed staff or isolation proof is missing')
        proof = json.loads(paths[0].read_text())
        if set(proof) != keys:
            raise RuntimeError('The public proof contains unexpected fields')
        (destination / filename).write_text(json.dumps(proof, indent=2) + '\n')
    result = {'run': name, 'site': frappe.local.site, 'status': doc.status, 'source_version': doc.source_version,
        'scenario_summary': json.loads(doc.scenario_summary_json or '{}'),
        'baseline_changed_count': doc.baseline_changed_count,
        'cleanup': json.loads(doc.cleanup_json or '{}'), 'audit': json.loads(doc.audit_json or '{}'),
        'roles': sorted(frappe.get_roles(USER)), 'artifacts': inventory,
        'scope': 'Normal owner setup and workbook import, managed receptionist scope, second-business isolation, expired entitlements and limits, private preview/publish/rollback, local newsletter delivery and suppression. Template and recovery journeys are recorded separately.'}
    (destination / 'validation.json').write_text(json.dumps(result, indent=2)+'\n')
    return {'run': name, 'screenshots': len(inventory), 'destination': str(destination), 'audit': result['audit']}


def export_templates(name):
    import shutil

    if frappe.local.site != SITE:
        raise RuntimeError('Template evidence requires the isolated showcase site')
    doc = frappe.get_doc('Browser QA Run', name)
    summary = json.loads(doc.scenario_summary_json or '{}')
    if (doc.suite_id != 'content-templates' or doc.status != 'Passed'
            or doc.baseline_changed_count or summary.get('passed') != 20
            or summary.get('failed') or summary.get('flaky')):
        raise RuntimeError('Only the complete strict twenty-scenario matrix can be exported')
    destination = Path(frappe.get_app_path('appointment', '..')).resolve() / 'qa/evidence/content-templates'
    artifacts = []
    root = (Path('/tmp/agent_browser_qa') / name).resolve()
    for artifact in json.loads(doc.artifact_files_json or '[]'):
        if artifact.get('kind') != 'screenshot':
            continue
        source = Path(artifact.get('path', '')).resolve()
        if root not in source.parents or source.suffix != '.png':
            raise RuntimeError('Screenshot is outside the exact managed run')
        artifacts.append(source)
    if len(artifacts) != 280 or len({(path.parent.name, path.name) for path in artifacts}) != 280:
        raise RuntimeError('Template capture inventory is incomplete or ambiguous')
    inventory = []
    for source in artifacts:
        target = destination / source.parent.name / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        inventory.append({'file': str(target.relative_to(destination)),
                          'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    result = {'run': name, 'site': SITE, 'status': doc.status, 'outcome': doc.outcome,
              'scenario_summary': summary, 'source_version': doc.source_version,
              'baseline_changed_count': 0, 'artifacts': inventory,
              'scope': 'Seeded template rendering; empty and unavailable states use controlled API responses. Fresh owner acceptance is recorded separately.'}
    (destination / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
    return {'run': name, 'screenshots': len(inventory), 'destination': str(destination)}


def export_accessibility(name):
    """Export public-only gate reports; keep managed authentication artifacts private."""
    import shutil

    if frappe.local.site != SITE:
        raise RuntimeError('Public gate evidence requires the isolated showcase site')
    doc = frappe.get_doc('Browser QA Run', name)
    summary = json.loads(doc.scenario_summary_json or '{}')
    if doc.suite_id != 'content-accessibility' or doc.status != 'Passed' or summary.get('passed') != 10 or summary.get('failed') or summary.get('flaky'):
        raise RuntimeError('All ten public gate scenarios must pass before export')
    root = (Path('/tmp/agent_browser_qa') / name).resolve()
    destination = Path(frappe.get_app_path('appointment', '..')).resolve() / 'qa/evidence/content-accessibility'
    reports = list(root.rglob('*-gates.json'))
    if len(reports) != 10:
        raise RuntimeError('Public gate report inventory is incomplete')
    inventory = []
    for source in reports:
        if source.is_symlink():
            raise RuntimeError('Refusing a linked gate artifact')
        report = json.loads(source.read_text())
        if len(report.get('reports', [])) != 7 or any(row.get('violations') for row in report['reports']):
            raise RuntimeError('Public gate report contains missing surfaces or violations')
        destination.mkdir(parents=True, exist_ok=True)
        target = destination / source.name
        target.write_text(json.dumps(report, indent=2) + '\n')
        inventory.append({'file': target.name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    for artifact in json.loads(doc.artifact_files_json or '[]'):
        if artifact.get('kind') == 'screenshot':
            source = Path(artifact['path']).resolve()
            if root not in source.parents or source.suffix != '.png':
                raise RuntimeError('Screenshot is outside the managed public gate run')
            target = destination / source.parent.name / source.name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            inventory.append({'file': str(target.relative_to(destination)), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    result = {'run': name, 'source_version': doc.source_version, 'scenario_summary': summary,
              'artifacts': inventory, 'engine': 'axe-core 4.11.0',
              'scope': 'Seventy public surfaces: automated WCAG A/AA violations and local development navigation budget. Incomplete checks require manual review; this does not certify full accessibility or production performance.'}
    (destination / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
    return {'run': name, 'public_reports': len(reports), 'destination': str(destination)}


def export_individual(name):
    folder = "fresh-site/independent-owner" if frappe.local.site != "meet-beta-content-fresh-c.localhost" else "fresh-site/meet-beta-content-fresh-c.localhost/independent-owner"
    return _export_exact_journey(name, "individual-owner", "solo-", 14,
        folder, "Independent owner: scheduling before Website setup, explicit publication, guest booking, article and gallery publication, saved preview, and rollback.")


def export_production(name):
    import shutil

    if frappe.local.site != SITE:
        raise RuntimeError("Production public qualification requires the isolated showcase site")
    doc = frappe.get_doc("Browser QA Run", name)
    if doc.suite_id != "content-production" or doc.status != "Passed" or doc.baseline_changed_count:
        raise RuntimeError("Only strict passing production gates can be exported")
    root = Path("/tmp/agent_browser_qa") / name / "attempt-1/playwright"
    destination = Path(frappe.get_app_path("appointment", "..")).resolve() / "qa/evidence/content-production"
    destination.mkdir(parents=True, exist_ok=True)
    inventory = []
    for filename in ("production-public-security.png", "production-gates.json"):
        matches = list(root.rglob(filename))
        if len(matches) != 1 or matches[0].is_symlink():
            raise RuntimeError("The production gate artifact is missing or linked")
        target = destination / filename
        shutil.copyfile(matches[0], target)
        inventory.append({"file": filename, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
    report = json.loads((destination / "production-gates.json").read_text())
    if len(report.get("production_entries", [])) != 5 or report.get("cached_private_paths") or report.get("page_errors"):
        raise RuntimeError("Production public qualification is incomplete")
    result = {"run": name, "source_version": doc.source_version,
              "baseline_changed_count": doc.baseline_changed_count,
              "scenario_summary": json.loads(doc.scenario_summary_json or "{}"),
              "audit": json.loads(doc.audit_json or "{}"), "artifacts": inventory}
    (destination / "validation.json").write_text(json.dumps(result, indent=2) + "\n")
    return {"run": name, "destination": str(destination)}


def export_recovery(name, stage="candidate"):
    if stage not in {"candidate", "rollback", "upgrade"} or frappe.local.site != "meet-beta-content-restore.localhost":
        raise RuntimeError("Choose an isolated recovery drill stage")
    return _export_exact_journey(name, "content-recovery", "recovered-", 16,
        "content-recovery/" + stage, "Restored public routes, actual media delivery, and retained guest unsubscribe/suppression state.")


def _export_exact_journey(name, suite, prefix, count, folder, scope):
    import shutil

    if frappe.local.site not in ALLOWED_SITES:
        raise RuntimeError("Evidence export requires the isolated acceptance runtime")
    doc = frappe.get_doc("Browser QA Run", name)
    summary = json.loads(doc.scenario_summary_json or "{}")
    audit = json.loads(doc.audit_json or "{}")
    if (doc.suite_id != suite or doc.status != "Passed" or doc.baseline_changed_count
            or summary.get("failed") or summary.get("flaky") or summary.get("passed") != 1):
        raise RuntimeError("Only a complete strict passing journey can be exported")
    root = Path("/tmp/agent_browser_qa") / name
    sources = []
    for artifact in json.loads(doc.artifact_files_json or "[]"):
        source = Path(artifact.get("path", "")).resolve()
        if artifact.get("kind") != "screenshot" or not source.name.startswith(prefix):
            continue
        if root not in source.parents or source.suffix != ".png":
            raise RuntimeError("Capture is outside the exact managed run")
        sources.append(source)
    if len(sources) != count or len({source.name for source in sources}) != count:
        raise RuntimeError("The authored journey capture inventory is incomplete")
    destination = Path(frappe.get_app_path("appointment", "..")).resolve() / "qa/evidence" / folder
    destination.mkdir(parents=True, exist_ok=True)
    inventory = []
    for source in sources:
        target = destination / source.name
        shutil.copyfile(source, target)
        inventory.append({"file": source.name, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
    result = {"run": name, "site": frappe.local.site, "status": doc.status,
              "source_version": doc.source_version, "scenario_summary": summary,
              "baseline_changed_count": doc.baseline_changed_count, "audit": audit,
              "cleanup": json.loads(doc.cleanup_json or "{}"), "roles": sorted(frappe.get_roles(USER)),
              "scope": scope, "artifacts": inventory}
    (destination / "validation.json").write_text(json.dumps(result, indent=2) + "\n")
    return {"run": name, "screenshots": count, "destination": str(destination), "audit": audit}
