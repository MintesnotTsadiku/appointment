"""Non-destructive preservation guard for the isolated implementation runtime."""
import hashlib
import json
from pathlib import Path

import frappe

from appointment.tests.owned_booking_fixtures import require_target

DOCTYPES = ('Organization', 'Provider', 'Service', 'Location', 'Appointment', 'Business Membership', 'Booking Event')


def _digest(doc):
    def clean(value):
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items() if k not in ('modified', 'modified_by', '__last_sync_on')}
        if isinstance(value, list):
            return [clean(v) for v in value]
        return value
    return hashlib.sha256(json.dumps(clean(doc.as_dict()), sort_keys=True, default=str).encode()).hexdigest()


def preservation(capture=False):
    require_target()
    frappe.set_user('Administrator')
    path = Path(frappe.get_site_path('private', 'acceptance-preservation.json'))
    if capture:
        if path.exists():
            frappe.throw('Preservation baseline already exists; do not overwrite it.')
        baseline = {dt: {name: _digest(frappe.get_doc(dt, name)) for name in frappe.get_all(dt, pluck='name')} for dt in DOCTYPES}
        path.write_text(json.dumps(baseline))
        path.chmod(0o600)
        return {'captured': True, 'counts': {dt: len(rows) for dt, rows in baseline.items()}}
    baseline = json.loads(path.read_text())
    changes = []
    for dt, rows in baseline.items():
        for name, digest in rows.items():
            if not frappe.db.exists(dt, name) or _digest(frappe.get_doc(dt, name)) != digest:
                changes.append({'doctype': dt, 'name': name})
    if changes:
        raise AssertionError(f'Pre-existing records changed: {changes}')
    return {'preserved': True, 'counts': {dt: len(rows) for dt, rows in baseline.items()}, 'changed_or_missing': 0}


def cleanup_failed_workspace(name):
    require_target()
    baseline = json.loads(Path(frappe.get_site_path('private', 'acceptance-preservation.json')).read_text())
    if name in baseline['Organization'] or not name.startswith('OWN-'):
        raise ValueError('Only a new, exact failed fixture workspace may be removed')
    from appointment.tests.owned_booking_fixtures import cleanup
    org = frappe.get_doc('Organization', name)
    if frappe.db.exists('User', org.owner_user):
        raise ValueError('Expected an already removed fixture user')
    services = frappe.get_all('Service', filters={'organization': name}, pluck='name')
    events = frappe.get_all('EventType', filters={'service': ['in', services]}, fields=['name', 'provider'])
    providers = sorted(set(row.provider for row in events))
    created = [['Organization', name]] + [['Provider', p] for p in providers]
    created += [['Location', n] for n in frappe.get_all('Location', filters={'organization': name}, pluck='name')]
    created += [['Service', n] for n in services] + [['EventType', e.name] for e in events]
    return cleanup({'businesses': [{'org': name}], 'created': created})
