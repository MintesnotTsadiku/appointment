"""Password-entry browser checks through Agent Plane's protected login planner.

Only local synthetic accounts from the private demo manifest are allowed.
Credentials go directly to encrypted Browser Account fields, never action JSON.
"""
import json

import frappe

from appointment.tests.acceptance_demo import demo_path, require_target

BASE = 'http://127.0.0.20:25310'
LANDINGS = {'newowner': '/onboarding', 'owner': '/home', 'provider': '/calendar', 'reception': '/reception', 'other': '/home', 'multi': '/workspaces', 'unassigned': '/no-access', 'setup': '/onboarding'}


def password_journey(persona):
    require_target()
    if persona not in LANDINGS:
        raise ValueError('Unknown acceptance persona')
    from agent_plane.managed_browser import service
    frappe.set_user('Administrator')
    credentials = json.loads(demo_path().read_text())['credentials']
    email = f'demo.{persona}@example.test'
    if persona == 'setup':
        from appointment.scheduler.registration import signup
        email = f"acceptance-{frappe.generate_hash(length=10)}@example.test"
        item = {'password': frappe.generate_hash(length=32)}
        signup(email, 'Acceptance Owner', item['password'])
    else:
        item = next(c for c in credentials if c['email'] == email)
    account = frappe.get_doc({
        'doctype': 'Browser Account', 'account_label': f'Appointment acceptance password {persona}',
        'owner_user': email, 'status': 'Active', 'base_domains_json': json.dumps(['127.0.0.20']),
        'allow_stored_login_credentials': 1, 'credential_username': email,
        'credential_password': item['password'],
    }).insert(ignore_permissions=True)
    plan = [
        {'action': 'open_url', 'url': BASE+'/login'},
        {'action': 'fill_username', 'selector': '#email'},
        {'action': 'fill_password', 'selector': '#password'},
        {'action': 'click', 'selector': 'button[type="submit"]'},
        {'action': 'wait_for_url_contains', 'value': LANDINGS[persona]},
    ]
    if persona == 'setup':
        plan.extend([
            {'action': 'fill', 'selector': '#business_name', 'value': 'Acceptance Garden Studio'},
            {'action': 'fill', 'selector': '#location_name', 'value': 'Garden Room'},
            {'action': 'fill', 'selector': '#service_name', 'value': 'Initial consultation'},
            {'action': 'click', 'selector': '[data-qa="onboarding-submit"]'},
            {'action': 'wait_for_url_contains', 'value': '/home', 'timeout_ms': 30000},
            {'action': 'wait_for', 'selector': '[data-qa="business-overview-heading"]', 'timeout_ms': 30000},
            {'action': 'click', 'selector': 'nav a[href="/settings"]'},
            {'action': 'click', 'selector': '[data-qa="settings-business"]'},
            {'action': 'wait_for', 'selector': '[data-qa-state="draft"]'},
            {'action': 'click', 'selector': '[data-qa="business-publish"]'},
            {'action': 'wait_for', 'selector': '[data-qa-state="published"]'},
            {'action': 'click', 'selector': '[data-qa="business-public-link"]'},
            {'action': 'wait_for_url_contains', 'value': '/schedule/org/'},
        ])
    service.save_browser_login_plan(browser_account=account.name, login_start_url=BASE+'/login', login_success_url_contains=LANDINGS[persona], login_plan=plan)
    session = service.create_or_verify_browser_account_session(browser_account=account.name, base_url=BASE)
    # Use the same certified bundled Chromium as product manifest QA.
    browser_session = frappe.get_doc('Browser Session', session['browser_session'])
    browser_session.browser_channel = 'Bundled Chromium'
    browser_session.save(ignore_permissions=True)
    frappe.db.commit()
    result = service.start_browser_stored_credential_login(browser_account=account.name, base_url=BASE, target_url=BASE+LANDINGS[persona], timeout_ms=30000)
    if persona == 'setup':
        frappe.db.rollback()
        orgs = frappe.get_all('Organization', filters={'owner_user': email}, fields=['name', 'enable_public_booking'])
        result['published_businesses'] = len([org for org in orgs if org.enable_public_booking])
        result['ok'] = result.get('ok') and result['published_businesses'] == 1
        result['cleanup'] = cleanup_setup(email, account.name)
    else:
        clear_browser_credentials(account.name)
    result['persona'] = persona
    result['expected_landing'] = LANDINGS[persona]
    return result


def cleanup_setup(email, account_name):
    """Remove only records owned by this run's newly generated identity."""
    if not email.startswith('acceptance-') or not email.endswith('@example.test'):
        raise ValueError('Not a disposable acceptance identity')
    from appointment.tests.owned_booking_fixtures import cleanup
    frappe.set_user('Administrator')
    orgs = frappe.get_all('Organization', filters={'owner_user': email}, pluck='name')
    created = [['User', email]] + [['Organization', org] for org in orgs]
    created += [['Provider', name] for name in frappe.get_all('Provider', filters={'user': email}, pluck='name')]
    for org in orgs:
        services = frappe.get_all('Service', filters={'organization': org}, pluck='name')
        created += [['Location', name] for name in frappe.get_all('Location', filters={'organization': org}, pluck='name')]
        created += [['Service', name] for name in services]
        created += [['EventType', name] for name in frappe.get_all('EventType', filters={'service': ['in', services]}, pluck='name')]
    clear_browser_credentials(account_name, owner_user='Administrator')
    return cleanup({'created': created, 'businesses': [{'org': org} for org in orgs]})


def clear_browser_credentials(account_name, owner_user=None):
    """Retain the browser audit trail while removing its stored test password."""
    account = frappe.get_doc('Browser Account', account_name)
    if not account.account_label.startswith('Appointment acceptance password '):
        raise ValueError('Not an Appointment acceptance Browser Account')
    if owner_user:
        account.owner_user = owner_user
    account.allow_stored_login_credentials = 0
    account.credential_password = ''
    account.save(ignore_permissions=True)
    frappe.db.commit()


def clear_all_browser_credentials():
    """Repair accounts created by earlier isolated acceptance attempts."""
    require_target()
    frappe.set_user('Administrator')
    names = frappe.get_all('Browser Account', filters={'account_label': ['like', 'Appointment acceptance password %']}, pluck='name')
    for name in names:
        clear_browser_credentials(name)
    return {'cleared': len(names)}


def verify_browser_credentials_removed():
    require_target()
    names = frappe.get_all('Browser Account', filters={'account_label': ['like', 'Appointment acceptance password %']}, pluck='name')
    retained = []
    for name in names:
        account = frappe.get_doc('Browser Account', name)
        try:
            password = account.get_password('credential_password')
        except Exception:
            password = None
        if account.allow_stored_login_credentials or password:
            retained.append(name)
    if retained:
        raise AssertionError(f'Acceptance Browser Accounts still store passwords: {retained}')
    return {'checked': len(names), 'stored_passwords': 0}
