"""Captured workflow timing and recovery calculations, without historical inference."""
from collections import Counter
from statistics import mean
from frappe import _


def calculate(metric, selected, events, selected_names, zone):
    known = sum(bool(row.workflow_events) for row in selected)
    changes = [(row, event) for row, event in events if row.name in selected_names and event['type'] in {'cancel', 'reschedule'}]
    # Actor identifiers are not disclosed by aggregate analytics.
    actors = Counter(_('Guest') if event['actor'] == 'Guest' else _('Authenticated staff or owner') for row, event in changes)
    metric('change_initiators', sum(actors.values()), _('Captured cancellation/reschedule actions on selected bookings in the event window. Actor categories only.'), 'actions', data=[dict(name=name, count=count) for name, count in actors.items()], known=known)
    for key, definition, values in [
        ('arrival_punctuality', _('Mean captured arrival minus scheduled UTC start. Negative means early.'), [(row.arrived_at-row.starts_at).total_seconds()/60 for row in selected if row.arrived_at and row.starts_at]),
        ('service_overrun', _('Mean actual service duration minus scheduled duration. Negative means shorter.'), [((row.actual_end-row.actual_start)-(row.ends_at-row.starts_at)).total_seconds()/60 for row in selected if row.actual_end and row.actual_start and row.starts_at and row.ends_at]),
        ('reception_queue_wait', _('Mean captured service start minus check-in. Appointment reception wait, separate from walk-in assignment wait.'), [(row.actual_start-row.checked_in_at).total_seconds()/60 for row in selected if row.actual_start and row.checked_in_at]),
    ]:
        metric(key, round(mean(values), 1) if values else None, definition, 'minutes', known=len(values), eligible=len(selected))
    from datetime import datetime, timezone
    resolutions=[(datetime.fromisoformat(event['timestamp']).replace(tzinfo=None)-row.ends_at).total_seconds()/60 for row,event in events if row.name in selected_names and row.ends_at and event['type'] in {'complete','no-show','cancel'} and datetime.fromisoformat(event['timestamp']).replace(tzinfo=None)>=row.ends_at]
    eligible=sum(row.status in {'Completed','No Show','Cancelled'} and bool(row.ends_at) and row.ends_at<datetime.now(timezone.utc).replace(tzinfo=None) for row in selected)
    metric('attention_resolution',round(mean(resolutions),1) if resolutions else None,_('Mean committed outcome event minus scheduled end for overdue selected bookings, in event window. Each committed resolution counts. Availability/setup issue resolution is not implied.'),'minutes',known=len({row.name for row,event in events if row.name in selected_names and row.ends_at and event['type'] in {'complete','no-show','cancel'} and datetime.fromisoformat(event['timestamp']).replace(tzinfo=None)>=row.ends_at}),eligible=eligible or 1)
    cancelled = [row for row in selected if row.status == 'Cancelled' and row.cancelled_at]
    # A replacement must carry the explicit validated link. One released booking counts once.
    recovered = {row.recovered_from for row, event in events if event['type'] == 'slot-recovery' and row.recovered_from}
    numerator = sum(row.name in recovered for row in cancelled)
    metric('recovery_rate', round(numerator/len(cancelled)*100, 1) if cancelled else None, _('Selected captured cancellations with an explicit replacement link in the event window / selected captured cancellations. No inferred overlap recovery.'), '%', known=len(cancelled), eligible=sum(row.status == 'Cancelled' for row in selected) or 1)
    upcoming = sorted((row for row in selected if row.status in {'Pending', 'Confirmed'} and row.starts_at), key=lambda row: row.starts_at)
    metric('appointment_weekday_mix', len(upcoming), _('Selected Pending/Confirmed appointments by scheduled business weekday; counts, not occupied hours.'), data=[dict(name=name, count=count) for name, count in Counter(row.starts_at.replace(tzinfo=__import__('datetime').timezone.utc).astimezone(zone).strftime('%a') for row in upcoming).items()])
