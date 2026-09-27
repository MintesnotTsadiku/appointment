"""Validate every journal-owned fictional provider against installed analytics contracts."""
import json
import frappe
from appointment.demo import showcase, analytics_world
from appointment.scheduler.analytics import overview


def run():
    showcase.require_target()
    state = showcase.load_state()
    assert state['analytics_world']['version'] == analytics_world.VERSION
    for name in state['appointments']:
        events=json.loads(frappe.db.get_value('Appointment',name,'workflow_events') or '[]')
        if events and all(event.get('synthetic_demo') for event in events):
            creation=next(event['timestamp'] for event in events if event['type']=='create')
            assert all(event['timestamp']>=creation for event in events), name
            assert len({event['idempotency_key'] for event in events})==len(events)
    reports = []
    previous = frappe.session.user
    try:
        for key, business in state['businesses'].items():
            frappe.set_user(business['owner'])
            for provider in business['providers']:
                report = overview(business['organization'], 90, frappe.as_json({'providers':[provider]}))
                metrics = report['metrics']
                for metric in ('total','agreed_value','lead_time','actual_duration','arrival_punctuality','sources','reschedules'):
                    assert metrics[metric]['value'] is not None, (key, provider, metric)
                mature=overview(business['organization'],90,frappe.as_json({'providers':[provider], 'start':str(frappe.utils.getdate()-__import__('datetime').timedelta(days=200)), 'end':frappe.utils.nowdate()}))
                assert mature['metrics']['retention_90']['value'] is not None
                assert mature['metrics']['cohorts']['value']==sum(row['count'] for row in mature['metrics']['cohorts']['rows'])
                assert metrics['total']['value'] > 0
                assert metrics['agreed_value']['value'] > 0
                assert metrics['actual_duration']['known'] > 0
                assert metrics['publishing_errors']['value'] is None
                assert metrics['utilization']['coverage'] == 'partial'
                assert all(row['provider'] == frappe.db.get_value('Provider', provider, 'display_name') for row in report['workspace_schedule'])
                reports.append({'business':key,'provider':provider,'bookings':metrics['total']['value'],
                                'agreed_value_known':metrics['agreed_value']['known'],
                                'timed_visits':metrics['actual_duration']['known']})
        return {'passed':True,'providers':len(reports),'reports':reports}
    finally:
        frappe.set_user(previous)


def preserve_user_edit():
    from unittest.mock import patch
    showcase.require_target()
    state=showcase.load_state()
    original=frappe.session.user
    frappe.db.savepoint('demo_edit_check')
    try:
        name=next(name for name in state['appointments'] if frappe.db.get_value('Appointment',name,'status')=='Completed')
        doc=frappe.get_doc('Appointment',name)
        frappe.set_user(next(business['owner'] for business in state['businesses'].values() if business['organization']==doc.organization))
        doc.amount_paid=123.45
        doc.save(ignore_permissions=True)
        with patch.object(analytics_world,'VERSION',analytics_world.VERSION+1):
            analytics_world.configure(state)
        assert float(frappe.db.get_value('Appointment',name,'amount_paid'))==123.45
        return dict(passed=True,user_recorded_amount_preserved=True,rollback_only=True)
    finally:
        frappe.db.rollback(save_point='demo_edit_check')
        frappe.set_user(original)
