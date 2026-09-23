"""Analytics smoke and isolation checks against the local rich demo fixture."""

import frappe
from appointment.scheduler import analytics
from appointment.tests import rich_demo


def verify():
    rich_demo.require_target()
    state = rich_demo.load_state()
    bloom = state['businesses']['bloom']['organization']
    clinic = state['businesses']['tena']['organization']
    result = {}
    try:
        for user in ('bloom.owner@example.test', 'bloom.manager@example.test',
                     'bloom.provider1@example.test', 'bloom.reception@example.test',
                     'multi.manager@example.test'):
            frappe.set_user(user)
            report = analytics.overview(bloom, 30)
            assert report['current']['total'] > 0
            assert len(report['current']['trend']) == 30
            assert analytics.overview(bloom, 7)['current']['total'] > 0
            long_report = analytics.overview(bloom, 90)
            assert len(long_report['current']['trend']) == 90
            assert long_report['current']['total'] > report['current']['total']
            assert report['current']['repeat_customers'] > 0
            assert report['today_confirmed'] <= report['next_seven_days']
            assert report['business_name'] == 'Bole Bloom Hair Studio'
            result[user] = report['current']['total']
            if user in ('bloom.owner@example.test', 'bloom.manager@example.test'):
                assert report['current']['catalog_value'] > 0
                assert 'recorded_payments' in report['current']
            else:
                assert 'catalog_value' not in report['current']
                assert 'recorded_payments' not in report['current']
            if user == 'multi.manager@example.test':
                clinic_report = analytics.overview(clinic, 30)
                assert clinic_report['current']['total'] > 0
                assert clinic_report['current']['catalog_value'] > 0
            else:
                try:
                    analytics.overview(clinic, 30)
                except frappe.PermissionError:
                    pass
                else:
                    raise AssertionError('Cross-business analytics leaked')
        assert result['bloom.owner@example.test'] > result['bloom.provider1@example.test'] > 0
        assert result['bloom.owner@example.test'] > result['bloom.reception@example.test'] > 0
        frappe.set_user('Guest')
        try:
            analytics.overview(bloom, 30)
        except frappe.PermissionError:
            pass
        else:
            raise AssertionError('Guest analytics leaked')
        frappe.set_user('bloom.owner@example.test')
        try:
            analytics.overview(bloom, 365)
        except frappe.ValidationError:
            pass
        else:
            raise AssertionError('Invalid analytics period accepted')
    finally:
        frappe.set_user('Administrator')
    return {'passed': True, 'counts': result}
