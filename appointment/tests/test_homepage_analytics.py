"""Focused rollback-only checks for the approved homepage contracts."""
import json
import frappe
from appointment.scheduler import analytics, dashboard_config
from appointment.scheduler.analytics_filters import ReportFilters
from datetime import date


def run():
    original=frappe.session.user
    frappe.db.savepoint('homepage_checks')
    result={}
    try:
        frappe.set_user('bloom.owner@example.test')
        workspace=frappe.db.get_value('Organization',{'owner_user':frappe.session.user},'name')
        report=analytics.overview(workspace,30)
        assert len(report['metrics'])>=140
        assert report['metrics']['lead_time']['coverage']=='complete'
        assert report['metrics']['average_duration']['value'] is not None
        for contract in report['metrics'].values():
            assert contract['known']>=0 and contract['unknown']>=0
            assert contract['coverage'] in {'complete','partial','unavailable'}
            if contract['coverage']=='unavailable':assert contract['value'] is None
        for dimension in ('service','provider','location'):
            assert abs(sum(row['count'] for row in report['metrics'][dimension+'_scheduled_hours']['rows'])-report['metrics'][dimension+'_scheduled_hours']['value'])<0.001
            for outcome in ('completed','cancelled','no_show'):
                contract=report['metrics'][dimension+'_'+outcome+'_rate']
                assert sum(row['denominator'] for row in contract['rows'])==(report['metrics']['no_show_rate']['denominator'] if outcome=='no_show' else report['current']['total'])
                assert all(0<=row['count']<=100 for row in contract['rows'])
        assert sum(row['count'] for row in report['metrics']['booking_trend']['rows'])==report['current']['total']
        assert sum(row['count'] for row in report['metrics']['outcomes']['rows'])==report['current']['total']
        assert sum(row['count'] for row in report['current']['services'])==report['current']['active']
        assert report['metrics']['peak_starts']['value']+report['metrics']['offpeak_starts']['value']==report['metrics']['start_popularity']['value']
        assert report['metrics']['service_trend']['value']==sum(row['count'] for row in report['metrics']['service_trend']['rows'])==report['current']['active']
        drill=analytics.records(workspace,'total',30)
        assert drill['total']==report['current']['total'] and len(drill['records'])<=50
        assert all(set(row)=={'reference','date','time','timezone','status','service','provider','location'} for row in drill['records'])
        assert analytics.records(workspace,'no_show_rate',30)['total']==report['metrics']['no_show_rate']['denominator']
        # Explicitly exercise a missing historical snapshot, regardless of demo seed version.
        legacy = frappe.db.get_value('Appointment', {'organization':workspace, 'appointment_date':['between',[report['start'],report['end']]]}, 'name')
        frappe.db.set_value('Appointment', legacy, 'price_captured_at', None, update_modified=False)
        partial = analytics.overview(workspace,30)
        assert partial['metrics']['agreed_value']['coverage']!='complete'
        assert partial['metrics']['agreed_value']['unknown']>=1
        assert report['metrics']['utilization']['coverage']=='partial'
        custom=analytics.overview(workspace,30,json.dumps({'start':'2026-09-01','end':'2026-09-07'}))
        assert len(custom['current']['trend'])==7
        creation=analytics.overview(workspace,30,json.dumps({'basis':'creation'}))
        assert creation['metrics']['utilization']['coverage']=='unavailable'
        bad=[{'providers':['another-business-provider']},{'locations':['another-business-location']},{'services':['another-business-service']}]
        for filters in bad:
            try:analytics.overview(workspace,30,json.dumps(filters))
            except frappe.PermissionError:pass
            else:raise AssertionError('Unauthorized filter accepted')
        for filters in [{'start':'2026-09-10','end':'2026-09-01'},{'basis':'modified'},{'statuses':['invalid']}]:
            try:ReportFilters(json.dumps(filters),date(2026,9,26),30)
            except frappe.ValidationError:pass
            else:raise AssertionError('Invalid filter accepted')
        config=dict(version=1,preset='clinic',widgets=[dict(id='agenda',chart='table',span=2),dict(id='agreed_value',chart='value',span=1)])
        dashboard_config.save(workspace,'home',json.dumps(config))
        assert dashboard_config.load(workspace,'home')==config
        assert dashboard_config._key(workspace,'home')!=dashboard_config._key(workspace,'insights')
        result['owner']={'metrics':len(report['metrics']),'total':report['current']['total'],'reconciled':True}
        frappe.set_user('bloom.provider1@example.test')
        restricted=analytics.overview(workspace,30)
        assert not dashboard_config.FINANCIAL & restricted['metrics'].keys()
        safe=dashboard_config.validate(config,{'is_manager':False})
        assert [row['id'] for row in safe['widgets']]==['agenda']
        result['provider']={'total':restricted['current']['total'],'financial_hidden':True}
        frappe.set_user('Guest')
        try:dashboard_config.navigation()
        except frappe.PermissionError:pass
        else:raise AssertionError('Guest preferences accepted')
        return dict(passed=True,checks=result)
    finally:
        frappe.db.rollback(save_point='homepage_checks')
        frappe.set_user(original)


def capture_checks():
    from appointment.scheduler import booking, analytics_capture
    from datetime import timedelta
    original=frappe.session.user
    frappe.db.savepoint('capture_checks')
    try:
        frappe.set_user('bloom.owner@example.test')
        organization=frappe.db.get_value('Organization',{'owner_user':frappe.session.user},'name')
        services=frappe.get_all('Service',filters={'organization':organization},pluck='name')
        event=frappe.get_all('EventType',filters={'service':['in',services],'is_active':1},pluck='name')[0]
        today=frappe.utils.getdate()
        slot=None
        for day in range(1,15):
            available=booking.slots(event,str(today+timedelta(days=day)),organization)['all_available_slots_for_data']
            slot=next((row for row in available if row['available']),None)
            if slot:break
        assert slot,'No available fixture slot'
        payload=dict(offering_id=event,start_time=slot['start_time'],end_time=slot['end_time'],user_name='Rollback capture customer',user_email='capture@example.test',request_id=frappe.generate_hash(length=32),organization_id=organization)
        first=booking.book(**payload)
        second=booking.book(**payload)
        assert first==second
        doc=frappe.get_doc('Appointment',first['booking_id'])
        legacy_payload=dict(offering=event,start=booking.utc(payload['start_time']).isoformat(),end=booking.utc(payload['end_time']).isoformat(),name=payload['user_name'],email=payload['user_email'],phone='',notes='')
        assert doc.request_hash==__import__('hashlib').sha256(json.dumps(legacy_payload,sort_keys=True).encode()).hexdigest()
        initial=json.loads(doc.workflow_events)
        assert [event['type'] for event in initial]==['create','confirm']
        assert len({event['idempotency_key'] for event in initial})==2
        price=doc.agreed_price
        frappe.db.set_value('Service',doc.service,'price',float(price or 0)+100,update_modified=False)
        doc.notes='Harmless edit';doc.agreed_price=999999;doc.workflow_events='[]';doc.save(ignore_permissions=True)
        assert doc.agreed_price==price and json.loads(doc.workflow_events)==initial
        for stage in ('arrive','check-in','start','end'):
            result=analytics_capture.reception_stage(doc.name,stage,str(doc.modified));doc.reload()
            repeated=analytics_capture.reception_stage(doc.name,stage,'old retry timestamp')
            assert frappe.utils.get_datetime(repeated['timestamp'])==frappe.utils.get_datetime(result['timestamp'])
        scheduled_before=str(doc.starts_at)
        available=booking.slots(event,str(doc.appointment_date),organization)['all_available_slots_for_data']
        alternate=next(row for row in available if row['available'] and row['start_time']!=payload['start_time'])
        local_start=booking.utc(alternate['start_time']).replace(tzinfo=__import__('datetime').timezone.utc).astimezone(__import__('zoneinfo').ZoneInfo(doc.booking_timezone))
        booking.change(doc.name,'reschedule',str(doc.modified),str(local_start.date()),local_start.strftime('%H:%M'),reason='Acceptance reschedule')
        doc.reload();moved=json.loads(doc.workflow_events)[-1]
        assert moved['type']=='reschedule' and moved['before']['starts_at']==scheduled_before and moved['reason']=='Acceptance reschedule'
        doc.status='Cancelled';doc.save(ignore_permissions=True)
        cancelled=json.loads(doc.workflow_events)
        doc.notes='Retry note';doc.save(ignore_permissions=True)
        assert json.loads(doc.workflow_events)==cancelled
        assert cancelled[-1]['type']=='cancel' and doc.cancelled_at
        assert not any(event['type']=='no-show' for event in cancelled)
        frappe.db.savepoint('failed_mutation')
        doc.status='Confirmed';doc.client_email='invalid'
        try:doc.save(ignore_permissions=True)
        except frappe.ValidationError:pass
        else:raise AssertionError('Invalid mutation accepted')
        frappe.db.rollback(save_point='failed_mutation');doc.reload()
        assert json.loads(doc.workflow_events)==cancelled
        return dict(passed=True,events=len(cancelled),snapshot_immutable=True,retries_unique=True,failed_write_unchanged=True)
    finally:
        frappe.db.rollback(save_point='capture_checks')
        frappe.set_user(original)


def clean_failed_capture_fixture():
    frappe.set_user('Administrator')
    rows=frappe.get_all('Appointment',filters={'client_email':'capture@example.test','client_name':'Rollback capture customer'},fields=['name','service','agreed_price','price_captured_at'])
    removed=[]
    for row in rows:
        if not row.price_captured_at:
            raise RuntimeError('Unexpected historical fixture; preserve it')
        current=frappe.db.get_value('Service',row.service,'price')
        if float(current or 0)==float(row.agreed_price or 0)+100:
            frappe.db.set_value('Service',row.service,'price',row.agreed_price,update_modified=False)
        frappe.db.delete('Version',{'ref_doctype':'Appointment','docname':row.name})
        frappe.delete_doc('Appointment',row.name,ignore_permissions=True)
        removed.append(row.name)
    return {'removed_owned_fixtures':len(removed)}


def profile():
    import time
    original=frappe.session.user
    try:
        frappe.set_user('bloom.owner@example.test')
        organization=frappe.db.get_value('Organization',{'owner_user':frappe.session.user},'name')
        started=time.perf_counter()
        original_sql=frappe.db.sql
        queries=[]
        def counted_sql(*args,**kwargs):
            queries.append(1)
            return original_sql(*args,**kwargs)
        frappe.db.sql=counted_sql
        try:report=analytics.overview(organization,90)
        finally:frappe.db.sql=original_sql
        return {'sql_queries':len(queries),'elapsed_ms':round((time.perf_counter()-started)*1000),'response_bytes':len(json.dumps(report,default=str).encode()),'bookings_in_period':report['current']['total'],'metrics':len(report['metrics'])}
    finally:
        frappe.set_user(original)
