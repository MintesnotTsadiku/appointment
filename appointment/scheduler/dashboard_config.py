"""Versioned user preferences; workspace access is revalidated on every request."""

import hashlib
import json

import frappe
from appointment.scheduler.analytics import _authorize

FINANCIAL = {'catalog_value', 'recorded_payments', 'agreed_value', 'discounts', 'payment_records'}
WIDGETS = {'agenda','attention','upcoming','total','completed','cancelled','no_show','booked_hours','unique_customers','repeat_customers','outcomes','sources','booking_trend','services','providers','locations','no_show_rate','attendance_rate','completion_rate','cancellation_rate','pending','average_duration','duration_distribution','cancellation_reasons','new_customers','returning_customers','repeat_percentage','bookings_per_customer','missing_contacts','reschedules','confirmations','cancellations_events','reschedule_rate','confirmation_turnaround','actual_duration','service_delay','cancellation_notice','arrivals','checked_in','utilization','occupied_hours'} | FINANCIAL
MANAGER_WIDGETS = {'invitation_turnaround','content_type_status','publication_activity','withdrawal_activity','newsletter_confirmation_rate','newsletter_confirmation_time','newsletter_unsubscribed','scheduled_campaigns','catalog_quality','invitations','content_status','gallery_status','newsletter_audience','newsletter_campaigns','local_captured','newsletter_skipped','newsletter_retries','sender_readiness','website_status','payment_concentration','payments_per_customer'}
FINANCIAL |= MANAGER_WIDGETS
WIDGETS |= {'buffer_hours','occupied_heatmap','future_slots','next_slot'}
WIDGETS |= {'referrals','late_cancellation_rate','changes_per_booking','verified_recovery'}
WIDGETS |= {'lead_time','lead_time_distribution','creation_demand','start_popularity','recent_activity','capture_quality','reception_state'}
WIDGETS |= MANAGER_WIDGETS | {'visit_interval','days_since_visit','lapse_risk','second_visit_conversion','retention_30','retention_60','retention_90','cohorts','booking_concentration','customer_cancellation','customer_no_show','likely_duplicates','unmatched_customers','completed_today','today_workload','conflicts','active_providers','active_locations','walk_ins_waiting','walk_ins_assigned','walk_ins_cancelled','current_queue_wait','queue_wait','walk_in_conversion'}
for _dimension in ('service','provider','location'):
    WIDGETS |= {_dimension+'_scheduled_hours', *(_dimension+'_'+status+'_rate' for status in ('completed','cancelled','no_show')), _dimension+'_catalog_value'}
    FINANCIAL.add(_dimension+'_catalog_value')
FINANCIAL |= {'average_estimate','estimated_cancellation_loss','estimated_no_show_loss','discount_usage'}
WIDGETS |= FINANCIAL | {'customer_preferences'}
WIDGETS |= {'available_hours','unused_hours','schedule_gaps','fragmentation','buffer_share','capacity_adjusted_popularity','no_availability_days','provider_utilization','location_utilization','service_utilization','change_initiators','arrival_punctuality','service_overrun','reception_queue_wait','recovery_rate','appointment_weekday_mix'}
WIDGETS |= {'next_appointment','missing_staff_availability','customer_provider_preferences','customer_location_preferences'}
MANAGER_WIDGETS |= {'setup_completeness','pending_imports','campaign_errors','newsletter_growth','newsletter_unsubscribe_trend'}
FINANCIAL |= MANAGER_WIDGETS
WIDGETS |= MANAGER_WIDGETS
WIDGETS |= {'opening_hours','active','confirmed_today','event_coverage'}
MANAGER_WIDGETS |= {'gallery_completeness','publishing_errors','import_errors','attention_resolution'}
FINANCIAL |= MANAGER_WIDGETS | {'future_estimate','missing_payment_entries','paid_customers'}
WIDGETS |= FINANCIAL
for _dimension in ('service','provider','location'):
    WIDGETS |= {_dimension+'_average_duration',_dimension+'_actual_duration',_dimension+'_service_delay'}
MANAGER_WIDGETS.discard('attention_resolution')
FINANCIAL.discard('attention_resolution')
WIDGETS |= {'service_share','service_trend','service_repeat_usage','peak_starts','offpeak_starts'}
CHARTS = {'value','bar','line','area','donut','radial','table','heatmap'}


@frappe.whitelist(methods=['GET'])
def load(organization: str, dashboard: str = 'home'):
    workspace, _ = _authorize(organization,30)
    key = _key(organization,dashboard)
    value = frappe.defaults.get_user_default(key)
    return validate(frappe.parse_json(value),workspace) if value else None


@frappe.whitelist(methods=['POST'])
def save(organization: str, dashboard: str, config: str):
    workspace, _ = _authorize(organization,30)
    value = validate(frappe.parse_json(config),workspace)
    # Serialize preferences for one user so concurrent first saves cannot duplicate defaults.
    frappe.db.sql('select name from tabUser where name=%s for update',frappe.session.user)
    frappe.defaults.set_user_default(_key(organization,dashboard),json.dumps(value))
    return value


def validate(value,workspace):
    if not isinstance(value,dict) or value.get('version') != 1 or not isinstance(value.get('widgets'),list):
        frappe.throw('Unsupported dashboard configuration.')
    if len(value['widgets']) > len(WIDGETS):
        frappe.throw('Too many widgets.')
    widgets, seen = [],set()
    for row in value['widgets']:
        if not isinstance(row,dict):
            frappe.throw('Invalid widget.')
        key = row.get('id')
        if key not in WIDGETS or key in seen or (key in FINANCIAL and not workspace['is_manager']):
            continue
        chart = row.get('chart','value')
        supported = _charts(key)
        if chart not in supported:
            chart = supported[0]
        span=row.get('span',1)
        if span not in (1,2,3):
            frappe.throw('Invalid widget size.')
        entry=dict(id=key,chart=chart,span=span)
        local=row.get('filters')
        if local:
            from appointment.scheduler.analytics_filters import ReportFilters
            from appointment.scheduler.analytics import _report
            validated=ReportFilters(local,frappe.utils.getdate(),30)
            if any(validated.data.get(key) for key in ('providers','locations','services')):
                _report(workspace['organization'],30,validated.data)
            entry['filters']=validated.data
        widgets.append(entry)
        seen.add(key)
    preset=value.get('preset','general')
    if preset not in {'general','clinic','freelancer','consultant','hairstylist','organization','reception','all'}:
        preset='general'
    return dict(version=1,preset=preset,widgets=widgets)


@frappe.whitelist(methods=['GET'])
def navigation():
    _signed_in()
    value=frappe.parse_json(frappe.defaults.get_user_default('appointment:navigation:v1') or '{}')
    return dict(placement=value.get('placement','sidebar'),collapsed=bool(value.get('collapsed',False)))


@frappe.whitelist(methods=['POST'])
def save_navigation(placement: str, collapsed: bool = False):
    _signed_in()
    if placement not in {'top','sidebar'}:
        frappe.throw('Choose top navigation or sidebar.')
    value=dict(placement=placement,collapsed=bool(collapsed))
    frappe.db.sql('select name from tabUser where name=%s for update',frappe.session.user)
    frappe.defaults.set_user_default('appointment:navigation:v1',json.dumps(value))
    return value


def _signed_in():
    if frappe.session.user=='Guest' or not frappe.db.get_value('User',frappe.session.user,'enabled'):
        frappe.throw('Sign in to manage preferences.',frappe.PermissionError)


def _key(organization,dashboard):
    if dashboard not in {'home','insights'}:
        frappe.throw('Choose Home or Insights.')
    return 'appointment:dashboard:v1:'+dashboard+':'+hashlib.sha256(organization.encode()).hexdigest()[:24]


def _charts(key):
    if key in {'agenda','next_appointment'}:
        return ['table']
    if key=='booking_trend':
        return ['bar','line','area','table']
    if key in {'creation_demand','start_popularity','occupied_heatmap'}:
        return ['heatmap','bar','table']
    if key in {'outcomes','sources'}:
        return ['bar','table','donut']
    if key in {'opening_hours','gallery_completeness','publishing_errors','import_errors','attention_resolution','missing_staff_availability','change_initiators','appointment_weekday_mix','customer_provider_preferences','customer_location_preferences','setup_completeness','pending_imports','campaign_errors','newsletter_growth','newsletter_unsubscribe_trend','content_type_status','publication_activity','withdrawal_activity','catalog_quality','invitations','content_status','gallery_status','newsletter_audience','newsletter_campaigns','local_captured','newsletter_skipped','newsletter_retries','sender_readiness','website_status','payment_concentration','payments_per_customer','invitation_turnaround','newsletter_confirmation_rate','newsletter_confirmation_time','newsletter_unsubscribed','scheduled_campaigns'}:
        return ['value','bar','table']
    if key in {'services','providers','locations','duration_distribution','cancellation_reasons','lead_time_distribution'}:
        return ['bar','table']
    if key.startswith(('service_', 'provider_', 'location_')) or key=='customer_preferences':
        return ['bar','table']
    if key.endswith('_rate') or key in {'utilization','repeat_percentage'}:
        return ['value','radial','table']
    return ['value','table']
