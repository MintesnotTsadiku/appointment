"""Managed appearance QA using existing demo users and exact preference cleanup."""
import json
import frappe
from appointment.demo import showcase
from appointment.scheduler.appearance import KEY
from appointment.tests.homepage_demo_fixture import HomepageDemoFixture


class InternalAppearanceFixture(HomepageDemoFixture):
    def prepare(self, *, request):
        result = super().prepare(request=request)
        users = [row['email'] for row in showcase.load_state()['personas']]
        result['fixture_identity']['appearance'] = {user: frappe.defaults.get_user_default(KEY, user=user) for user in users}
        result['fixture_identity']['workspaces'] = {user: frappe.defaults.get_user_default('appointment_workspace', user=user) for user in users}
        result['fixture_identity']['accounts'] = {user: frappe.db.get_value('User', user, ['first_name', 'last_name', 'mobile_no'], as_dict=True) for user in users}
        return result

    def provide_execution_context(self, *, fixture_identity, request):
        result = super().provide_execution_context(fixture_identity=fixture_identity, request=request)
        state = showcase.load_state()
        provider = next(row for row in state['personas'] if row['email'] == 'bloom.provider1@example.test')
        multi = next(row for row in state['personas'] if row['email'] == 'multi.manager@example.test')
        result['environment']['INTERNAL_APPEARANCE_MULTI'] = json.dumps(multi)
        result['environment']['INTERNAL_APPEARANCE_PROVIDER'] = json.dumps(provider)
        result['environment']['SHOWCASE_QA_WORLD'] = json.dumps(fixture_identity['world'])
        return result

    def cleanup(self, *, fixture_identity, request):
        for user, value in fixture_identity.get('accounts', {}).items():
            doc = frappe.get_doc('User', user)
            doc.update(value)
            doc.save(ignore_permissions=True)
        for user, value in fixture_identity['appearance'].items():
            frappe.defaults.clear_default(key=KEY, parent=user)
            if value is not None:
                frappe.defaults.set_user_default(KEY, value, user=user)
            frappe.clear_cache(user=user)
        for user, value in fixture_identity['workspaces'].items():
            frappe.defaults.clear_default(key='appointment_workspace', parent=user)
            if value is not None:
                frappe.defaults.set_user_default('appointment_workspace', value, user=user)
        result = super().cleanup(fixture_identity=fixture_identity, request=request)
        if self._fingerprint(fixture_identity['world']) != fixture_identity['before']:
            raise RuntimeError('Public releases changed during internal appearance QA')
        result['message'] = 'Exact account, appearance, navigation and workspace preferences restored; public releases unchanged.'
        return result


adapter = InternalAppearanceFixture()


def run_status(name):
    from appointment.tests.content_browser_bootstrap import SITE
    if frappe.local.site != SITE:
        raise RuntimeError('Read only the isolated appearance run')
    doc = frappe.get_doc('Browser QA Run', name)
    if doc.suite_id not in ('internal-appearance', 'codex-shell'):
        raise RuntimeError('Expected an internal appearance run')
    return dict(status=doc.status, cleanup=json.loads(doc.cleanup_json or '{}'),
                audit=json.loads(doc.audit_json or '{}'),
                session=frappe.db.get_value('Browser Session', doc.browser_session,
                    ['status', 'lock_status', 'locked_by_browser_qa_run'], as_dict=True))


def export_review_evidence(name):
    """Export complete behavior evidence while retaining the visual failure status."""
    import hashlib
    import shutil
    from pathlib import Path

    result = run_status(name)
    doc = frappe.get_doc('Browser QA Run', name)
    summary = json.loads(doc.scenario_summary_json or '{}')
    if (doc.outcome not in ('passed', 'baseline_drift') or summary.get('passed') != 1
            or summary.get('failed') or summary.get('flaky')
            or not result['cleanup'].get('ok') or not result['audit'].get('ok')):
        raise RuntimeError('Export requires all behavior checks and exact cleanup to pass')
    shell = doc.suite_id == 'codex-shell'
    prefix, count, folder = ('codex-', 9, 'codex-shell') if shell else ('internal-', 19, 'internal-appearance')
    root = Path('/tmp/agent_browser_qa') / name
    sources = [Path(row['path']).resolve() for row in json.loads(doc.artifact_files_json or '[]')
               if row.get('kind') == 'screenshot' and Path(row.get('path', '')).name.startswith(prefix)]
    if (len(sources) != count or len({path.name for path in sources}) != count
            or any(root not in path.parents or path.suffix != '.png' for path in sources)):
        raise RuntimeError('Incomplete authored screenshot inventory')
    destination = Path(frappe.get_app_path('appointment', '..')).resolve() / 'qa/evidence' / folder
    destination.mkdir(parents=True, exist_ok=True)
    inventory = []
    for source in sources:
        target = destination / source.name
        shutil.copyfile(source, target)
        inventory.append(dict(file=source.name, sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    result.update(run=name, site=frappe.local.site, outcome=doc.outcome,
                  source_version=doc.source_version, scenario_summary=summary,
                  baseline_changed_count=doc.baseline_changed_count,
                  strict_visual_pass=doc.status == 'Passed' and doc.baseline_changed_count == 0,
                  artifacts=inventory)
    (destination / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
    return dict(run=name, screenshots=len(sources), status=doc.status,
                strict_visual_pass=result['strict_visual_pass'], destination=str(destination))
