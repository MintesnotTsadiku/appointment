"""Operational quality and content counts scoped to existing capabilities."""
from collections import Counter
from datetime import datetime, timezone
import frappe
from frappe import _
from appointment.scheduler.analytics_calculations import _code_label


def calculate(metric, operational, workspace, organization, today, offerings):
    now=datetime.now(timezone.utc).replace(tzinfo=None)
    day_rows=[row for row in operational if row.appointment_date==today]
    metric('completed_today',sum(row.status=='Completed' for row in day_rows),_('Latest Completed status, today in business timezone, independent reporting range.'))
    metric('today_workload',len(day_rows),_('All bookings today, grouped by provider, independent reporting range.'),data=[dict(name=name,count=count) for name,count in Counter(row.provider for row in day_rows).most_common()])
    active=[row for row in operational if row.status in {'Pending','Confirmed','Completed','No Show'} and row.occupied_from and row.occupied_until]
    conflicts=[]
    occupied={}
    for row in sorted(active,key=lambda row:row.occupied_from):
        overlapping=[other for other in occupied.get(row.provider,[]) if other.occupied_until>row.occupied_from]
        conflicts.extend((row,other) for other in overlapping)
        occupied[row.provider]=[*overlapping,row]
    metric('conflicts',len(conflicts),_('Overlapping occupied intervals for the same provider; unordered pairs counted once. All scoped history, current records only.'))
    metric('active_providers',len({row.provider for row in offerings}),_('Distinct active eligible providers in your offering scope.'),'providers')
    metric('active_locations',len({row.location for row in offerings}),_('Distinct active eligible locations in your offering scope.'),'locations')
    upcoming=sorted((row for row in operational if row.status in {'Pending','Confirmed'} and row.starts_at and row.starts_at>=now),key=lambda row:row.starts_at)
    metric('next_appointment',1 if upcoming else 0,_('Next future Pending/Confirmed appointment in your scope, independent reporting range.'),data=[dict(name=upcoming[0].name,time=str(upcoming[0].start_time),status=upcoming[0].status)] if upcoming else [])
    providers=frappe.get_all('Provider',filters={'name':['in',list({row.provider for row in offerings}) or ['']]},fields=['name','use_default_hours'],limit_page_length=0)
    custom=[row.name for row in providers if not row.use_default_hours]
    configured=set(frappe.get_all('Opening Hours',filters={'parenttype':'Provider','parent':['in',custom or ['']]},pluck='parent',limit_page_length=0)) if frappe.db.exists('DocType','Opening Hours') else set()
    metric('missing_staff_availability',len(set(custom)-configured),_('Providers using custom hours with no configured opening-hour rows. Inherited hours are not missing.'),'providers')
    # get_list uses Walk In business/location permission predicates, in addition to the exact location filter.
    if workspace['role']=='Provider':
        return
    locations=list({row.location for row in offerings})
    opening=[]
    for location in locations:
        doc=frappe.get_doc('Location',location)
        opening.extend(dict(name=f'{doc.location_name} · {row.day_of_week} · {row.start_time}–{row.end_time}',count=1) for row in doc.opening_hours if row.is_open)
    metric('opening_hours',len(opening),_('Current location opening-hour rows marked open. Provider/service intersections and holidays are not represented here.'),'windows',data=opening)
    states=frappe.get_all('Location',filters={'name':['in',locations or ['']]},fields=['reception_state'],limit_page_length=0)
    known=sum(row.reception_state in {'Open','Closed'} for row in states)
    metric('reception_state',sum(row.reception_state=='Open' for row in states),_('Locations with captured Open state. Unconfigured locations are unknown, not closed.'),'open locations',known=known,eligible=len(states))
    queue=frappe.get_list('Walk In',filters={'location':['in',locations or ['']]},fields=['status','created_at','assigned_at','assigned_appointment'],limit_page_length=0)
    waiting=[row for row in queue if row.status=='waiting']
    for status in ('waiting','assigned','cancelled'):
        metric('walk_ins_'+status,sum(row.status==status for row in queue),_('All scoped walk-in records in latest {0} state; independent reporting range.').format(status),'walk-ins')
    system_zone=__import__('zoneinfo').ZoneInfo(frappe.utils.get_system_timezone())
    waits=[(now-row.created_at.replace(tzinfo=system_zone).astimezone(timezone.utc).replace(tzinfo=None)).total_seconds()/60 for row in waiting if row.created_at]
    metric('current_queue_wait',round(sum(waits)/len(waits),1) if waits else None,_('Mean current wait since creation for waiting walk-ins, as of generated time.'),'minutes',known=len(waits),eligible=len(waiting))
    assigned=[row for row in queue if row.status=='assigned']
    waits=[(row.assigned_at-row.created_at.replace(tzinfo=system_zone).astimezone(timezone.utc).replace(tzinfo=None)).total_seconds()/60 for row in assigned if row.assigned_at and row.created_at]
    metric('queue_wait',round(sum(waits)/len(waits),1) if waits else None,_('Mean captured assignment minus walk-in creation, UTC. Historical missing assignments excluded. All scoped walk-ins.'),'minutes',known=len(waits),eligible=len(assigned))
    metric('walk_in_conversion',round(len(assigned)/len(queue)*100,1) if queue else None,_('Assigned walk-ins / all scoped walk-ins, latest state.'),'%',known=len(queue),eligible=len(queue))
    if not workspace['is_manager']:
        return
    independent=organization.removeprefix('Provider:') if organization.startswith('Provider:') else None
    business_filter={'provider':independent,'organization':['is','not set']} if independent else {'organization':organization}
    services=frappe.get_all('Service',filters={'independent_provider':independent,'organization':['is','not set']} if independent else {'organization':organization},fields=['name','price','duration','is_active'],limit_page_length=0)
    metric('catalog_quality',sum(not row.duration or row.price is None for row in services),_('Services missing a positive duration or a price field. Zero is a valid free price.'),'services')
    metric('setup_completeness',sum(bool(value) for value in [services,offerings,locations]),_('Present setup categories: services, eligible offerings, active scoped locations. Three checks, not a website readiness verdict.'),'of 3 checks')
    metric('pending_imports',None,_('Installed workbook imports record successful committed results only. Pending/error lifecycle is not stored; no inferred zero.'),known=0,eligible=1)
    invitations=[] if independent else frappe.get_all('Business Staff Invitation',filters={'organization':organization},fields=['status','creation','accepted_at'],limit_page_length=0)
    metric('invitations',len(invitations),_('Current invitation states for this business, all time.'),'invitations',data=[dict(name=name,count=count) for name,count in Counter(row.status for row in invitations).most_common()])
    from appointment.content.entitlements import is_capable
    owner_type='Provider' if independent else 'Organization'
    permissions={cap:is_capable(owner_type,None if independent else organization,independent,cap) for cap in ('public_site','blog','gallery','newsletter')}
    for doctype,key in [('Content Ownership' ,'content_status'),('Gallery Collection','gallery_status'),('Newsletter Audience Member','newsletter_audience'),('Business Newsletter Campaign','newsletter_campaigns')]:
        capability='blog' if doctype=='Content Ownership' else 'gallery' if doctype=='Gallery Collection' else 'newsletter'
        if not permissions[capability]:continue
        items=frappe.get_all(doctype,filters=business_filter,fields=['status'],limit_page_length=0)
        metric(key,len(items),_('Current {0} states in this business. Not website visits, real inbox delivery or engagement.').format(_code_label(doctype)),'records',data=[dict(name=name,count=count) for name,count in Counter(row.status for row in items).most_common()])
    if permissions['gallery']:
        collections=frappe.get_all('Gallery Collection',filters=business_filter,fields=['name','cover','consent_review_status'],limit_page_length=0)
        with_items=set(frappe.get_all('Gallery Item',filters={'parent':['in',[row.name for row in collections] or ['']],'parenttype':'Gallery Collection'},pluck='parent',limit_page_length=0))
        metric('gallery_completeness',sum(not row.cover or row.name not in with_items or row.consent_review_status=='Pending' for row in collections),_('Collections missing cover/items or awaiting consent review. A review checklist, not publish-readiness certification.'),'collections')
    metric('publishing_errors',None,_('Publishing rejects failed writes atomically. No business-scoped persistent error lifecycle is installed; absence is not zero.'),known=0,eligible=1)
    metric('import_errors',None,_('Workbook import stores committed successful summaries, not failed/pending attempts. Error coverage unavailable.'),known=0,eligible=1)
    if permissions['newsletter']:
        campaigns=frappe.get_all('Business Newsletter Campaign',filters=business_filter,fields=['delivered_count','skipped_count','retry_count','status','scheduled_at'],limit_page_length=0)
        metric('campaign_errors',sum(row.status=='Error' for row in campaigns),_('Campaign latest status Error. Private error text is excluded.'),'campaigns')
        for field,key in [('delivered_count','local_captured'),('skipped_count','newsletter_skipped'),('retry_count','newsletter_retries')]:
            metric(key,sum(row.get(field) or 0 for row in campaigns),_('Local campaign {0} counter; does not prove inbox delivery (LF-16).').format(field),'messages')
        senders=frappe.get_all('Newsletter Sender Identity',filters=business_filter,fields=['status'],limit_page_length=0)
        metric('sender_readiness',sum(row.status=='Verified' for row in senders),_('Sender identities with Verified state. No external delivery claim.'),'senders')
        audience=frappe.get_all('Newsletter Audience Member',filters=business_filter,fields=['creation','consent_at','confirmed_at','unsubscribed_at','status'],limit_page_length=0)
        for key,field in [('newsletter_growth','creation'),('newsletter_unsubscribe_trend','unsubscribed_at')]:
            counts=Counter(str(row.get(field).date()) for row in audience if row.get(field))
            metric(key,sum(counts.values()),_('Audience {0} dates in stored system timezone, all time. No modified-time or website tracking inference.').format(field),'people',data=[dict(name=name,count=count) for name,count in sorted(counts.items())])
        confirmed=[row for row in audience if row.confirmed_at]
        metric('newsletter_confirmation_rate',round(len(confirmed)/len(audience)*100,1) if audience else None,_('Audience with captured confirmation / all audience records. All time, business scope.'),'%',known=len(audience),eligible=len(audience))
        confirmation=[(row.confirmed_at-row.consent_at).total_seconds()/60 for row in confirmed if row.consent_at]
        metric('newsletter_confirmation_time',round(sum(confirmation)/len(confirmation),1) if confirmation else None,_('Mean audience confirmation minus consent timestamp, stored system timezone, all time.'),'minutes',known=len(confirmation),eligible=len(confirmed))
        metric('newsletter_unsubscribed',sum(bool(row.unsubscribed_at) for row in audience),_('Audience with a captured unsubscribe timestamp, all time. No delivery/engagement inference.'),'people')
        metric('scheduled_campaigns',sum(row.status=='Scheduled' for row in campaigns),_('Latest campaign state Scheduled; scheduled timestamp is not evidence of delivery.'),'campaigns')
    accepted=[row for row in invitations if row.accepted_at]
    turnaround=[(row.accepted_at-row.creation).total_seconds()/3600 for row in accepted]
    metric('invitation_turnaround',round(sum(turnaround)/len(turnaround),1) if turnaround else None,_('Mean accepted invitation timestamp minus creation. Unaccepted invitations excluded, all time.'),'hours',known=len(turnaround),eligible=len(accepted))
    releases=frappe.get_all('Published Content Release',filters=business_filter,fields=['content_type','status','published_at','withdrawn_at'],limit_page_length=0)
    releases=[row for row in releases if permissions.get('blog' if row.content_type=='article' else 'gallery',False)]
    metric('content_type_status',len(releases),_('Immutable content release states grouped by recorded type. Historical versions included, not unique live articles.'),'releases',data=[dict(name=f'{kind} · {status}',count=count) for (kind,status),count in Counter((row.content_type,row.status) for row in releases).items()])
    metric('publication_activity',sum(bool(row.published_at) for row in releases),_('Immutable content releases with explicit published_at; all time. Retries reuse release contracts. No modified-time inference.'),'publications')
    metric('withdrawal_activity',sum(bool(row.withdrawn_at) for row in releases),_('Content release withdrawals with explicit withdrawn_at, all time.'),'withdrawals')
    if not permissions['public_site']:
        return
    site=frappe.db.get_value('Public Site',business_filter,['status'],as_dict=True)
    metric('website_status',int(bool(site and site.status=='Published')),_('One if the Public Site latest state is Published; zero if present and unpublished.'),'published sites',known=int(bool(site)),eligible=1)
