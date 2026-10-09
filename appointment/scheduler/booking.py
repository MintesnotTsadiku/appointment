"""One transaction-owned booking authority. Instants in UTC; hours in location time."""

import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import frappe
import pytz
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, get_datetime, get_time, getdate

from appointment.scheduler import customer_identity, notifications, resources
from appointment.scheduler.booking_access import require_access

_PUBLIC_CREATE = object()
# Set by self_service.py on a booking whose manage link it has verified.
CUSTOMER_CHANGE = object()
# Set by payments.py when a verified payment confirms or an unpaid hold expires.
PAYMENT_CHANGE = object()

ACTIVE = ("Pending", "Confirmed", "Completed", "No Show")


class ResolvedOffering(NamedTuple):
    event: object
    service: object
    location: object
    provider: object
    business: object


def offering(name, public=False, require_active=True, documents=None):
    def resolve(doctype, identity):
        if documents is None:
            return frappe.get_doc(doctype, identity)
        key = (doctype, identity)
        if key not in documents:
            documents[key] = frappe.get_doc(doctype, identity)
        return documents[key]
    event = resolve("EventType", name)
    service = resolve("Service", event.service)
    location = resolve("Location", event.location)
    org = service.organization
    if not event.provider:
        return _resource_offering(event, service, location, org, public, require_active)
    provider = resolve("Provider", event.provider)
    if org and (
        service.get("independent_provider")
        or location.get("independent_provider")
        or location.organization != org
        or (
            require_active
            and not frappe.db.exists(
                "Provider Organization",
                {
                    "parent": provider.name,
                    "parenttype": "Provider",
                    "organization": org,
                    "status": "Active",
                    **({"accept_org_bookings": 1} if public else {}),
                },
            )
        )
    ):
        frappe.throw(_("Offering must belong to one business."), frappe.PermissionError)
    if org:
        business = resolve("Organization", org)
    else:
        from appointment.scheduler.independent import matches

        if not matches(service, location, provider):
            frappe.throw(_("Offering must belong to one independent business."), frappe.PermissionError)
        business = provider
    if require_active and not all(
        (event.is_active, service.is_active, location.is_active, provider.is_active, business.is_active)
    ):
        frappe.throw(_("This offering is unavailable."))
    if public and not business.enable_public_booking:
        frappe.throw(_("Public booking is unavailable."), frappe.PermissionError)
    if not provider.user:
        frappe.throw(_("The provider needs a linked user."))
    if require_active and not frappe.db.get_value("User", provider.user, "enabled"):
        frappe.throw(_("This provider is unavailable."))
    return ResolvedOffering(event, service, location, provider, business)


def _resource_offering(event, service, location, org, public, require_active):
    """An offering booked without staff: its resource takes the provider's place; `provider` is None."""
    resource = frappe.db.get_value("Resource", event.resource, ["organization", "location", "is_active"], as_dict=True) if event.resource else None
    if not org or location.organization != org or not service.resource_only or not resource or resource.organization != org or resource.location != location.name:
        frappe.throw(_("Offering must belong to one business."), frappe.PermissionError)
    business = frappe.get_doc("Organization", org)
    if require_active and not all((event.is_active, service.is_active, location.is_active, resource.is_active, business.is_active)):
        frappe.throw(_("This offering is unavailable."))
    if public and not business.enable_public_booking:
        frappe.throw(_("Public booking is unavailable."), frappe.PermissionError)
    return ResolvedOffering(event, service, location, None, business)


def quantity_for(service, value):
    """How many (party size, seats) a booking is for: 1 unless the service lets customers choose, up to its maximum."""
    quantity = cint(value) or 1
    if quantity < 1:
        frappe.throw(_("Choose at least one."))
    if quantity > 1 and not service.get("allow_quantity"):
        frappe.throw(_("This service is booked for one at a time."))
    most = max(1, cint(service.get("max_quantity")) or 1)
    if quantity > most:
        frappe.throw(_("This service takes at most {0} per booking.").format(most))
    return quantity


def lock_offering(parts):
    """The booking's lock anchor: the provider's user, or the resource of a resource-only offering."""
    if parts.provider:
        lock_provider(parts.provider)
    else:
        frappe.db.sql("select name from `tabResource` where name=%s for update", parts.event.resource)


def utc(value):
    value = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if value.tzinfo is None:
        frappe.throw(_("An explicit time zone offset is required."))
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def local_instant(day, value, zone):
    # Reject ambiguous/nonexistent wall times rather than choosing a DST fold silently.
    try:
        return (
            pytz.timezone(zone)
            .localize(datetime.combine(getdate(day), get_time(value)), is_dst=None)
            .astimezone(pytz.UTC)
            .replace(tzinfo=None)
        )
    except (pytz.AmbiguousTimeError, pytz.NonExistentTimeError, pytz.UnknownTimeZoneError):
        frappe.throw(_("This local time is ambiguous or unavailable. Choose another time."))


def lock_provider(provider):
    # A User may have provider records in multiple businesses. Lock that shared
    # capacity identity, not a location or exact interval. Held until commit/rollback.
    frappe.db.sql("select name from `tabUser` where name=%s for update", provider.user)


def effective_hours(service, location, provider, day):
    from appointment.scheduler.availability import _get_opening_hours_list, _intersect_time_ranges

    if any(getdate(h.holiday_date) == getdate(day) for h in location.holidays):
        return []
    weekday = getdate(day).strftime("%A")
    result = []
    for doc in (location, service, provider):
        if doc is None:
            continue  # A resource-only offering has no provider hours.
        if doc != location and doc.use_default_hours:
            continue
        rows = [r for r in doc.opening_hours if r.day_of_week == weekday]
        # Explicit closed rows win; a custom empty schedule is closed, not inherited.
        current = [] if any(not r.is_open for r in rows) else _get_opening_hours_list(rows)
        result = current if doc == location else _intersect_time_ranges(result, current)
    return result


def check_hours(parts, start, end):
    event, service, location, provider, business = parts
    zone = location.timezone
    local_start = pytz.UTC.localize(start).astimezone(pytz.timezone(zone))
    local_end = pytz.UTC.localize(end).astimezone(pytz.timezone(zone))
    duration = int(event.duration_override or service.duration)
    if duration <= 0 or end - start != timedelta(minutes=duration):
        frappe.throw(_("Booking duration does not match the offering."))
    notice = max(int(provider.minimum_booking_notice or 0) if provider else 0, int(business.minimum_booking_notice or 0))
    if start < datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=notice):
        frappe.throw(_("This time is too soon to book."))
    if local_start.date() != local_end.date():
        frappe.throw(_("The booking must fit within one local operating day."))
    before, after = int(service.buffer_before or 0), int(service.buffer_after or 0)
    if before < 0 or after < 0:
        frappe.throw(_("Booking buffers cannot be negative."))
    occupied_from, occupied_until = start - timedelta(minutes=before), end + timedelta(minutes=after)
    fits = any(
        occupied_from >= local_instant(local_start.date(), h["start_time"], zone)
        and occupied_until <= local_instant(local_start.date(), h["end_time"], zone)
        for h in effective_hours(service, location, provider, local_start.date())
    )
    if not fits:
        frappe.throw(_("This time is outside effective opening hours."))
    return local_start, local_end, occupied_from, occupied_until


def check_canonical_capacity(user, start, end, exclude=None, lock=True):
    conflicts = frappe.db.sql(
        f"""select a.name from `tabAppointment` a
        inner join `tabProvider` p on p.name=a.provider
        where p.user=%s and a.status in %s
        and a.occupied_from < %s and a.occupied_until > %s and a.name != %s
        limit 1{" for update" if lock else ""}""",
        (user, ACTIVE, end, start, exclude or ""),
    )
    if conflicts:
        frappe.throw(_("This time is no longer available."))


def check_capacity(provider, start, end, exclude=None, lock=True):
    # Locking read sees the latest committed result even under repeatable read.
    # Slot listing passes lock=False: it only reads, and must not wait on bookings in progress.
    check_canonical_capacity(provider.user, start, end, exclude, lock=lock)
    # Retained personal/calendar behavior must not bypass the same person's capacity.
    zone = frappe.utils.get_system_timezone()
    system_start = pytz.UTC.localize(start).astimezone(pytz.timezone(zone)).replace(tzinfo=None)
    system_end = pytz.UTC.localize(end).astimezone(pytz.timezone(zone)).replace(tzinfo=None)
    events = frappe.db.sql(
        f"""select e.name from `tabBooking Event` e
        left join `tabUser Appointment Availability` u on u.name=e.custom_user_calendar
        where (u.user=%s or exists (select 1 from `tabMembers` m
          inner join `tabUser Appointment Availability` member_calendar on member_calendar.name=m.user
          where m.parent=e.custom_appointment_group and m.parenttype='Appointment Group' and member_calendar.user=%s))
        and e.status != 'Cancelled' and e.starts_on < %s and e.ends_on > %s
        limit 1{" for update" if lock else ""}""",
        (provider.user, provider.user, system_end, system_start),
    )
    if events:
        frappe.throw(_("This time is no longer available."))


def validate_document(doc):
    old = doc.get_doc_before_save()
    public = doc.flags.public_booking is _PUBLIC_CREATE and doc.is_new()
    # A customer change through a verified manage link (self_service.py) skips only the staff access check.
    customer = doc.flags.customer_change is CUSTOMER_CHANGE and bool(old)
    payment = doc.flags.payment_change is PAYMENT_CHANGE and bool(old)
    parts = offering(doc.event_type, public=public, require_active=not bool(old))
    _event, service, location, provider, business = parts
    for field, expected in [("service", service.name), ("provider", provider.name if provider else None), ("location", location.name)]:
        if (doc.get(field) or None) != expected:
            frappe.throw(_("Booking links must match the offering."), frappe.PermissionError)
    if doc.organization and doc.organization != service.organization:
        frappe.throw(_("Booking business does not match the offering."), frappe.PermissionError)
    doc.organization = service.organization
    if old:
        if not (customer or payment):
            require_access(old)
        for field in (
            "organization",
            "provider",
            "service",
            "location",
            "event_type",
            "request_key",
            "request_hash",
            "request_result",
        ):
            if (doc.get(field) or None) != (old.get(field) or None):
                frappe.throw(_("Change the booking through its authorized lifecycle; ownership is immutable."))
    if not public and not customer and not payment:
        require_access(doc)
    lock_offering(parts)
    if old:
        current = frappe.db.sql("select modified from `tabAppointment` where name=%s for update", doc.name)
        if current and str(current[0][0]) != str(old.modified):
            frappe.throw(_("This booking changed. Reload before editing."), frappe.TimestampMismatchError)
    # Existing bookings retain their recorded wall-time zone across configuration edits.
    zone = old.booking_timezone if old else location.timezone
    location.timezone = zone
    start = local_instant(doc.appointment_date, doc.start_time, zone)
    end = local_instant(doc.appointment_date, doc.end_time, zone)
    time_changed = not old or any(
        str(doc.get(f)) != str(old.get(f)) for f in ("appointment_date", "start_time", "end_time")
    )
    if time_changed or (old and old.status == "Cancelled" and doc.status != "Cancelled"):
        if not all(
            (parts.event.is_active, service.is_active, location.is_active, not provider or provider.is_active, business.is_active)
        ):
            frappe.throw(_("This offering is unavailable for a new time."))
        offering(doc.event_type)  # Recheck active membership/user for time changes.
        _local_start, _local_end, occupied_from, occupied_until = check_hours(parts, start, end)
    else:
        start, end = old.starts_at, old.ends_at
        occupied_from, occupied_until = old.occupied_from, old.occupied_until
    doc.quantity = quantity_for(service, doc.get("quantity"))
    doc.starts_at, doc.ends_at = start, end
    doc.occupied_from, doc.occupied_until = occupied_from, occupied_until
    doc.booking_timezone = zone
    time_moved = old and str(get_datetime(start)) != str(get_datetime(old.starts_at))
    # Paying confirms a held booking; its manage link stays valid.
    paid = old and old.status == "Pending" and doc.status == "Confirmed"
    if old and (time_moved or (doc.status != old.status and not paid)):
        # A new time or status retires earlier manage links.
        doc.manage_version = cint(old.manage_version) + 1
        if not payment:
            doc.last_changed_by = "Customer" if customer else "Staff"
    if doc.status in ACTIVE:
        if provider:
            check_capacity(provider, occupied_from, occupied_until, doc.name)
        # Rooms and equipment: strict when the booking takes a new time or a staff choice.
        reactivated = old and old.status not in ACTIVE
        quantity_changed = old and cint(old.get("quantity") or 1) != cint(doc.quantity)
        strict = bool(not old or time_changed or reactivated or doc.flags.resource_choice or quantity_changed)
        resources.allocate(doc, service, location, occupied_from, occupied_until, strict=strict, only=parts.event.resource)
    _validate_contact(doc, public)
    if doc.is_new() or not doc.customer:
        customer_identity.resolve_for_booking(doc)


def _validate_contact(doc, public):
    """Name always. Email for public bookings, which confirm by email; optional for staff."""
    doc.client_name = (doc.client_name or "").strip()
    if not doc.client_name:
        frappe.throw(_("A customer name is required."))
    if public and not doc.client_email:
        frappe.throw(_("Customer name and email are required."))
    if doc.client_email:
        frappe.utils.validate_email_address(doc.client_email, throw=True)


def creation_history(doc):
    frappe.get_doc(
        dict(
            doctype="Version",
            ref_doctype="Appointment",
            docname=doc.name,
            data=json.dumps(
                {
                    "operation": "created",
                    "actor": frappe.session.user,
                    "organization": doc.organization,
                    "booking": doc.name,
                    "values": {
                        key: str(doc.get(key) or "")
                        for key in (
                            "event_type",
                            "provider",
                            "location",
                            "service",
                            "starts_at",
                            "ends_at",
                            "status",
                            "client_name",
                            "client_email",
                        )
                    },
                }
            ),
        )
    ).insert(ignore_permissions=True)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=60, seconds=60, methods=["POST"])
def book(
    offering_id,
    start_time,
    end_time,
    user_name,
    user_email,
    request_id,
    user_phone="",
    notes="",
    organization_id=None,
    language=None,
    payment_method=None,
    quantity=1,
    referral_source="",
    referral_code="",
):
    if not re.fullmatch(r"[A-Za-z0-9_-]{16,100}", request_id or ""):
        frappe.throw(_("A valid booking request identity is required."))
    if any(not isinstance(value, str) or len(value)>140 for value in (referral_source, referral_code)):
        frappe.throw(_("Referral values must be text of at most 140 characters."))
    event = frappe.get_doc("EventType", offering_id)
    business_name = frappe.db.get_value("Service", event.service, "organization") or ("Provider:" + event.provider)
    if organization_id and organization_id != business_name:
        frappe.throw(_("Offering does not belong to this business."), frappe.PermissionError)
    start, end = utc(start_time), utc(end_time)
    payload = dict(
        offering=event.name,
        start=start.isoformat(),
        end=end.isoformat(),
        name=user_name,
        email=user_email,
        phone=user_phone or "",
        notes=notes or "",
        **({"quantity": cint(quantity)} if cint(quantity) > 1 else {}),
    )
    if referral_source or referral_code:
        payload.update(referral_source=referral_source,referral_code=referral_code)
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    key = hashlib.sha256((business_name + "\0" + frappe.session.user + "\0" + request_id).encode()).hexdigest()
    if event.provider:
        lock_provider(frappe.get_doc("Provider", event.provider))
    else:
        frappe.db.sql("select name from `tabResource` where name=%s for update", event.resource)
    existing = frappe.db.sql(
        "select name, request_hash, request_result from `tabAppointment` where request_key=%s for update",
        key,
        as_dict=True,
    )
    if existing:
        if existing[0].request_hash != digest:
            frappe.throw(_("This request identity was already used for different booking details."))
        return json.loads(existing[0].request_result)
    parts = offering(offering_id, public=True)
    event, service, location, provider, business = parts
    zone = pytz.timezone(location.timezone)
    local_start, local_end = (pytz.UTC.localize(x).astimezone(zone) for x in (start, end))
    reference = "APT-" + frappe.generate_hash(length=20)
    result = dict(success=True, booking_id=reference, message=_("Booking confirmed."), notification_status="not_sent")
    doc = frappe.get_doc(
        dict(
            doctype="Appointment",
            appointment_id=reference,
            organization=service.organization,
            event_type=event.name,
            service=service.name,
            provider=provider.name if provider else None,
            location=location.name,
            appointment_date=local_start.date(),
            start_time=local_start.time().replace(tzinfo=None),
            end_time=local_end.time().replace(tzinfo=None),
            client_name=user_name,
            client_email=user_email,
            client_phone=user_phone,
            customer_language=language if language in ("en", "am") else None,
            notes=notes,
            quantity=cint(quantity) or 1,
            status="Confirmed",
            request_key=key,
            request_hash=digest,
            request_result=json.dumps(result),
        )
    )
    # This narrow server-owned flag authorizes only public creation of the fully
    # resolved offering. The controller still enforces ownership/hours/capacity.
    doc.flags.analytics_terms = dict(source="online", referral_source=referral_source, referral_code=referral_code)
    doc.flags.public_booking = _PUBLIC_CREATE
    from appointment.scheduler import payments, self_service

    quote = payments.prepare_booking(doc, payment_method)
    doc.insert(ignore_permissions=True)
    if quote:
        payment = payments.create_for_booking(doc, payment_method, quote)
        result.update(
            status="Pending",
            message=_("Booking held until payment."),
            payment=payments.public_view(payment),
            manage_path=self_service.manage_url(doc).replace(frappe.utils.get_url(), ""),
        )
    result["notification_status"] = notifications.status_of(doc)
    frappe.db.set_value("Appointment", doc.name, "request_result", json.dumps(result), update_modified=False)
    return result


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=120, seconds=60)
def slots(offering_id, date, organization_id=None, quantity=1):
    parts = offering(offering_id, public=True)
    event, service, location, provider, business = parts
    quantity = quantity_for(service, quantity)
    if organization_id and business.name != organization_id:
        frappe.throw(_("Offering does not belong to this business."), frappe.PermissionError)
    day = getdate(date)
    if not 0 <= (day - datetime.now().date()).days <= 366:
        frappe.throw(_("Choose a date within the next year."))
    duration = int(event.duration_override or service.duration)
    if duration <= 0:
        frappe.throw(_("The offering duration is invalid."))
    result = []
    wanted = resources.needs(service)
    # A resource-only offering shows its resource where a provider would be.
    label_id, label_name = (provider.name, provider.provider_name) if provider else (
        event.resource, frappe.db.get_value("Resource", event.resource, "resource_name"))
    for h in effective_hours(service, location, provider, day):
        start = local_instant(day, h["start_time"], location.timezone) + timedelta(
            minutes=int(service.buffer_before or 0)
        )
        finish = local_instant(day, h["end_time"], location.timezone)
        while start + timedelta(minutes=duration) <= finish:
            end = start + timedelta(minutes=duration)
            available = True
            try:
                _local_start, _local_end, begin, stop = check_hours(parts, start, end)
                if provider:
                    check_capacity(provider, begin, stop, lock=False)
                if wanted and not resources.available(wanted, location.name, business.name, begin, stop, only=event.resource, quantity=quantity):
                    available = False
            except frappe.ValidationError:
                frappe.clear_messages()
                available = False
            result.append(
                dict(
                    start_time=start.isoformat() + "Z",
                    end_time=end.isoformat() + "Z",
                    provider_id=label_id,
                    provider_name=label_name,
                    available=available,
                    booked=not available,
                )
            )
            start = end
    return dict(
        all_available_slots_for_data=result,
        available_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        valid_start_date=datetime.now().date().isoformat(),
        duration=duration,
        total_slots_for_day=len(result),
    )


@frappe.whitelist()
def history(booking_id):
    doc = frappe.get_doc("Appointment", booking_id)
    require_access(doc)
    return frappe.get_all(
        "Version",
        filters={"ref_doctype": "Appointment", "docname": doc.name},
        fields=["name", "owner", "creation", "data"],
        order_by="creation asc",
    )


def guard_calendar_capacity(doc, method=None):
    """Retained personal/group calendar writes share canonical provider capacity."""
    if not doc.starts_on or not doc.ends_on or doc.status == "Cancelled":
        return
    calendars = [doc.custom_user_calendar] if doc.custom_user_calendar else []
    if doc.custom_appointment_group:
        calendars.extend(
            frappe.get_all(
                "Members",
                filters={"parent": doc.custom_appointment_group, "parenttype": "Appointment Group"},
                pluck="user",
            )
        )
    users = sorted(
        set(frappe.db.get_value("User Appointment Availability", name, "user") for name in calendars) - {None}
    )
    zone = pytz.timezone(frappe.utils.get_system_timezone())
    start = (
        zone.localize(frappe.utils.get_datetime(doc.starts_on), is_dst=None).astimezone(pytz.UTC).replace(tzinfo=None)
    )
    end = zone.localize(frappe.utils.get_datetime(doc.ends_on), is_dst=None).astimezone(pytz.UTC).replace(tzinfo=None)
    for user in users:
        lock_provider(frappe._dict(user=user))
        check_canonical_capacity(user, start, end)


@frappe.whitelist(methods=["POST"])
def change(booking_id, action, expected_modified, date=None, start_time=None, reason=None):
    """Staff lifecycle command; preserves identity, checks stale edits, records Version."""
    doc = frappe.get_doc("Appointment", booking_id)
    require_access(doc)
    if doc.provider:
        lock_provider(frappe.get_doc("Provider", doc.provider))
    else:
        frappe.db.sql("select name from `tabResource` where name=%s for update", frappe.db.get_value("EventType", doc.event_type, "resource"))
    doc.reload()
    require_access(doc)
    if str(doc.modified) != str(expected_modified):
        frappe.throw(_("This booking changed. Reload before editing."), frappe.TimestampMismatchError)
    if doc.status not in ("Pending", "Confirmed"):
        frappe.throw(_("Only pending or confirmed bookings can be changed."))
    if reason is not None and (not isinstance(reason,str) or len(reason)>500):
        frappe.throw(_("Enter a reason of at most 500 characters."))
    doc.flags.analytics_reason=reason or ""
    if action == "cancel":
        doc.status = "Cancelled"
        if reason is not None:doc.cancellation_reason=reason
    elif action == "reschedule":
        if not date or not start_time:
            frappe.throw(_("Choose a date and start time."))
        duration = frappe.utils.get_datetime(doc.ends_at) - frappe.utils.get_datetime(doc.starts_at)
        start = local_instant(date, start_time, doc.booking_timezone)
        end = pytz.UTC.localize(start + duration).astimezone(pytz.timezone(doc.booking_timezone))
        if end.date() != getdate(date):
            frappe.throw(_("The booking must fit within one operating day."))
        doc.appointment_date, doc.start_time, doc.end_time = date, start_time, end.time().replace(tzinfo=None)
    else:
        frappe.throw(_("Choose reschedule or cancel."))
    doc.save(ignore_permissions=True)
    return {
        "booking_id": doc.name,
        "status": doc.status,
        "modified": str(doc.modified),
        "notification_status": notifications.status_of(doc),
    }
