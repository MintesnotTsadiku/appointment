"""Rooms and equipment: a booking also reserves one free resource of each kind its service needs.

`allocate` runs inside `booking.validate_document`, after the provider lock and
check, so every booking path (public, reception, walk-in, self-service,
payments) shares it. A resource is free when no active booking holds it over an
overlapping occupied interval and no block covers that time. Customers never
choose; staff may move a booking to another free resource of the same kind.
See docs/features/RESOURCE_CAPACITY_PLAN.md.
"""

import json
from datetime import datetime, timezone

import frappe
import pytz
from frappe import _
from frappe.utils import cint, get_datetime

from appointment.scheduler.booking_access import managed_organizations, receptionist_organizations, require_access

ACTIVE = ("Pending", "Confirmed", "Completed", "No Show")
# Set by `set_resource` when staff pick a specific resource for a booking.
STAFF_CHOICE = object()
LIST_LIMIT = 200


# ---------------------------------------------------------------------------
# Allocation
# ---------------------------------------------------------------------------
def needs(service):
    return [row for row in (service.get("resource_needs") or []) if row.resource_type]


def candidates(need, location, organization):
    """Resources that can satisfy one need at this location, in a stable order."""
    filters = {"organization": organization, "location": location, "resource_type": need.resource_type, "is_active": 1}
    if need.specific_resource:
        filters["name"] = need.specific_resource
    return frappe.get_all("Resource", filters=filters, pluck="name", order_by="resource_name asc, name asc")


def busy(names, start, end, exclude=None, lock=False):
    """The subset of `names` held by another active booking or blocked over [start, end)."""
    if not names:
        return set()
    suffix = " for update" if lock else ""
    held = frappe.db.sql(
        f"""select r.resource from `tabAppointment Resource` r
        inner join `tabAppointment` a on a.name = r.parent and r.parenttype = 'Appointment'
        where r.resource in %s and a.status in %s and a.name != %s
        and a.occupied_from < %s and a.occupied_until > %s{suffix}""",
        (tuple(names), ACTIVE, exclude or "", end, start),
    )
    blocked = frappe.db.sql(
        f"""select resource from `tabResource Block`
        where resource in %s and starts_at < %s and ends_at > %s{suffix}""",
        (tuple(names), end, start),
    )
    return {row[0] for row in held} | {row[0] for row in blocked}


def _lock(names):
    # Same order on every path: provider first (booking.lock_provider), then resources by name.
    if names:
        frappe.db.sql("select name from `tabResource` where name in %s order by name for update", (tuple(sorted(names)),))


def allocate(doc, service, location, start, end, strict=True):
    """Fill `doc.resources` for the service's needs.

    Strict (a new booking, a new time, a reactivation or a staff choice): every
    need must get a free resource, else the time is unavailable. Not strict (any
    other edit): keep current rows and fill missing needs only when a resource is
    free, so editing notes on an unassigned booking still works.
    """
    wanted = needs(service)
    if not wanted:
        doc.set("resources", [])
        return
    current = {row.resource_type: row.resource for row in doc.get("resources") or []}
    if not strict and set(current) == {need.resource_type for need in wanted}:
        return
    options = {need.resource_type: candidates(need, location.name, doc.organization) for need in wanted}
    every = sorted({name for names in options.values() for name in names})
    _lock(every)
    taken = busy(every, start, end, exclude=doc.name if not doc.is_new() else None, lock=True)
    chosen = doc.flags.resource_choice if doc.flags.resource_choice and doc.flags.resource_choice[0] is STAFF_CHOICE else None
    rows = []
    for need in wanted:
        names = options[need.resource_type]
        keep = current.get(need.resource_type)
        if not strict and keep:
            rows.append(dict(resource_type=need.resource_type, resource=keep))
            continue
        if chosen and chosen[1] == need.resource_type:
            if chosen[2] not in names or chosen[2] in taken:
                frappe.throw(_("This resource is not free at this time."))
            pick = chosen[2]
        elif keep in names and keep not in taken:
            pick = keep
        else:
            pick = next((name for name in names if name not in taken), None)
        if not pick:
            if strict:
                type_name = frappe.db.get_value("Resource Type", need.resource_type, "type_name")
                frappe.throw(_("This time is no longer available. No {0} is free.").format(type_name))
            continue
        rows.append(dict(resource_type=need.resource_type, resource=pick))
    doc.set("resources", rows)


def available(wanted, location, organization, start, end):
    """Read-only check for slot listing: every need has a free resource."""
    for need in wanted:
        names = candidates(need, location, organization)
        if not set(names) - busy(names, start, end):
            return False
    return True


def missing(doc, service=None):
    """Needed resource types this booking has no resource for."""
    service = service or frappe.get_cached_doc("Service", doc.service)
    have = {row.resource_type for row in doc.get("resources") or []}
    return [need.resource_type for need in needs(service) if need.resource_type not in have]


def _out_of_date(doc):
    """Missing a needed resource, or holding one the service no longer needs."""
    wanted = {need.resource_type for need in needs(frappe.get_cached_doc("Service", doc.service))}
    have = {row.resource_type for row in doc.get("resources") or []}
    return wanted != have


# ---------------------------------------------------------------------------
# Upcoming bookings
# ---------------------------------------------------------------------------
def _upcoming(organization, service=None):
    """Upcoming open bookings of services that need resources (or of one given service)."""
    services = [service] if service else frappe.get_all(
        "Service Resource Need", filters={"parenttype": "Service"}, pluck="parent", distinct=True
    )
    if not services:
        return []
    return frappe.get_all(
        "Appointment",
        filters={
            "organization": organization, "service": ["in", services], "status": ["in", ["Pending", "Confirmed"]],
            "occupied_until": [">", _utc_now()],
        },
        pluck="name", order_by="starts_at asc", limit=LIST_LIMIT,
    )


def assign_upcoming(organization, service=None):
    """Bring upcoming bookings in line with their service's needs, where resources are free.

    Returns the bookings still missing a resource.
    """
    for name in _upcoming(organization, service):
        doc = frappe.get_doc("Appointment", name)
        if _out_of_date(doc):
            doc.save(ignore_permissions=True)
    return unassigned_rows(organization, service)


def unassigned_rows(organization, service=None):
    rows = []
    for name in _upcoming(organization, service):
        doc = frappe.get_doc("Appointment", name)
        lacking = missing(doc)
        if lacking:
            rows.append(dict(
                booking=doc.name, reference=doc.appointment_id or doc.name, client_name=doc.client_name,
                service=doc.service, service_name=frappe.db.get_value("Service", doc.service, "service_name"),
                provider_name=frappe.db.get_value("Provider", doc.provider, "provider_name"),
                location=doc.location, starts_at=str(doc.starts_at), timezone=doc.booking_timezone,
                appointment_date=str(doc.appointment_date), start_time=str(doc.start_time),
                missing=[_type_name(t) for t in lacking],
            ))
    return rows


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------
def _require_manager(organization):
    if organization not in managed_organizations():
        frappe.throw(_("You cannot manage resources for this business."), frappe.PermissionError)


def _require_reader(organization):
    if organization not in managed_organizations() and organization not in receptionist_organizations():
        frappe.throw(_("You cannot view resources for this business."), frappe.PermissionError)


def _type_name(name):
    return frappe.db.get_value("Resource Type", name, "type_name") or name


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Settings APIs (owners and managers; reception reads)
# ---------------------------------------------------------------------------
@frappe.whitelist()
def overview(organization):
    _require_reader(organization)
    types = frappe.get_all("Resource Type", filters={"organization": organization}, fields=["name", "type_name", "is_active"], order_by="type_name asc")
    resources = frappe.get_all(
        "Resource", filters={"organization": organization},
        fields=["name", "resource_name", "resource_type", "location", "is_active", "notes"], order_by="resource_name asc",
    )
    locations = frappe.get_all("Location", filters={"organization": organization, "is_active": 1}, fields=["name", "location_name", "timezone"], order_by="location_name asc")
    now = _utc_now()
    blocks = frappe.get_all(
        "Resource Block", filters={"organization": organization, "ends_at": [">", now]},
        fields=["name", "resource", "starts_at", "ends_at", "reason"], order_by="starts_at asc",
    )
    zones = {row.name: row.timezone for row in locations}
    zone_of = {row.name: zones.get(row.location) or frappe.utils.get_system_timezone() for row in resources}
    for block in blocks:
        zone = pytz.timezone(zone_of.get(block.resource) or "UTC")
        block["local_start"] = _local(block.starts_at, zone)
        block["local_end"] = _local(block.ends_at, zone)
    used_by = {}
    for row in frappe.get_all("Service Resource Need", filters={"parenttype": "Service"}, fields=["parent", "resource_type"]):
        used_by.setdefault(row.resource_type, []).append(row.parent)
    titles = dict(frappe.get_all("Service", filters={"organization": organization}, fields=["name", "service_name"], as_list=True))
    for row in types:
        row["services"] = sorted(titles[s] for s in used_by.get(row.name, []) if s in titles)
    return dict(
        types=types, resources=resources, locations=locations, blocks=blocks,
        unassigned=unassigned_rows(organization), can_manage=organization in managed_organizations(),
    )


def _local(value, zone):
    return pytz.UTC.localize(get_datetime(value)).astimezone(zone).strftime("%Y-%m-%dT%H:%M")


@frappe.whitelist(methods=["POST"])
def save_type(organization, type_name, name=None, is_active=1):
    _require_manager(organization)
    type_name = (type_name or "").strip()
    doc = frappe.get_doc("Resource Type", name) if name else frappe.new_doc("Resource Type")
    if name and doc.organization != organization:
        frappe.throw(_("You cannot manage resources for this business."), frappe.PermissionError)
    doc.update(dict(organization=organization, type_name=type_name, is_active=cint(is_active)))
    doc.save(ignore_permissions=True)
    return dict(name=doc.name)


@frappe.whitelist(methods=["POST"])
def save_resource(organization, resource_name, resource_type, location, name=None, is_active=1, notes=None):
    """Create or edit a resource. Turning one off is refused while upcoming bookings hold it."""
    _require_manager(organization)
    doc = frappe.get_doc("Resource", name) if name else frappe.new_doc("Resource")
    if name and doc.organization != organization:
        frappe.throw(_("You cannot manage resources for this business."), frappe.PermissionError)
    moving = name and (doc.location != location or doc.resource_type != resource_type or (doc.is_active and not cint(is_active)))
    if moving:
        held = _holding(doc.name, _utc_now(), None)
        if held:
            return dict(ok=False, conflicts=held)
    doc.update(dict(
        organization=organization, resource_name=(resource_name or "").strip(), resource_type=resource_type,
        location=location, is_active=cint(is_active), notes=(notes or "").strip() or None,
    ))
    doc.save(ignore_permissions=True)
    return dict(ok=True, name=doc.name, unassigned=assign_upcoming(organization))


def _holding(resource, start, end):
    """Upcoming active bookings that hold this resource between start and end (end None: any time after start)."""
    end_clause = "and a.occupied_from < %(end)s" if end else ""
    rows = frappe.db.sql(
        f"""select a.name, a.appointment_id, a.client_name, a.appointment_date, a.start_time, a.service
        from `tabAppointment Resource` r inner join `tabAppointment` a on a.name = r.parent and r.parenttype = 'Appointment'
        where r.resource = %(resource)s and a.status in %(active)s and a.occupied_until > %(start)s {end_clause}
        order by a.starts_at limit 50""",
        dict(resource=resource, active=("Pending", "Confirmed"), start=start, end=end),
        as_dict=True,
    )
    return [dict(
        booking=row.name, reference=row.appointment_id or row.name, client_name=row.client_name,
        appointment_date=str(row.appointment_date), start_time=str(row.start_time),
        service_name=frappe.db.get_value("Service", row.service, "service_name"),
    ) for row in rows]


@frappe.whitelist(methods=["POST"])
def save_block(resource, start, end, reason=None):
    """Block a resource. `start` and `end` are wall times at the resource's location."""
    doc = frappe.get_doc("Resource", resource)
    _require_manager(doc.organization)
    zone = pytz.timezone(frappe.db.get_value("Location", doc.location, "timezone") or "UTC")
    begin, finish = (_utc_from_local(value, zone) for value in (start, end))
    if finish <= begin:
        frappe.throw(_("The block must end after it starts."))
    if finish <= _utc_now():
        frappe.throw(_("The block must end in the future."))
    held = _holding(doc.name, begin, finish)
    if held:
        return dict(ok=False, conflicts=held)
    frappe.db.sql("select name from `tabResource` where name=%s for update", doc.name)
    block = frappe.get_doc(dict(
        doctype="Resource Block", organization=doc.organization, resource=doc.name,
        starts_at=begin, ends_at=finish, reason=(reason or "").strip() or None,
    )).insert(ignore_permissions=True)
    return dict(ok=True, name=block.name)


def _utc_from_local(value, zone):
    try:
        naive = datetime.fromisoformat(str(value))
    except ValueError:
        frappe.throw(_("Enter a valid date and time."))
    if naive.tzinfo:
        return naive.astimezone(timezone.utc).replace(tzinfo=None)
    return zone.localize(naive).astimezone(pytz.UTC).replace(tzinfo=None)


@frappe.whitelist(methods=["POST"])
def delete_block(name):
    block = frappe.get_doc("Resource Block", name)
    _require_manager(block.organization)
    block.delete(ignore_permissions=True)
    return dict(ok=True, unassigned=assign_upcoming(block.organization))


@frappe.whitelist()
def get_service_needs(service):
    doc = frappe.get_doc("Service", service)
    _require_manager(doc.organization)
    return dict(
        needs=[dict(resource_type=row.resource_type, specific_resource=row.specific_resource) for row in needs(doc)],
        types=frappe.get_all("Resource Type", filters={"organization": doc.organization, "is_active": 1}, fields=["name", "type_name"], order_by="type_name asc"),
        resources=frappe.get_all("Resource", filters={"organization": doc.organization, "is_active": 1}, fields=["name", "resource_name", "resource_type", "location"], order_by="resource_name asc"),
        unassigned=unassigned_rows(doc.organization, doc.name),
    )


@frappe.whitelist(methods=["POST"])
def save_service_needs(service, needs=None):
    """Replace what a service needs, then assign upcoming bookings. Returns the ones left without a resource."""
    doc = frappe.get_doc("Service", service)
    _require_manager(doc.organization)
    rows = json.loads(needs) if isinstance(needs, str) else (needs or [])
    seen = set()
    cleaned = []
    for row in rows:
        kind = row.get("resource_type")
        if not kind or kind in seen:
            continue
        seen.add(kind)
        cleaned.append(dict(resource_type=kind, specific_resource=row.get("specific_resource") or None))
    doc.set("resource_needs", cleaned)
    _save_needs(doc)
    return dict(ok=True, unassigned=assign_upcoming(doc.organization, doc.name))


def _save_needs(service):
    """Save a service's needs without its booking-URL sync, which commits and does not depend on needs."""
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        service.save(ignore_permissions=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.clear_document_cache("Service", service.name)


def validate_service_needs(doc):
    """Called from Service.validate: needs stay inside the service's business."""
    seen = set()
    for row in doc.get("resource_needs") or []:
        if row.resource_type in seen:
            frappe.throw(_("List each resource type once."))
        seen.add(row.resource_type)
        if frappe.db.get_value("Resource Type", row.resource_type, "organization") != doc.organization:
            frappe.throw(_("Resource types must belong to this business."))
        if row.specific_resource and frappe.db.get_value("Resource", row.specific_resource, "resource_type") != row.resource_type:
            frappe.throw(_("The specific resource must be of the chosen type."))


# ---------------------------------------------------------------------------
# Reception
# ---------------------------------------------------------------------------
@frappe.whitelist()
def for_booking(booking):
    """What the booking holds, what it misses, and the free alternatives for each need."""
    doc = frappe.get_doc("Appointment", booking)
    require_access(doc)
    service = frappe.get_cached_doc("Service", doc.service)
    held = {row.resource_type: row.resource for row in doc.get("resources") or []}
    names = dict(frappe.get_all("Resource", filters={"organization": doc.organization}, fields=["name", "resource_name"], as_list=True))
    result = []
    for need in needs(service):
        options = candidates(need, doc.location, doc.organization)
        taken = busy(options, doc.occupied_from, doc.occupied_until, exclude=doc.name) if doc.occupied_from else set()
        result.append(dict(
            resource_type=need.resource_type, type_name=_type_name(need.resource_type),
            resource=held.get(need.resource_type), resource_name=names.get(held.get(need.resource_type)),
            options=[dict(name=name, resource_name=names.get(name), free=name not in taken) for name in options],
        ))
    return dict(needs=result, can_change=doc.status in ("Pending", "Confirmed"), modified=str(doc.modified))


@frappe.whitelist(methods=["POST"])
def set_resource(booking, resource_type, resource, expected_modified=None):
    doc = frappe.get_doc("Appointment", booking)
    require_access(doc)
    if expected_modified and str(doc.modified) != str(expected_modified):
        frappe.throw(_("This booking changed. Reload before editing."), frappe.TimestampMismatchError)
    if doc.status not in ("Pending", "Confirmed"):
        frappe.throw(_("Only pending or confirmed bookings can be changed."))
    doc.flags.resource_choice = (STAFF_CHOICE, resource_type, resource)
    doc.save(ignore_permissions=True)
    return for_booking(doc.name)


def names_for(bookings):
    """Booking name → resource names, for list projections."""
    if not bookings:
        return {}
    rows = frappe.db.sql(
        """select r.parent, res.resource_name from `tabAppointment Resource` r
        inner join `tabResource` res on res.name = r.resource
        where r.parenttype = 'Appointment' and r.parent in %s order by r.idx""",
        (tuple(bookings),),
    )
    result = {}
    for parent, name in rows:
        result.setdefault(parent, []).append(name)
    return result
