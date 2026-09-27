"""Email-based customer calculations with equal retention observation windows."""
from collections import Counter, defaultdict
from datetime import timedelta
from statistics import mean


def calculate(metric, selected, history, start, end, today, money):
    visits=defaultdict(list)
    for row in history:
        if row.client_email and row.status=='Completed' and row.appointment_date<=today:
            visits[row.client_email.lower()].append(row)
    for rows in visits.values():
        rows.sort(key=lambda row:row.appointment_date)
    identities={row.client_email.lower() for row in selected if row.client_email}
    intervals=[(second.appointment_date-first.appointment_date).days for email in identities for first,second in zip(visits[email],visits[email][1:])]
    metric('visit_interval',round(mean(intervals),1) if intervals else None,'Mean days between successive completed visits for email identities selected in period. Observed history only.','days',known=len(intervals),eligible=len(intervals))
    recency=[(today-visits[email][-1].appointment_date).days for email in identities if visits[email]]
    metric('days_since_visit',round(mean(recency),1) if recency else None,'Mean days since last completed visit, as of today. Email identities selected in period.','days',known=len(recency),eligible=len(identities))
    metric('lapse_risk',sum(days>=90 for days in recency),'Rule: no completed visit for at least 90 days, among selected email identities with a completed visit. Not a prediction.','customers',known=len(recency),eligible=len(identities))
    for window in (30,60,90):
        cohort={email:rows for email,rows in visits.items() if rows and start<=rows[0].appointment_date<=end and rows[0].appointment_date+timedelta(days=window)<=today}
        retained=sum(any(rows[0].appointment_date<row.appointment_date<=rows[0].appointment_date+timedelta(days=window) for row in rows[1:]) for rows in cohort.values())
        metric(f'retention_{window}',round(retained/len(cohort)*100,1) if cohort else None,f'Customers with a later completed visit within {window} days / first observed permitted completed visit cohort in period with full {window}-day observation. Ineligible immature cohorts excluded. Email identity.','%',known=len(cohort),eligible=len(cohort))
    cohort={email:rows for email,rows in visits.items() if rows and start<=rows[0].appointment_date<=end and rows[0].appointment_date+timedelta(days=90)<=today}
    converted=sum(len(rows)>1 and rows[1].appointment_date<=rows[0].appointment_date+timedelta(days=90) for rows in cohort.values())
    metric('second_visit_conversion',round(converted/len(cohort)*100,1) if cohort else None,'Second completed visit within 90 days / first observed permitted completed visit cohorts in period with a full 90-day observation window.','%',known=len(cohort),eligible=len(cohort))
    monthly=defaultdict(lambda:[0,0])
    for rows in cohort.values():
        key=rows[0].appointment_date.strftime('%Y-%m');monthly[key][0]+=1;monthly[key][1]+=int(len(rows)>1 and rows[1].appointment_date<=rows[0].appointment_date+timedelta(days=90))
    metric('cohorts',converted,'Mature first observed permitted completed visit cohorts; count shown is 90-day retained customers. Data table declares eligible cohort size.','customers',data=[dict(name=f'{key} · {values[0]} eligible',count=values[1],numerator=values[1],denominator=values[0],denominator_unit='customers') for key,values in sorted(monthly.items())],known=len(cohort),eligible=len(cohort))
    counts=Counter(row.client_email.lower() for row in selected if row.client_email)
    metric('booking_concentration',round(max(counts.values())/sum(counts.values())*100,1) if counts else None,'Largest email identity booking count / all selected bookings with email.','%',known=sum(counts.values()),eligible=len(selected))
    for status,key in [('Cancelled','customer_cancellation'),('No Show','customer_no_show')]:
        affected=Counter(row.client_email.lower() for row in selected if row.client_email and row.status==status)
        metric(key,len(affected),f'Email identities with at least one {status} booking in period; separate outcomes.','customers',data=[dict(name=f'{count} {status} bookings',count=number) for count,number in Counter(affected.values()).items()])
    phones=defaultdict(set)
    for row in selected:
        if row.client_phone and row.client_email:
            phones[''.join(char for char in row.client_phone if char.isdigit())].add(row.client_email.lower())
    metric('likely_duplicates',sum(len(emails)>1 for emails in phones.values()),'Phone digit groups associated with several emails in selected records. Review candidates, not resolved identities.','groups')
    metric('unmatched_customers',sum(not row.client_email for row in selected),'Selected records without provisional email identity.','bookings')
    if money:
        paid=defaultdict(float)
        for row in selected:
            if row.client_email:paid[row.client_email.lower()]+=float(row.amount_paid or 0)
        total=sum(paid.values())
        metric('payment_concentration',round(max(paid.values())/total*100,1) if total else None,'Largest email identity recorded amount / all positive recorded amounts. Not lifetime value or payment-date revenue.','%',known=sum(value>0 for value in paid.values()),eligible=len(paid))
        metric('payments_per_customer',round(total/len(paid),2) if paid else None,'Recorded amount on selected bookings / email identities. Missing entry cannot be distinguished from unpaid.','ETB',known=sum(value>0 for value in paid.values()),eligible=len(paid))
