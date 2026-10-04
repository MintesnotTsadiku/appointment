"""Reconciled service, provider and location calculations over scoped records."""
from collections import Counter, defaultdict
from statistics import mean
from datetime import datetime,timezone


def calculate(metric,selected,current,prices,money):
    for dimension,key in [('service','services'),('provider','providers'),('location','locations')]:
        names={item.get('id'):item['name'] for item in current[key]}
        groups=defaultdict(list)
        for row in selected:groups[row.get(dimension)].append(row)
        eligible=[row for row in selected if row.status in {'Pending','Confirmed','Completed'}]
        hours=[]
        for identity,rows in groups.items():
            value=sum(max(0,(row.ends_at-row.starts_at).total_seconds()/3600) for row in rows if row.status in {'Pending','Confirmed','Completed'} and row.starts_at and row.ends_at)
            hours.append(dict(name=names.get(identity) or identity,count=round(value,3)))
        metric(dimension+'_scheduled_hours',round(sum(row['count'] for row in hours),3),'Sum of scheduled durations for Pending, Confirmed and Completed; buffers excluded. Ranks cover all categories.','hours',data=hours)
        for outcome in ('Completed','Cancelled','No Show'):
            data=[]
            denominator_rows=[row for row in selected if row.status in {'Completed','No Show'} and row.ends_at and row.ends_at<datetime.now(timezone.utc).replace(tzinfo=None)] if outcome=='No Show' else selected
            for identity in groups:
                denominator=[row for row in denominator_rows if row.get(dimension)==identity]
                numerator=sum(row.status==outcome for row in denominator)
                if denominator:data.append(dict(name=names.get(identity) or identity,count=round(numerator/len(denominator)*100,1),numerator=numerator,denominator=len(denominator)))
            numerator=sum(row.status==outcome for row in denominator_rows)
            definition='No Show / elapsed (Completed + No Show); cancelled and unresolved bookings excluded. Categories without a denominator omitted.' if outcome=='No Show' else outcome+' / all selected bookings, including future and unresolved.'
            metric(dimension+'_'+outcome.lower().replace(' ','_')+'_rate',round(numerator/len(denominator_rows)*100,1) if denominator_rows else None,definition+' Overall value is weighted; category rates are not additive.','%',data=data,known=len(denominator_rows),eligible=len(denominator_rows))
        durations=[dict(name=names.get(identity) or identity,count=round(mean((row.ends_at-row.starts_at).total_seconds()/60 for row in rows if row.starts_at and row.ends_at),1)) for identity,rows in groups.items() if any(row.starts_at and row.ends_at for row in rows)]
        metric(dimension+'_average_duration',round(mean((row.ends_at-row.starts_at).total_seconds()/60 for row in selected if row.starts_at and row.ends_at),1) if durations else None,'Mean scheduled duration by '+dimension+' for all selected latest states. Category averages are not additive.','minutes',data=durations,known=sum(bool(row.starts_at and row.ends_at) for row in selected))
        for metric_key,first,second in [('actual_duration','actual_start','actual_end'),('service_delay','starts_at','actual_start')]:
            data=[]
            for identity,rows in groups.items():
                values=[(row.get(second)-row.get(first)).total_seconds()/60 for row in rows if row.get(first) and row.get(second)]
                if values:data.append(dict(name=names.get(identity) or identity,count=round(mean(values),1)))
            values=[(row.get(second)-row.get(first)).total_seconds()/60 for row in selected if row.get(first) and row.get(second)]
            metric(dimension+'_'+metric_key,round(mean(values),1) if values else None,'Mean captured '+second+' minus '+first+' by '+dimension+'. Missing timestamps excluded.','minutes',data=data,known=len(values))
        if money:
            values=[dict(name=names.get(identity) or identity,count=round(sum(float(prices.get(row.service) or 0) for row in rows if row.status in {'Pending','Confirmed','Completed'}),2)) for identity,rows in groups.items()]
            metric(dimension+'_catalog_value',round(sum(row['count'] for row in values),2),'Current catalog estimate by category for Pending, Confirmed and Completed. Not original agreement or collections.','ETB',data=values)
    booked=[row for row in selected if row.status in {'Pending','Confirmed','Completed'}]
    shares=[dict(name=row['name'],count=round(row['count']/len(booked)*100,3),numerator=row['count'],denominator=len(booked)) for row in current['services']] if booked else []
    metric('service_share',100 if booked else None,'Eligible service bookings / all Pending, Confirmed and Completed bookings. Rounded category percentages can differ from 100 by rounding.','%',data=shares,known=len(booked),eligible=len(booked))
    trend=Counter((str(row.appointment_date),row.service) for row in booked)
    metric('service_trend',len(booked),'Eligible bookings by original appointment date and service among selected bookings. Category sum reconciles with eligible booking count.','bookings',data=[dict(name=f'{day} · {service}',count=count) for (day,service),count in sorted(trend.items())])
    usage=Counter((row.service,row.client_email.lower()) for row in booked if row.client_email)
    repeat=Counter(service for (service,email),count in usage.items() if count>1)
    metric('service_repeat_usage',sum(repeat.values()),'Email/service pairs with more than one eligible booking in period. One email can count in several services.','customer/service pairs',data=[dict(name=service,count=count) for service,count in repeat.items()])
    preferences=Counter()
    customers=defaultdict(Counter)
    for row in selected:
        if row.client_email and row.status in {'Pending','Confirmed','Completed'}:customers[row.client_email.lower()][row.service]+=1
    for counts in customers.values():
        peak=max(counts.values())
        preferences.update(service for service,count in counts.items() if count==peak)
    for dimension in ('provider','location'):
        choices=Counter()
        by_customer=defaultdict(Counter)
        for row in selected:
            if row.client_email and row.status in {'Pending','Confirmed','Completed'}:by_customer[row.client_email.lower()][row.get(dimension)]+=1
        for counts in by_customer.values():choices.update(identity for identity,count in counts.items() if count==max(counts.values()))
        metric('customer_'+dimension+'_preferences',sum(choices.values()),'Most frequently selected '+dimension+' per provisional email identity. Ties count each choice.','preferences',data=[dict(name=name,count=count) for name,count in choices.most_common()])
    metric('customer_preferences',sum(preferences.values()),'Most frequently selected service per email identity in period. Ties count each choice; count is preference assignments, not unique customers.','preferences',data=[dict(name=service,count=count) for service,count in preferences.most_common()])
    if money:
        eligible=[row for row in selected if row.status in {'Pending','Confirmed','Completed'}]
        values=[float(prices.get(row.service) or 0) for row in eligible]
        metric('average_estimate',round(mean(values),2) if values else None,'Mean current catalog price per Pending, Confirmed or Completed booking; not original agreed booking value.','ETB',known=len(values),eligible=len(values))
        for status,key in [('Cancelled','estimated_cancellation_loss'),('No Show','estimated_no_show_loss')]:
            metric(key,round(sum(float(prices.get(row.service) or 0) for row in selected if row.status==status),2),'Current catalog-price estimate for '+status+' bookings. Hypothetical value, not incurred loss, payments or debt.','ETB')
        future=[row for row in eligible if row.starts_at and row.starts_at>datetime.now(timezone.utc).replace(tzinfo=None)]
        metric('future_estimate',round(sum(float(prices.get(row.service) or 0) for row in future),2),'Current catalog estimate for future Pending/Confirmed/Completed bookings within the selected report scope. Not agreed value or payments.','ETB')
        metric('missing_payment_entries',sum(not row.amount_paid for row in selected),'Bookings with zero/default recorded amount. Cannot distinguish unpaid from missing entry; no balance inference.','bookings')
        metric('paid_customers',len({row.client_email.lower() for row in selected if row.client_email and row.amount_paid}),'Provisional email identities with a nonzero recorded amount. Not payment-date collections.','customers')
        captured=[row for row in selected if row.price_captured_at]
        metric('discount_usage',sum(bool(row.discount_amount or row.discount_code) for row in captured),'Bookings with a captured positive discount or discount code. Historical terms excluded.','bookings',known=len(captured))
