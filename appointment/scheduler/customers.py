"""Staff APIs for business-owned customer profiles.

Owners and managers see and change everything for their business, including
merges. Receptionists see and edit customers of their business. Providers see
only the name and history of customers they have booked, without contact
details or notes. Nothing here is open to guests.

`organization` is the workspace key: an Organization name, or `Provider:<provider>`
for an independent provider, who is the manager of their own customers.
"""

import json

import frappe
from frappe import _
from frappe.query_builder.functions import Count, Max
from frappe.utils import cint

from appointment.scheduler import business_owner, customer_identity
from appointment.scheduler.booking_access import managed_organizations, providers, receptionist_organizations
from appointment.scheduler.notification_sms import normalize_phone

PAGE_LENGTH = 20
EDITABLE = ("display_name", "primary_email", "primary_phone", "preferred_language", "private_notes")
HISTORY_FIELDS = [
    "name", "appointment_date", "start_time", "status", "service", "provider", "location", "booking_timezone",
]


def role_in(organization, user=None):
    """'manager', 'reception', 'provider' or None for this user in this business."""
    user = user or frappe.session.user
    if (organization or "").startswith(business_owner.PREFIX):
        return "manager" if user == "Administrator" or _owns_provider(organization, user) else None
    if user == "Administrator" or organization in managed_organizations(user):
        return "manager"
    if organization in receptionist_organizations(user):
        return "reception"
    if _own_providers(organization, user):
        return "provider"
    return None


def _owns_provider(key, user):
    from appointment.scheduler.independent import require_owner

    if user != frappe.session.user:
        return False
    try:
        require_owner(key.removeprefix(business_owner.PREFIX))
    except (frappe.PermissionError, frappe.DoesNotExistError):
        return False
    return True


def _own_providers(organization, user=None):
    own = providers(user)
    if not own:
        return []
    return frappe.get_all(
        "Provider Organization",
        filters={"parent": ["in", own], "parenttype": "Provider", "organization": organization, "status": "Active"},
        pluck="parent",
    )


def _require(organization, roles):
    role = role_in(organization)
    if role not in roles:
        frappe.throw(_("You cannot work with this business's customers."), frappe.PermissionError)
    return role


def _require_customer(customer_id, roles):
    organization = _profile_key(customer_id)
    if not organization:
        frappe.throw(_("Customer not found."), frappe.DoesNotExistError)
    role = _require(organization, roles)
    if role == "provider" and not frappe.db.exists(
        "Appointment", {"customer": customer_id, "provider": ["in", _own_providers(organization)]}
    ):
        frappe.throw(_("You cannot work with this business's customers."), frappe.PermissionError)
    return organization, role


@frappe.whitelist()
def search(organization, query="", page=0, include_archived=0):
    role = _require(organization, ("manager", "reception", "provider"))
    owner = business_owner.from_key(organization)
    filters = [[field, *(value if isinstance(value, list) else ["=", value])]
               for field, value in business_owner.record_filters(owner).items()]
    if not cint(include_archived):
        filters.append(["status", "=", "Active"])
    or_filters = None
    query = (query or "").strip()
    if query:
        or_filters = [["display_name", "like", f"%{query}%"]]
        if role != "provider":
            or_filters.append(["primary_email", "like", f"%{query.lower()}%"])
            phone = normalize_phone(query)
            or_filters.append(["primary_phone", "like", f"%{phone or query}%"])
    if role == "provider":
        own = _own_providers(organization)
        booked = frappe.get_all(
            "Appointment",
            filters={"organization": organization, "provider": ["in", own], "customer": ["is", "set"]},
            pluck="customer",
            distinct=True,
        )
        filters.append(["name", "in", booked or [""]])
    rows = frappe.get_all(
        "Customer Profile",
        filters=filters,
        or_filters=or_filters,
        fields=["name", "display_name", "primary_email", "primary_phone", "status", "possible_duplicate", "modified"],
        order_by="display_name asc",
        start=cint(page) * PAGE_LENGTH,
        page_length=PAGE_LENGTH + 1,
    )
    more = len(rows) > PAGE_LENGTH
    rows = rows[:PAGE_LENGTH]
    stats = _booking_stats([row.name for row in rows], organization, role)
    return {
        "customers": [_project(row, role, stats.get(row.name)) for row in rows],
        "has_more": more,
        "role": role,
    }


@frappe.whitelist()
def get(customer_id):
    organization, role = _require_customer(customer_id, ("manager", "reception", "provider"))
    doc = frappe.get_doc("Customer Profile", customer_id)
    profile = _project(doc.as_dict(), role, _booking_stats([customer_id], organization, role).get(customer_id))
    if role != "provider":
        profile["preferred_providers"] = [
            dict(
                provider=row.provider,
                provider_name=frappe.db.get_value("Provider", row.provider, "full_name"),
                service=row.service,
                service_name=frappe.db.get_value("Service", row.service, "service_name") if row.service else None,
                priority=row.priority,
            )
            for row in doc.preferred_providers
        ]
    profile["history"] = _history(customer_id, organization, role)
    profile["role"] = role
    return profile


@frappe.whitelist(methods=["POST"])
def save(organization, customer_id=None, preferred_providers=None, **fields):
    """Create or edit a customer. `preferred_providers` is a JSON list of {provider, service, priority}."""
    _require(organization, ("manager", "reception"))
    if customer_id:
        doc = frappe.get_doc("Customer Profile", customer_id)
        if business_owner.record_key(doc) != organization:
            frappe.throw(_("You cannot work with this business's customers."), frappe.PermissionError)
    else:
        owner = business_owner.from_key(organization)
        doc = frappe.get_doc(dict(doctype="Customer Profile", **business_owner.record_fields(owner)))
    for key in EDITABLE:
        if key in fields:
            doc.set(key, fields[key] or None)
    if preferred_providers is not None:
        rows = json.loads(preferred_providers) if isinstance(preferred_providers, str) else preferred_providers
        doc.set("preferred_providers", [
            dict(provider=row.get("provider"), service=row.get("service") or None, priority=cint(row.get("priority")) or 1)
            for row in rows or []
        ])
    doc.save(ignore_permissions=True) if customer_id else doc.insert(ignore_permissions=True)
    return get(doc.name)


@frappe.whitelist()
def merge_preview(source, target):
    organization, _role = _require_customer(source, ("manager",))
    if _profile_key(target) != organization:
        frappe.throw(_("Choose two different customers of the same business."))
    return {
        "source": _project(frappe.get_doc("Customer Profile", source).as_dict(), "manager"),
        "target": _project(frappe.get_doc("Customer Profile", target).as_dict(), "manager"),
        "bookings_to_move": frappe.db.count("Appointment", {"customer": source}),
    }


@frappe.whitelist(methods=["POST"])
def merge(source, target):
    organization, _role = _require_customer(source, ("manager",))
    if _profile_key(target) != organization:
        frappe.throw(_("Choose two different customers of the same business."))
    return customer_identity.merge(source, target)


def _profile_key(customer_id):
    row = frappe.db.get_value("Customer Profile", customer_id, ["organization", "independent_provider"], as_dict=True)
    return business_owner.record_key(row) if row else None


def _project(row, role, stats=None):
    """The fields this role may see."""
    projected = dict(
        name=row["name"],
        display_name=row["display_name"],
        status=row.get("status"),
        booking_count=(stats or {}).get("count", 0),
        last_booking=(stats or {}).get("last"),
    )
    if role != "provider":
        projected.update(
            primary_email=row.get("primary_email"),
            primary_phone=row.get("primary_phone"),
            preferred_language=row.get("preferred_language"),
            possible_duplicate=row.get("possible_duplicate"),
            merged_into=row.get("merged_into"),
            organization=row.get("organization"),
        )
        if "private_notes" in row:
            projected["private_notes"] = row.get("private_notes")
    return projected


def _booking_stats(names, organization, role):
    if not names:
        return {}
    appointment = frappe.qb.DocType("Appointment")
    query = (
        frappe.qb.from_(appointment)
        .select(appointment.customer, Count(appointment.name).as_("count"), Max(appointment.appointment_date).as_("last"))
        .where(appointment.customer.isin(names))
        .groupby(appointment.customer)
    )
    if organization.startswith(business_owner.PREFIX):
        query = query.where(appointment.provider == organization.removeprefix(business_owner.PREFIX))
        query = query.where(appointment.organization.isnull() | (appointment.organization == ""))
    else:
        query = query.where(appointment.organization == organization)
    if role == "provider":
        query = query.where(appointment.provider.isin(_own_providers(organization) or [""]))
    return {row.customer: dict(count=row.count, last=row.last) for row in query.run(as_dict=True)}


def _history(customer_id, organization, role):
    filters = {"customer": customer_id, **business_owner.booking_filters(business_owner.from_key(organization))}
    if role == "provider":
        filters["provider"] = ["in", _own_providers(organization) or [""]]
    rows = frappe.get_all(
        "Appointment", filters=filters, fields=HISTORY_FIELDS, order_by="appointment_date desc, start_time desc", limit=100
    )
    for row in rows:
        row["service_name"] = frappe.db.get_value("Service", row.service, "service_name")
        row["provider_name"] = frappe.db.get_value("Provider", row.provider, "full_name")
        row["location_name"] = frappe.db.get_value("Location", row.location, "location_name")
    return rows
