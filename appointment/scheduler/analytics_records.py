"""Minimal record drill-downs with the same authorized filters as each metric."""
from datetime import datetime, timezone
import frappe
from frappe import _

SUPPORTED = {'total','active','pending','completed','cancelled','no_show','services','providers','locations','booked_hours','agenda','attention','upcoming','no_show_rate','attendance_rate','outcomes','sources','booking_trend'}


def select(metric_id, rows, operational, filters, zone, today, offset):
    if metric_id not in SUPPORTED:
        frappe.throw(_('This metric does not support a booking record drill-down.'))
    if metric_id in {'agenda','attention','upcoming'}:
        pool=[row for row in operational if row.status in {'Pending','Confirmed'}]
        if metric_id=='agenda':pool=[row for row in pool if row.appointment_date==today]
        elif metric_id=='upcoming':pool=[row for row in pool if today<=row.appointment_date<=today+__import__('datetime').timedelta(days=6)]
        else:pool=[row for row in pool if row.ends_at and row.ends_at<datetime.now(timezone.utc).replace(tzinfo=None)]
    else:
        pool=[row for row in rows if (day:=filters.date(row,zone)) and filters.start<=day<=filters.end]
        statuses={'pending':{'Pending'},'completed':{'Completed'},'cancelled':{'Cancelled'},'no_show':{'No Show'}}.get(metric_id)
        if metric_id in {'active','services','providers','locations','booked_hours'}:statuses={'Pending','Confirmed','Completed'}
        if metric_id in {'no_show_rate','attendance_rate'}:
            statuses={'Completed','No Show'}
            pool=[row for row in pool if row.ends_at and row.ends_at<datetime.now(timezone.utc).replace(tzinfo=None)]
        if statuses:pool=[row for row in pool if row.status in statuses]
    ordered=sorted(pool,key=lambda row:(row.appointment_date,str(row.start_time),row.name))
    return dict(total=len(pool),offset=offset,records=[dict(reference=row.name,date=str(row.appointment_date),time=str(row.start_time),timezone=row.booking_timezone or 'Unknown',status=row.status,service=row.service,provider=row.provider,location=row.location) for row in ordered[offset:offset+50]])
