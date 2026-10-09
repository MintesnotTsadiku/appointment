"""Declared calculations over already permission-scoped bookings."""

import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from statistics import mean
from frappe import _
from appointment.scheduler.analytics_calculations import _code_label


def filter_segment(rows, history, filters, zone):
    segment = filters.data.get('segment', 'all')
    if segment == 'all':
        return rows
    prior = {row.client_email.lower() for row in history if row.client_email and row.status in {'Pending', 'Confirmed', 'Completed'} and row.appointment_date < filters.start}
    counts = Counter(row.client_email.lower() for row in rows if row.client_email and row.status in {'Pending', 'Confirmed', 'Completed'} and filters.start <= row.appointment_date <= filters.end)
    return [row for row in rows if row.client_email and (
        (segment == 'new' and row.client_email.lower() not in prior) or
        (segment == 'returning' and row.client_email.lower() in prior) or
        (segment == 'repeat' and counts[row.client_email.lower()] > 1))]


def enrich(report, rows, history, operational, filters, zone, money, workspace=None, offerings=None, prices=None, documents=None):
    selected = [row for row in rows if (day := filters.date(row, zone)) and filters.start <= day <= filters.end]
    metrics = {}
    generated = datetime.now(timezone.utc).isoformat()

    def metric(key, value, definition, unit='bookings', data=None, known=None, eligible=None):
        eligible = len(selected) if eligible is None else eligible
        known = eligible if known is None else known
        coverage = 'unavailable' if value is None else 'complete' if known == eligible else 'partial' if known else 'unavailable'
        reported=value if coverage != 'unavailable' and not (coverage=='partial' and value==0) else None
        metrics[key] = dict(value=reported, unit=unit,
                            definition=definition, rows=data or [], coverage=coverage,
                            known=known, unknown=eligible-known, time_basis=filters.basis,
                            generated_at=generated)

    def distribution(key, counter, definition, unit='bookings'):
        metric(key, sum(counter.values()), definition, unit,
               [dict(name=name or _('Unknown'), count=count) for name, count in counter.most_common()])

    current = report['current']
    for key, title in [('total','All bookings'), ('completed','Completed'), ('cancelled','Cancelled'), ('no_show','No Show'), ('booked_hours','Scheduled hours'), ('unique_customers','Unique customers'), ('repeat_customers','Repeat within period')]:
        metric(key, current[key], _('{0}, selected date basis (latest captured event for event/outcome basis) and filters. Latest recorded status; email identity within the permitted business scope.').format(_(title)), 'hours' if key == 'booked_hours' else 'customers' if 'customers' in key else 'bookings')
    metric('active',current['active'],_('Selected Pending, Confirmed and Completed bookings. Latest statuses; cancellations and no-shows excluded.'))
    metric('confirmed_today',report['today_confirmed'],_('Confirmed appointments today in business timezone, independent reporting range.'))
    distribution('outcomes', Counter(row.status for row in selected), _('Mutually exclusive latest booking statuses; cancellations stay separate from no-shows.'))
    distribution('sources', Counter(row.booking_source or 'unknown' for row in selected), _('Captured booking source. Historical bookings remain Unknown.'))
    metric('booking_trend', current['total'], _('Booking counts by selected date basis; sum of buckets equals all bookings.'), data=[dict(name=row['date'], count=row['bookings']) for row in current['trend']])
    for key in ('services', 'providers', 'locations'):
        metric(key, sum(row['count'] for row in current[key]), _('All ranks of Pending, Confirmed and Completed bookings. No truncated totals.'), data=current[key])
    resolved = [row for row in selected if row.status in {'Completed', 'No Show'} and row.ends_at and row.ends_at < datetime.now(timezone.utc).replace(tzinfo=None)]
    for key, status in [('no_show_rate','No Show'), ('attendance_rate','Completed')]:
        numerator = sum(row.status == status for row in resolved)
        metric(key, round(numerator/len(resolved)*100,1) if resolved else None,
               _('{0} / (elapsed Completed + No Show). Excludes cancellations and unresolved bookings.').format(_code_label(status)), '%', known=len(resolved), eligible=len(resolved))
        metrics[key].update(numerator=numerator, denominator=len(resolved))
    for key, status in [('completion_rate','Completed'), ('cancellation_rate','Cancelled')]:
        numerator = sum(row.status == status for row in selected)
        metric(key, round(numerator/len(selected)*100,1) if selected else None,
               _('{0} / all selected bookings, including unresolved and future bookings.').format(_code_label(status)), '%', known=len(selected), eligible=len(selected))
        metrics[key].update(numerator=numerator, denominator=len(selected))
    metric('pending', sum(row.status == 'Pending' for row in selected), _('Latest status is Pending.'))
    durations = [max(0, (row.ends_at-row.starts_at).total_seconds()/60) for row in selected if row.starts_at and row.ends_at]
    metric('average_duration', round(mean(durations),1) if durations else None, _('Mean scheduled end minus start; excludes service buffers.'), 'minutes', known=len(durations))
    distribution('duration_distribution', Counter(_('0–30 min') if x<=30 else _('31–60 min') if x<=60 else _('61–120 min') if x<=120 else _('>120 min') for x in durations), _('Scheduled duration histogram.'), 'bookings')
    distribution('cancellation_reasons', Counter(row.cancellation_reason or _('Not recorded') for row in selected if row.status=='Cancelled'), _('Recorded cancellation reasons only; no-show excluded.'))
    prior = {row.client_email.lower() for row in history if row.client_email and row.status in {'Pending','Confirmed','Completed'} and row.appointment_date < filters.start}
    customers = Counter(row.client_email.lower() for row in selected if row.client_email and row.status in {'Pending','Confirmed','Completed'})
    metric('new_customers', sum(email not in prior for email in customers), _('Email identities with no earlier eligible booking in the permitted business history.'), 'customers')
    metric('returning_customers', sum(email in prior for email in customers), _('Email identities with an eligible booking before this reporting period in permitted history.'), 'customers')
    metric('repeat_percentage', round(sum(count>1 for count in customers.values())/len(customers)*100,1) if customers else None, _('Customers with >1 eligible booking in period / unique eligible customers. Email identity.'), '%', known=len(customers), eligible=len(customers))
    metric('bookings_per_customer', round(sum(customers.values())/len(customers),2) if customers else None, _('Eligible bookings / unique email identities in period.'), 'bookings/customer', known=len(customers), eligible=len(customers))
    metric('missing_contacts', sum(not row.client_phone or not row.client_email for row in selected), _('Bookings missing phone or email; counts records, not people.'))
    from zoneinfo import ZoneInfo
    import frappe
    system_zone=ZoneInfo(frappe.utils.get_system_timezone())
    leads=[(row.starts_at-row.creation.replace(tzinfo=system_zone).astimezone(timezone.utc).replace(tzinfo=None)).total_seconds()/3600 for row in selected if row.starts_at and row.creation]
    metric('lead_time',round(mean(leads),1) if leads else None,_('Mean scheduled start minus booking creation. Negative values represent bookings entered after their start; no clipping.'),'hours',known=len(leads))
    distribution('lead_time_distribution',Counter(_('After start') if value<0 else _('<24 h') if value<24 else _('1–7 days') if value<168 else _('>7 days') for value in leads),_('Booking creation-to-start interval histogram.'))
    demand=Counter(row.creation.replace(tzinfo=system_zone).astimezone(zone).strftime('%a %H:00') for row in selected)
    distribution('creation_demand',demand,_('Weekday and hour of booking creation, in business timezone; selected bookings.'))
    starts=Counter(row.starts_at.replace(tzinfo=timezone.utc).astimezone(zone).strftime('%a %H:00') for row in selected if row.starts_at and row.status in {'Pending','Confirmed','Completed'})
    peak=max(starts.values(),default=0)
    peak_count=sum(count for count in starts.values() if count==peak)
    metric('peak_starts',peak_count,_('Starts in business weekday/hour categories tied for maximum observed start count. Sparse periods can tie all categories. Observed ranking, not a capacity forecast.'))
    metric('offpeak_starts',sum(starts.values())-peak_count,_('Eligible starts outside the categories tied for maximum observed start count. Peak and off-peak counts sum to appointment-start popularity.'))
    distribution('start_popularity',starts,_('Eligible appointment start counts by business weekday/hour. Not booked hours.'))
    granularity=filters.data.get('granularity','daily')
    if granularity!='daily':
        buckets=Counter()
        for row in current['trend']:
            day=__import__('datetime').date.fromisoformat(row['date'])
            key=day.strftime('%Y-%m') if granularity=='monthly' else (day-timedelta(days=day.weekday())).isoformat()
            buckets[key]+=row['bookings']
        metrics['booking_trend']['rows']=[dict(name=key,count=value) for key,value in sorted(buckets.items())]
    captures = [row for row in selected if row.price_captured_at]
    event_known=sum(bool(row.workflow_events) for row in rows)
    selected_events_known=sum(bool(row.workflow_events) for row in selected)
    selected_names={row.name for row in selected}
    events = [(row,event) for row in rows for event in json.loads(row.workflow_events or '[]') if filters.start <= filters.event_date(event,zone) <= filters.end]
    for key, action in [('reschedules','reschedule'), ('confirmations','confirm'), ('cancellations_events','cancel')]:
        data=Counter(filters.event_date(event,zone).isoformat() for row,event in events if event['type']==action)
        metric(key, sum(data.values()), _('Committed {0} events by event date. No modified-time inference.').format(action), data=[dict(name=k,count=v) for k,v in sorted(data.items())],known=event_known,eligible=len(rows))
        metrics[key]['time_basis']='event'
    metric('event_coverage',selected_events_known,_('Selected bookings with a committed workflow event ledger. Historical missing ledgers remain unknown.'),'bookings',known=selected_events_known)
    distribution('referrals',Counter(row.referral_code or _('Unknown / none') for row in selected),_('Captured referral-code booking totals; no website visitor conversion denominator (LF-05/LF-06).'))
    cancellations=[row for row in selected if row.status=='Cancelled' and row.cancelled_at]
    late=sum((row.starts_at-row.cancelled_at).total_seconds()<86400 for row in cancellations)
    metric('late_cancellation_rate',round(late/len(cancellations)*100,1) if cancellations else None,_('Cancelled bookings with notice <24 hours / cancelled bookings with captured notice. Negative notice is late.'),'%',known=len(cancellations),eligible=sum(row.status=='Cancelled' for row in selected) or 1)
    metric('changes_per_booking',round(sum(event['type']=='reschedule' and row.name in selected_names for row,event in events)/selected_events_known,2) if selected_events_known else None,_('Captured reschedule events in event-date window / selected bookings with an event ledger.'),'changes/booking',known=selected_events_known)
    metric('verified_recovery',sum(bool(row.recovered_from) for row in selected),_('Explicit validated released-booking links on replacement bookings. A later overlap alone is not recovery.'),'bookings',known=selected_events_known)
    metric('reschedule_rate' , round(len({row.name for row,event in events if event['type']=='reschedule' and row.name in selected_names})/len(selected)*100,1) if selected else None, _('Distinct selected bookings with a captured reschedule event in period / selected bookings.'), '%',known=selected_events_known)
    for key, first, second in [('confirmation_turnaround','creation','confirmed_at'),('actual_duration','actual_start','actual_end'),('service_delay','starts_at','actual_start'),('cancellation_notice','cancelled_at','starts_at')]:
        values=[]
        for row in selected:
            if row.get(first) and row.get(second):
                start=row.get(first)
                if first=='creation':
                    from zoneinfo import ZoneInfo
                    import frappe
                    start=start.replace(tzinfo=ZoneInfo(frappe.utils.get_system_timezone())).astimezone(timezone.utc).replace(tzinfo=None)
                values.append((row.get(second)-start).total_seconds()/60)
        metric(key,round(mean(values),1) if values else None, _('Mean {0} minus {1}, UTC captured timestamps only.').format(second,first), 'minutes', known=len(values))
    recent=[dict(name=f"{event['timestamp']} · {event['type']}",count=1) for row,event in sorted(events,key=lambda pair:pair[1]['timestamp'],reverse=True)[:50]]
    metric('recent_activity',len(events),_('Committed booking actions in event-date range, latest 50 shown; private notes and contact fields excluded.'),'events',data=recent,known=event_known,eligible=len(rows))
    metric('capture_quality',len(captures),_('Bookings with original agreed price/source capture / selected bookings. Older bookings remain unknown.'),'bookings',known=len(captures))
    metric('arrivals',sum(bool(row.arrived_at) for row in selected),_('Captured arrivals on selected bookings.'),known=selected_events_known)
    metric('checked_in',sum(bool(row.checked_in_at) for row in selected),_('Captured check-ins on selected bookings.'),known=selected_events_known)
    from appointment.scheduler.analytics_timing import calculate as timing_metrics
    timing_metrics(metric, selected, events, selected_names, zone)
    utilization=current['utilization']
    metric('utilization',utilization['rate'],_('Union of occupied provider intervals / current working windows. Buffers included. Historical schedules are not snapshotted (LF-09).'),'%', known=0 if filters.basis!='appointment' else 1,eligible=1)
    metrics['utilization']['coverage_note']=_('Historical working hours are not snapshotted; denominator uses current schedules (LF-09).')
    metrics['utilization']['coverage']='partial' if utilization['available'] and filters.basis=='appointment' else 'unavailable'
    metric('occupied_hours',utilization['booked_hours'],_('Occupied interval union by provider, including buffers, appointment date.'), 'hours',known=sum(bool(row.occupied_from and row.occupied_until) for row in selected if row.status in {'Pending','Confirmed','Completed','No Show'}) if filters.basis=='appointment' else 0,eligible=sum(row.status in {'Pending','Confirmed','Completed','No Show'} for row in selected) if filters.basis=='appointment' else 1)
    if money:
        for key in ('catalog_value','recorded_payments'):
            metric(key,current[key], _('Current catalog estimate, not original agreed value.') if key=='catalog_value' else _('Amounts recorded on selected bookings. Not payment-date collections; no ledger (LF-02).'),'ETB',known=sum(bool(row.amount_paid) for row in selected) if key=='recorded_payments' else len(selected))
        metric('agreed_value',round(sum(float(row.agreed_price or 0) for row in captures),2),_('Original catalog-at-booking agreed snapshot. Historical missing prices excluded. ETB only.'),'ETB',known=len(captures))
        metric('discounts',round(sum(float(row.discount_amount or 0) for row in captures),2),_('Recorded agreed discounts; current booking paths do not offer promotions.'),'ETB',known=len(captures))
        metric('payment_records',sum(bool(row.amount_paid) for row in selected),_('Bookings with a nonzero recorded amount; zero may mean unpaid or unrecorded.'))
    today=report['today']
    agenda=[dict(name=row.name,date=row.appointment_date.isoformat(),time=str(row.start_time),status=row.status,provider=row.provider,location=row.location) for row in operational if row.appointment_date.isoformat()==today and row.status in {'Pending','Confirmed'}]
    metric('agenda',len(agenda),_('Today in business timezone, independent of reporting range.'), data=agenda)
    metric('upcoming',report['next_seven_days'],_('Today through six following days, Pending and Confirmed. Independent of reporting range.'))
    unresolved=[row for row in operational if row.status in {'Pending','Confirmed'} and row.ends_at and row.ends_at < datetime.now(timezone.utc).replace(tzinfo=None)]
    metric('attention',len(unresolved),_('Past appointments still Pending or Confirmed, all history in permitted scope.'),data=[dict(name=row.name,count=1) for row in unresolved])
    from appointment.scheduler.analytics_breakdowns import calculate as breakdown_metrics
    breakdown_metrics(metric,selected,current,prices or {},money)
    from appointment.scheduler.analytics_customers import calculate as customer_metrics
    customer_metrics(metric, selected, history, filters.start, filters.end, __import__('datetime').date.fromisoformat(report['today']), money)
    if workspace is not None:
        from appointment.scheduler.analytics_operations import calculate as operation_metrics
        from appointment.scheduler.analytics_capacity import calculate as capacity_metrics
        capacity_metrics(metric,rows,filters.start,filters.end,zone,offerings or [],filters.basis,documents)
        operation_metrics(metric, operational, workspace, workspace['organization'], __import__('datetime').date.fromisoformat(report['today']), offerings or [])
    uncaptured = sum(not row.workflow_events for row in rows if filters.basis=='event' or row.status in {'Completed','Cancelled','No Show'}) if filters.basis in {'event','outcome'} else 0
    booked_metrics={'booked_hours','unique_customers','repeat_customers','services','providers','locations','new_customers','returning_customers','repeat_percentage','bookings_per_customer','start_popularity','catalog_value'}
    completed_metrics={'retention_30','retention_60','retention_90','second_visit_conversion','cohorts','visit_interval','days_since_visit','lapse_risk'}
    operational_metrics={'gallery_completeness','publishing_errors','import_errors','confirmed_today','next_appointment','opening_hours','missing_staff_availability','pending_imports','campaign_errors','setup_completeness','gallery_completeness','newsletter_growth','newsletter_unsubscribe_trend','invitation_turnaround','content_type_status','publication_activity','withdrawal_activity','newsletter_confirmation_rate','newsletter_confirmation_time','newsletter_unsubscribed','scheduled_campaigns','future_slots','next_slot','agenda','upcoming','attention','completed_today','today_workload','conflicts','active_providers','active_locations','reception_state','walk_ins_waiting','walk_ins_assigned','walk_ins_cancelled','current_queue_wait','queue_wait','walk_in_conversion','catalog_quality','invitations','content_status','gallery_status','newsletter_audience','newsletter_campaigns','local_captured','newsletter_skipped','newsletter_retries','sender_readiness','website_status'}
    sources={'pending_imports':'Organization Workbook Import','campaign_errors':'Business Newsletter Campaign','setup_completeness':'Service / EventType / Location','gallery_completeness':'Gallery Collection','newsletter_growth':'Newsletter Audience Member','newsletter_unsubscribe_trend':'Newsletter Audience Member','invitation_turnaround':'Business Staff Invitation','content_type_status':'Published Content Release','publication_activity':'Published Content Release','withdrawal_activity':'Published Content Release','newsletter_confirmation_rate':'Newsletter Audience Member','newsletter_confirmation_time':'Newsletter Audience Member','newsletter_unsubscribed':'Newsletter Audience Member','scheduled_campaigns':'Business Newsletter Campaign','opening_hours':'Location','missing_staff_availability':'Provider','invitations':'Business Staff Invitation','content_status':'Content Ownership','gallery_status':'Gallery Collection','newsletter_audience':'Newsletter Audience Member','newsletter_campaigns':'Business Newsletter Campaign','local_captured':'Business Newsletter Campaign','newsletter_skipped':'Business Newsletter Campaign','newsletter_retries':'Business Newsletter Campaign','sender_readiness':'Newsletter Sender Identity','website_status':'Public Site','reception_state':'Location','catalog_quality':'Service','active_providers':'EventType','active_locations':'EventType'}
    schedule_estimates={'utilization','available_hours','unused_hours','schedule_gaps','fragmentation','capacity_adjusted_popularity','no_availability_days','provider_utilization','location_utilization','service_utilization'}
    for key, contract in metrics.items():
        if key in schedule_estimates and contract['coverage']!='unavailable':
            contract['coverage']='partial'
            if contract['value']==0:contract['value']=None
            contract['coverage_note']=_('Denominator uses current eligible schedules. Historical schedules are not snapshotted (LF-09). Missing occupied intervals are excluded.')
        if key in {'change_initiators','reschedules','confirmations','cancellations_events','recent_activity'}:
            contract['time_basis']='event'
        if key in {'days_since_visit','lapse_risk'}:
            contract['time_basis']='today / selected customer identities'
        if key in {'retention_30','retention_60','retention_90','cohorts','second_visit_conversion'}:
            contract['time_basis']='first completed appointment date / mature observation window'
        if key=='next_appointment':
            contract['time_basis']='future / generated time'
        contract.update(metric_id=key, source=sources.get(key,'Walk In' if key.startswith('walk_') or 'queue_wait' in key else 'Appointment'),
                        permission_scope=report['role'], applied_filters=filters.data, supported_filters=['business','start','end','basis','providers','locations','services','statuses','sources','segment','granularity'],
                        eligible_statuses=['Pending','Confirmed','Completed'] if key in booked_metrics else ['Completed','No Show'] if key in {'no_show_rate','attendance_rate'} else ['Completed'] if key in completed_metrics else ['Pending','Confirmed','Completed','Cancelled','No Show'],
                        excluded_statuses=['Cancelled','No Show'] if key in booked_metrics else ['Pending','Confirmed','Cancelled'] if key in {'no_show_rate','attendance_rate'} else [], coverage_since=min((str(row.price_captured_at) for row in captures),default=None))
        if key in operational_metrics:
            contract['time_basis']='today' if key in {'agenda','completed_today','today_workload'} else 'current state / explicit operational window'
            contract['supported_filters']=['business','providers','locations','services'] if contract['source']=='Appointment' else ['business','locations']
        if contract['source']!='Appointment':
            contract['eligible_statuses']=[]
            contract['excluded_statuses']=[]
        if uncaptured and contract['time_basis']==filters.basis:
            contract['unknown'] += uncaptured
            contract['coverage']='partial' if contract['known'] else 'unavailable'
            if not contract['known']:contract['value']=None
            contract['coverage_note']=_('Records without captured event dates cannot be assigned to this date window. Unknown count covers scoped history.')
    report.update(metrics=metrics,filters=filters.data,time_basis=filters.basis,generated_at=generated,
                  capture_coverage=dict(known=len(captures),unknown=len(selected)-len(captures),unknown_event_dates=uncaptured),
                  source_watermark=max((str(row.modified) for row in history),default=None),
                  filter_options={key:sorted({row.get(field) for row in history if row.get(field)}) for key,field in [('providers','provider'),('locations','location'),('services','service')]})
    report['definitions']['customer_identity']=_('Email within permitted business records; earlier visits outside the role scope are not used. Unverified contacts and cross-email customers are not resolved (LF-01).')
