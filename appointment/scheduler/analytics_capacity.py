"""Current capacity calculations reuse the booking authority and interval unions."""
from collections import defaultdict, Counter
from datetime import datetime, timedelta, timezone, time
from zoneinfo import ZoneInfo
import frappe
from appointment.scheduler import booking


def calculate(metric, rows, start, end, zone, offerings, basis, documents=None):
    from appointment.scheduler.analytics_schedule_quality import calculate as schedule_metrics
    schedule_metrics(metric, rows, offerings, start, end, zone, basis, documents)
    if basis=='appointment':
        _recorded_capacity(metric,rows,start,end,zone)
    else:
        for key in ('buffer_hours','occupied_heatmap'):
            metric(key,None,'Recorded historical capacity requires appointment-date scope.','hours',known=0,eligible=1)
    _future_capacity(metric,zone,offerings,documents)


def _recorded_capacity(metric,rows,start,end,zone):
    from appointment.scheduler.analytics import _merge_intervals
    lower=datetime.combine(start,time.min,zone).astimezone(timezone.utc).replace(tzinfo=None)
    upper=datetime.combine(end+timedelta(days=1),time.min,zone).astimezone(timezone.utc).replace(tzinfo=None)
    occupied,scheduled=defaultdict(list),defaultdict(list)
    missing=0
    for row in rows:
        if row.status not in booking.ACTIVE or not start<=row.appointment_date<=end:continue
        if not row.occupied_from or not row.occupied_until:
            missing+=1
            continue
        for target,a,b in ((occupied,row.occupied_from,row.occupied_until),(scheduled,row.starts_at,row.ends_at)):
            if a and b and min(b,upper)>max(a,lower):target[row.provider].append((max(a,lower),min(b,upper)))
    scheduled_minutes=sum((b-a).total_seconds()/60 for intervals in scheduled.values() for a,b in _merge_intervals(intervals))
    occupied_minutes=sum((b-a).total_seconds()/60 for intervals in occupied.values() for a,b in _merge_intervals(intervals))
    metric('buffer_hours',round((occupied_minutes-scheduled_minutes)/60,2),'Occupied provider interval union minus scheduled interval union. Recorded buffers only; overlap counted once.','hours',known=sum(len(value) for value in occupied.values()),eligible=sum(len(value) for value in occupied.values())+missing)
    buckets=Counter()
    for intervals in occupied.values():
        for opened,closed in _merge_intervals(intervals):
            cursor=opened
            while cursor<closed:
                local=cursor.replace(tzinfo=timezone.utc).astimezone(zone)
                next_hour=(local.replace(minute=0,second=0,microsecond=0)+timedelta(hours=1)).astimezone(timezone.utc).replace(tzinfo=None)
                boundary=min(closed,next_hour if next_hour>cursor else cursor+timedelta(hours=1))
                buckets[local.strftime('%a %H:00')]+=(boundary-cursor).total_seconds()/3600
                cursor=boundary
    metric('occupied_heatmap',round(sum(round(value,3) for value in buckets.values()),3),'Union of occupied provider intervals split across business weekday/hour; recorded buffers included. Hours, not start counts.','hours',data=[dict(name=key,count=round(value,3)) for key,value in sorted(buckets.items())],known=sum(len(value) for value in occupied.values()),eligible=sum(len(value) for value in occupied.values())+missing)


def _future_capacity(metric,zone,offerings,documents):
    # Availability follows all canonical conflicts, but only aggregate slot counts leave this module.
    now=datetime.now(timezone.utc).replace(tzinfo=None)
    today=now.replace(tzinfo=timezone.utc).astimezone(zone).date()
    until=datetime.combine(today+timedelta(days=7),time.min,zone).astimezone(timezone.utc).replace(tzinfo=None)
    parts=[booking.offering(row.name,documents=documents) for row in offerings]
    users=list({part.provider.user for part in parts})
    blocked=defaultdict(list)
    if users:
        for row in frappe.db.sql('''select p.user,a.occupied_from,a.occupied_until from tabAppointment a inner join tabProvider p on p.name=a.provider where p.user in %s and a.status in %s and a.occupied_from<%s and a.occupied_until>%s''',(users,booking.ACTIVE,until,now),as_dict=True):
            blocked[row.user].append((row.occupied_from,row.occupied_until))
        system_zone=ZoneInfo(frappe.utils.get_system_timezone())
        system_lower=now.replace(tzinfo=timezone.utc).astimezone(system_zone).replace(tzinfo=None)
        system_upper=until.replace(tzinfo=timezone.utc).astimezone(system_zone).replace(tzinfo=None)
        for user in users:
            events=frappe.db.sql('''select e.starts_on,e.ends_on from `tabBooking Event` e left join `tabUser Appointment Availability` u on u.name=e.custom_user_calendar where (u.user=%s or exists (select 1 from tabMembers m inner join `tabUser Appointment Availability` c on c.name=m.user where m.parent=e.custom_appointment_group and m.parenttype='Appointment Group' and c.user=%s)) and e.status!='Cancelled' and e.starts_on<%s and e.ends_on>%s''',(user,user,system_upper,system_lower),as_dict=True)
            blocked[user].extend((row.starts_on.replace(tzinfo=system_zone).astimezone(timezone.utc).replace(tzinfo=None),row.ends_on.replace(tzinfo=system_zone).astimezone(timezone.utc).replace(tzinfo=None)) for row in events)
    candidates=[]
    for part in parts:
        event,service,location,provider,business=part
        duration=int(event.duration_override or service.duration or 0)
        if duration<=0:continue
        notice=max(int(provider.minimum_booking_notice or 0),int(business.minimum_booking_notice or 0))
        local_today=now.replace(tzinfo=timezone.utc).astimezone(ZoneInfo(location.timezone)).date()
        for offset in range(8):
            day=local_today+timedelta(days=offset)
            for hours in booking.effective_hours(service,location,provider,day):
                cursor=booking.local_instant(day,hours['start_time'],location.timezone)+timedelta(minutes=int(service.buffer_before or 0))
                close=booking.local_instant(day,hours['end_time'],location.timezone)
                while cursor+timedelta(minutes=duration+int(service.buffer_after or 0))<=close:
                    finish=cursor+timedelta(minutes=duration)
                    opened=cursor-timedelta(minutes=int(service.buffer_before or 0))
                    closed=finish+timedelta(minutes=int(service.buffer_after or 0))
                    if now+timedelta(minutes=notice)<=cursor<until and not any(a<closed and b>opened for a,b in blocked[provider.user]):candidates.append(cursor)
                    cursor=finish
    metric('future_slots',len(candidates),'Offering-specific start slots today through six following business days. Service options can overlap; counts are not independent simultaneous capacity. Current schedules, notice, buffers and canonical booking/calendar conflicts.','offering slots',known=len(parts),eligible=len(parts) or 1)
    earliest=min(candidates,default=None)
    metric('next_slot',round((earliest-now).total_seconds()/3600,2) if earliest else None,'Hours from generated time to earliest permitted offering-specific slot within today plus six days. Snapshot only; recheck when booking.','hours',known=int(bool(earliest)),eligible=1)
