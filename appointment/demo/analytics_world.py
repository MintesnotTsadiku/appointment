"""Synthetic analytics scenarios, restricted to the explicit showcase ownership journal."""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import frappe

VERSION = 6
SOURCES = ("online", "staff", "walk-in", "import")


def configure(state, fresh=False):
    from appointment.demo import showcase

    previous_world = state.get('analytics_world', {})
    if previous_world.get('version') == VERSION:
        previous_world.setdefault('booking_modified', {name:str(frappe.db.get_value('Appointment',name,'modified')) for name in state['appointments']})
        return False
    owned = {tuple(entry) for entry in state["created"]}
    businesses = state["businesses"]
    organizations = {business["organization"] for business in businesses.values()}
    names = state["appointments"]
    eligible = []
    for index, name in enumerate(names):
        if ("Appointment", name) not in owned:
            frappe.throw("Analytics scenarios require exact journal-owned appointments.")
        row = frappe.get_doc("Appointment", name)
        if row.organization not in organizations:
            frappe.throw("Refusing to change an appointment outside the fictional showcase scenario.")
        business = next(value for value in businesses.values() if value["organization"] == row.organization)
        expected = hashlib.sha256((row.organization + "\0" + business["owner"] + "\0" + f"rich-demo-v1-booking-{index:06}").encode()).hexdigest()
        if row.request_key == expected and row.client_email.endswith("@example.test"):
            eligible.append((index, name))
    cohort_count = historical_bookings(state)
    counts = {"appointments": 0, "providers": set(), "walk_ins": 0}
    for index, name in eligible:
        row = frappe.get_doc("Appointment", name)
        # Preserve edits that do not produce a booking lifecycle event, such as recorded amounts.
        previous_modified = previous_world.get('booking_modified', {}).get(name)
        if previous_modified is not None and str(row.modified) != previous_modified:
            continue
        # Committed browser actions must survive later demo upgrades.
        if row.workflow_events and not fresh and not all(event.get("synthetic_demo") for event in json.loads(row.workflow_events)):
            continue
        values = appointment_values(row, index, row.name in state["rescheduled"])
        frappe.db.set_value("Appointment", name, values, update_modified=False)
        counts["appointments"] += 1
        counts["providers"].add(row.provider)
    for business in businesses.values():
        frappe.set_user(business["owner"])
        for location in business["locations"]:
            if ("Location", location) not in owned:
                frappe.throw("Refusing to configure an unowned reception location.")
            from appointment.scheduler.reception_state import set_state
            if frappe.db.get_value("Location", location, "reception_state") not in {"Open", "Closed"}:
                set_state(location, "Open")
        counts["walk_ins"] += walk_ins(state, business)
    frappe.set_user("Administrator")
    state["analytics_world"] = {"version": VERSION, "synthetic": True,
                                "appointments": counts["appointments"], "cohort_bookings_added": cohort_count,
                                "providers": len(counts["providers"]), "walk_ins": counts["walk_ins"],
                                "booking_modified": {name:str(frappe.db.get_value('Appointment',name,'modified')) for name in state['appointments']},
                                "limitations": ["No visitor tracking", "No payment ledger", "No historical capacity snapshots"]}
    return True


def appointment_values(row, index, rescheduled=False):
    """Assign authored fictional facts, never a general historical backfill."""
    start, end = row.starts_at, row.ends_at
    created = start - timedelta(hours=(4, 28, 72, 192, 336)[index % 5])
    source = SOURCES[index % len(SOURCES)]
    price = float(frappe.db.get_value("Service", row.service, "price") or 0)
    stamp = lambda value: value.isoformat(sep=" ")
    events = []

    def event(kind, instant, previous, status, **details):
        events.append(dict(type=kind, timestamp=stamp(instant), actor=row.owner,
                           source=source, booking=row.name, previous_status=previous,
                           new_status=status, synthetic_demo=True,
                           idempotency_key=hashlib.sha256(f"demo-analytics-v{VERSION}:{row.name}:{len(events)}:{kind}".encode()).hexdigest(), **details))

    event("create", created, None, "Pending")
    confirmed = created + timedelta(minutes=(5, 20, 60)[index % 3])
    event("confirm", confirmed, "Pending", "Confirmed")
    system_zone = ZoneInfo(frappe.utils.get_system_timezone())
    values = dict(creation=created.replace(tzinfo=timezone.utc).astimezone(system_zone).replace(tzinfo=None),
                  booking_source=source, referral_source=("direct", "recommendation", "local-directory")[index % 3],
                  referral_code=("", "regular-client", "studio-listing")[index % 3],
                  agreed_price=price, agreed_currency="ETB", discount_amount=0,
                  price_basis="synthetic-demo-agreement", price_captured_at=created,
                  confirmed_at=confirmed, amount_paid=price if row.status == "Completed" and index % 4 else 0)
    if source == 'import':
        values.update(agreed_price=0, price_captured_at=None, price_basis='unknown-import')
    if rescheduled:
        before = {key: str(row.get(key)) for key in ('starts_at','ends_at','provider','location')}
        before.update(starts_at=str(start-timedelta(minutes=30)), ends_at=str(end-timedelta(minutes=30)))
        event('reschedule', confirmed+timedelta(hours=1), 'Confirmed', 'Confirmed', before=before,
              after={key:str(row.get(key)) for key in before}, reason='Fictional customer requested a later time')
    if row.status == "Cancelled":
        cancelled = max(confirmed+timedelta(minutes=15), start-timedelta(hours=(2, 12, 48)[index % 3]))
        event("cancel", cancelled, "Confirmed", "Cancelled", reason="Fictional customer schedule change")
        values.update(cancelled_at=cancelled, cancellation_reason="Fictional customer schedule change")
    elif row.status in {"Completed", "No Show"}:
        if row.status == "Completed":
            arrived = start + timedelta(minutes=(-8, -3, 0, 6)[index % 4])
            checked = arrived + timedelta(minutes=2)
            actual_start = max(start, checked) + timedelta(minutes=(0, 4, 9)[index % 3])
            actual_end = actual_start + (end - start) + timedelta(minutes=(-3, 0, 7)[index % 3])
            for kind, instant in [("arrive", arrived), ("check-in", checked), ("start", actual_start), ("end", actual_end)]:
                event(kind, instant, "Confirmed", "Confirmed")
            values.update(arrived_at=arrived, checked_in_at=checked, actual_start=actual_start, actual_end=actual_end)
            event("complete", actual_end + timedelta(minutes=2), "Confirmed", "Completed")
        else:
            event("no-show", end + timedelta(minutes=15), "Confirmed", "No Show")
    events.sort(key=lambda item: item["timestamp"])
    values["workflow_events"] = json.dumps(events)
    return values


def historical_bookings(state):
    from unittest.mock import patch
    from appointment.demo import showcase
    from appointment.scheduler import booking

    anchor = frappe.utils.getdate(state['anchor_date'])
    class HistoricalClock(datetime):
        @classmethod
        def now(cls, tz=None):
            instant = datetime.combine(anchor-timedelta(days=220), datetime.min.time()).replace(tzinfo=timezone.utc)
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    added = 0
    with patch.object(booking, 'datetime', HistoricalClock):
        for business in state['businesses'].values():
            frappe.set_user(business['owner'])
            for provider in business['providers']:
                offering = next(row for row in business['offerings'] if row['provider'] == provider)
                for index, offset in enumerate((180,150,120,100)):
                    day = anchor-timedelta(days=offset)
                    while day.strftime('%A') not in business['days']:
                        day += timedelta(days=1)
                    start = datetime.combine(day, datetime.min.time())+timedelta(hours=business['opens']+1)
                    end = start+timedelta(minutes=offering['duration'])
                    request = 'demo-cohort-'+hashlib.sha256(f"{provider}:{offset}".encode()).hexdigest()[:24]
                    key = hashlib.sha256((business['organization']+'\0'+business['owner']+'\0'+request).encode()).hexdigest()
                    existing = frappe.db.get_value('Appointment', {'request_key':key}, 'name')
                    if existing:
                        if ['Appointment',existing] not in state['created']:
                            frappe.throw('Refusing to adopt an unowned cohort booking.')
                        continue
                    result = booking.book(offering['id'], start.isoformat()+'+03:00', end.isoformat()+'+03:00',
                                          showcase.CLIENTS[0], 'guest1@example.test', request)
                    name = showcase.remember(state, 'Appointment', result['booking_id'])
                    row = frappe.get_doc('Appointment',name)
                    # The booking created this profile only when it is the profile's first booking.
                    if row.customer and frappe.db.count('Appointment', {'customer': row.customer}) == 1:
                        showcase.remember(state, 'Customer Profile', row.customer)
                    row.status='Completed'
                    row.save(ignore_permissions=True)
                    frappe.db.set_value('Appointment',name,appointment_values(row,index),update_modified=False)
                    state['appointments'].append(name)
                    added += 1
    frappe.set_user('Administrator')
    return added


def walk_ins(state, business):
    from appointment.demo import showcase

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    system_zone = ZoneInfo(frappe.utils.get_system_timezone())
    count = 0
    for index, provider in enumerate(business["providers"]):
        choices = [row for row in business["offerings"] if row["provider"] == provider]
        offering = choices[0]
        assigned = frappe.get_all("Appointment", filters={"name": ["in", state["appointments"]],
                    "provider": provider, "location": offering["location"], "status": "Completed"},
                    fields=["name", "client_name"], limit_page_length=1)
        for status in ("waiting", "assigned", "cancelled"):
            owned_walk_ins = [name for dt, name in state["created"] if dt == "Walk In"]
            existing = frappe.db.exists("Walk In", {"name": ["in", owned_walk_ins or [""]], "provider_preferred": provider,
                                          "client_email": f"walkin{index}.{status}@example.test", "notes": "Fictional analytics walkthrough scenario"})
            if existing:
                old = frappe.get_doc('Walk In', existing)
                if old.creation == old.modified:
                    walk_in_events(old, business['owner'])
                continue
            if status == "assigned" and not assigned:
                continue
            created = now - timedelta(minutes=15 + index * 6)
            doc = showcase.insert(state, dict(doctype="Walk In", client_name=f"Demo walk-in {index + 1} · {status}",
                     client_phone="0000000000", client_email=f"walkin{index}.{status}@example.test",
                     service_requested=offering["service"], location=offering["location"], provider_preferred=provider,
                     status=status, assigned_appointment=assigned[0].name if status == "assigned" else None,
                     created_at=created.replace(tzinfo=timezone.utc).astimezone(system_zone).replace(tzinfo=None),
                     notes="Fictional analytics walkthrough scenario"))
            if status == "assigned":
                frappe.db.set_value("Walk In", doc.name, "assigned_at", created + timedelta(minutes=8), update_modified=False)
            doc.reload()
            walk_in_events(doc, business['owner'])
            count += 1
    return count


def walk_in_events(doc, actor):
    zone = ZoneInfo(frappe.utils.get_system_timezone())
    created = doc.created_at.replace(tzinfo=zone).astimezone(timezone.utc).replace(tzinfo=None)
    values = {}
    if doc.status == 'assigned':
        appointment = frappe.get_doc('Appointment',doc.assigned_appointment)
        created = appointment.starts_at-timedelta(minutes=15)
        doc.assigned_at = created+timedelta(minutes=8)
        values.update(created_at=created.replace(tzinfo=timezone.utc).astimezone(zone).replace(tzinfo=None),
                      assigned_at=doc.assigned_at, client_name=appointment.client_name)
    events = [dict(type='waiting', timestamp=created.isoformat(sep=' '), actor=actor, walk_in=doc.name,
                   sequence=0, synthetic_demo=True)]
    if doc.status != 'waiting':
        timestamp = doc.assigned_at if doc.status == 'assigned' else created+timedelta(minutes=3)
        events.append(dict(type=doc.status, timestamp=timestamp.isoformat(sep=' '), actor=actor,
                           walk_in=doc.name, booking=doc.assigned_appointment, sequence=1, synthetic_demo=True))
    values['workflow_events']=json.dumps(events)
    frappe.db.set_value('Walk In', doc.name, values, update_modified=False)


def upgrade():
    """Explicit local command; retries preserve existing dashboard preferences and all unowned records."""
    from appointment.demo import showcase

    with showcase.locked():
        state = showcase.load_state()
        before = {tuple(entry) for entry in state['created']}
        changed = configure(state)
        for doctype, name in list(state['created']):
            if (doctype, name) not in before:
                for version in frappe.get_all('Version',filters={'ref_doctype':doctype,'docname':name},pluck='name'):
                    showcase.remember(state,'Version',version)
        showcase.write_state(state)
        frappe.db.commit()
        return {"changed": changed, **{("walk_ins_added" if key == "walk_ins" else key):value for key,value in state["analytics_world"].items() if key != "booking_modified"}}
