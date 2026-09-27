"""Current schedule comparisons. Historical schedule snapshots remain LF-09."""
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone


def calculate(metric, rows, offerings, start, end, zone, basis, documents=None):
    from appointment.scheduler.analytics import _working_minutes, _merge_intervals, _utilization
    keys = ['available_hours', 'unused_hours', 'schedule_gaps', 'fragmentation', 'buffer_share', 'capacity_adjusted_popularity', 'no_availability_days','provider_utilization','location_utilization','service_utilization']
    if basis != 'appointment':
        for key in keys:
            metric(key, None, 'Requires appointment-date scope and current schedules. Historical snapshots unavailable (LF-09).', known=0, eligible=1)
        return
    windows = _working_minutes(offerings, start, end, zone, return_intervals=True,documents=documents)
    occupied = defaultdict(list)
    for row in rows:
        if row.status in {'Pending', 'Confirmed', 'Completed', 'No Show'} and row.occupied_from and row.occupied_until:
            occupied[row.provider].append((row.occupied_from, row.occupied_until))
    free, available, used = [], 0, 0
    for provider, intervals in windows.items():
        for opened, closed in _merge_intervals(intervals):
            available += (closed-opened).total_seconds()/3600
            cursor = opened
            for a, b in _merge_intervals(occupied[provider]):
                if b <= opened or a >= closed:
                    continue
                if a > cursor:
                    free.append((provider, cursor, min(a, closed)))
                used += (min(b, closed)-max(a, opened)).total_seconds()/3600
                cursor = max(cursor, min(b, closed))
            if cursor < closed:
                free.append((provider, cursor, closed))
    metric('available_hours', round(available, 2), 'Union of current eligible working windows by provider. Historical denominator is a current-schedule estimate (LF-09).', 'hours')
    metric('unused_hours', round(sum((b-a).total_seconds()/3600 for provider, a, b in free), 2), 'Current working windows minus recorded occupied intervals. Calendar blocks are not subtracted; future bookable slots use canonical conflicts.', 'hours')
    metric('schedule_gaps', len(free), 'Contiguous unoccupied parts of current working windows. Includes opening/closing edges. Calendar blocks excluded.', 'gaps')
    metric('fragmentation', sum((b-a).total_seconds()<1800 for provider, a, b in free), 'Current schedule gaps shorter than 30 minutes. Fixed review rule, not evidence a service fits.', 'gaps')
    metric('capacity_adjusted_popularity', round(used/available*100, 1) if available else None, 'Recorded occupied hours inside current working windows / available current working hours. Outside-window time excluded. LF-09 historical limitation.', '%', known=int(available>0), eligible=1)
    providers = {row.provider for row in offerings}
    available_days = set()
    for provider, intervals in windows.items():
        for a, b in intervals:
            day = a.replace(tzinfo=timezone.utc).astimezone(zone).date()
            while day <= (b-timedelta(microseconds=1)).replace(tzinfo=timezone.utc).astimezone(zone).date():
                available_days.add((provider, day))
                day += timedelta(days=1)
    metric('no_availability_days', len(providers)*((end-start).days+1)-len(available_days), 'Provider-days without an eligible current working window among active scoped offerings.', 'provider-days')
    scheduled, buffered = 0, 0
    for provider in providers:
        selected = [row for row in rows if row.provider == provider and start<=row.appointment_date<=end and row.status in {'Pending','Confirmed','Completed','No Show'}]
        buffered += sum((b-a).total_seconds() for a,b in _merge_intervals([(row.occupied_from,row.occupied_until) for row in selected if row.occupied_from and row.occupied_until]))
        scheduled += sum((b-a).total_seconds() for a,b in _merge_intervals([(row.starts_at,row.ends_at) for row in selected if row.starts_at and row.ends_at and row.occupied_from]))
    metric('buffer_share', round((buffered-scheduled)/buffered*100, 1) if buffered else None, 'Recorded occupied union minus scheduled union / occupied union, by provider. Missing historical intervals excluded.', '%', known=sum(bool(row.occupied_from and row.occupied_until) for row in rows if start<=row.appointment_date<=end), eligible=sum(start<=row.appointment_date<=end for row in rows) or 1)
    for dimension in ('provider','location','service'):
        data = []
        for identity in sorted({row.get(dimension) for row in offerings}):
            result = _utilization([row for row in rows if row.get(dimension)==identity], [row for row in offerings if row.get(dimension)==identity], start, end, zone, {}, documents)
            data.append(dict(name=identity, count=result['rate'], numerator=result['booked_minutes'], denominator=result['capacity_minutes'],denominator_unit='minutes'))
        valid = [row for row in data if row['count'] is not None]
        denominator = sum(row['denominator'] for row in valid)
        numerator = sum(row['numerator'] for row in valid)
        metric(dimension+'_utilization', round(numerator/denominator*100,1) if denominator else None, 'Occupied provider interval union / current eligible working windows within each category. Category schedules can overlap; rates are not additive. Historical snapshots unavailable (LF-09).', '%', data=valid, known=len(valid), eligible=len(data) or 1)
