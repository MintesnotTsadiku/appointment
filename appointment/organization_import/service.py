"""Confirmed imports use normal document permissions and immutable audit maps."""

import hashlib
import json

import frappe
from frappe import _

from appointment.content.tenancy import require_manage_business
from appointment.organization_import import workbook, website
from appointment.scheduler import membership

_IMPORT_WRITE = object()
TYPES = {"Locations": "Location", "Providers": "Provider", "Services": "Service", "Offerings": "EventType"}


def preview(content, organization):
    from appointment.organization_import import business

    require_manage_business("Organization", organization) if organization else business.require_creation()
    proposed = workbook.dry_run(content)
    if not proposed["valid"]:
        return proposed
    namespace = proposed["rows"]["Organization"][0]["key"]
    organization = organization or business.existing(namespace)
    errors = _business_errors(proposed["rows"], organization)
    if errors:
        return {**proposed, "valid": False, "errors": errors}
    if not organization:
        proposed["changes"] = {sheet: {"create": len(proposed["rows"][sheet]), "update": 0}
                                for sheet in ("Locations", "Providers", "Services")}
        return proposed
    previous = frappe.db.get_value("Organization Workbook Import", {"organization": organization, "namespace": namespace},
                                   "mapping_json", order_by="creation desc")
    mapping = json.loads(previous or "{}")
    _validate_map(mapping, organization)
    proposed["changes"] = {sheet: {"create": sum(row["key"] not in mapping.get(sheet, {}) for row in proposed["rows"][sheet]),
                                   "update": sum(row["key"] in mapping.get(sheet, {}) for row in proposed["rows"][sheet])}
                            for sheet in ("Locations", "Providers", "Services")}
    return proposed


def confirm(content, organization, expected_hash, confirmed):
    from appointment.organization_import import business

    if not organization:
        business.require_creation()
        if str(confirmed) not in {"1", "True", "true"}:
            frappe.throw(_("Review the proposed changes and confirm the import."))
        proposed = workbook.dry_run(content)
        if not proposed["valid"]:
            return proposed
        if proposed["sha256"] != expected_hash:
            frappe.throw(_("The workbook changed. Review a new dry run before confirming."))
        errors = _business_errors(proposed["rows"])
        if errors:
            return {**proposed, "valid": False, "errors": errors}
        frappe.db.savepoint("workbook_new_business")
        try:
            organization = business.create(proposed["rows"]["Organization"][0])
            result = confirm(content, organization, expected_hash, confirmed)
            if not result["valid"]:
                frappe.db.rollback(save_point="workbook_new_business")
            return result
        except Exception:
            frappe.db.rollback(save_point="workbook_new_business")
            raise
    require_manage_business("Organization", organization)
    if str(confirmed) not in {"1", "True", "true"}:
        frappe.throw(_("Review the proposed changes and confirm the import."))
    proposed = workbook.dry_run(content)
    if not proposed["valid"]:
        return proposed
    if proposed["sha256"] != expected_hash:
        frappe.throw(_("The workbook changed. Review a new dry run before confirming."))
    frappe.db.sql("select name from `tabOrganization` where name=%s for update", organization)
    namespace = proposed["rows"]["Organization"][0]["key"]
    identity = hashlib.sha256((organization + "\0" + namespace + "\0" + expected_hash).encode()).hexdigest()
    repeated = frappe.db.get_value("Organization Workbook Import", {"idempotency_key": identity}, "name")
    if repeated:
        return {"valid": True, "audit": repeated, "replayed": True, "organization": organization}
    errors = _business_errors(proposed["rows"], organization)
    if errors:
        return {**proposed, "valid": False, "errors": errors}
    previous = frappe.db.get_value("Organization Workbook Import", {"organization": organization, "namespace": namespace},
                                   "mapping_json", order_by="creation desc")
    mapping = json.loads(previous or "{}")
    _validate_map(mapping, organization)
    frappe.db.savepoint("organization_workbook")
    syncing = frappe.flags.syncing_booking_urls
    try:
        frappe.flags.syncing_booking_urls = True
        _apply(proposed["rows"], organization, mapping)
        audit = frappe.get_doc({"doctype": "Organization Workbook Import", "organization": organization,
                                "namespace": namespace, "source_hash": expected_hash, "schema_version": workbook.VERSION,
                                "idempotency_key": identity, "mapping_json": json.dumps(mapping),
                                "summary_json": json.dumps(proposed["summary"]),
                                "website_content_json": json.dumps(proposed["rows"]["Website Content"]),
                                "imported_by": frappe.session.user})
        audit.flags.workbook_factory = _IMPORT_WRITE
        audit.insert()
        return {"valid": True, "audit": audit.name, "replayed": False, "summary": proposed["summary"], "organization": organization}
    except Exception:
        frappe.db.rollback(save_point="organization_workbook")
        raise
    finally:
        frappe.flags.syncing_booking_urls = syncing


def _business_errors(rows, organization=None):
    errors = website.errors(rows["Website Content"], organization)
    for sheet in ("Team", "Providers"):
        for row in rows[sheet]:
            if not frappe.db.exists("User", {"name": row["email"].lower(), "enabled": 1}):
                errors.append({"sheet": sheet, "row": row["_row"], "cell": f"B{row['_row']}" if sheet == "Team" else f"C{row['_row']}",
                               "message": _("This staff member must accept an invitation before their account can be linked.")})
    for row in rows["Services"]:
        if row["capacity"] != "1":
            errors.append({"sheet": "Services", "row": row["_row"], "cell": f"G{row['_row']}",
                           "message": _("This import currently supports individual appointment capacity of 1.")})
    locations = {row["key"]: row for row in rows["Locations"]}
    for row in rows["Availability"]:
        if row["timezone"] != locations[row["location_key"]]["timezone"]:
            errors.append({"sheet": "Availability", "row": row["_row"], "cell": f"F{row['_row']}",
                           "message": _("Use the same time zone as this location.")})
    return errors


def _validate_map(mapping, organization):
    from appointment.scheduler.booking_access import config_organization

    for sheet, records in mapping.items():
        if sheet not in TYPES:
            frappe.throw(_("The previous import audit has unsupported records."))
        for name in records.values():
            if not frappe.db.exists(TYPES[sheet], name):
                frappe.throw(_("An imported record was removed. Restore it before retrying this workbook."))
            doc = frappe.get_doc(TYPES[sheet], name)
            same_business = config_organization(doc) == organization
            if sheet == "Providers":
                same_business = bool(doc.organizations) and all(row.organization == organization for row in doc.organizations)
            if not same_business:
                frappe.throw(_("An imported record changed business. Review the import history."), frappe.PermissionError)
            doc.check_permission("write")


def _upsert(sheet, row, payload, mapping):
    records = mapping.setdefault(sheet, {})
    existing = records.get(row["key"])
    doc = frappe.get_doc(TYPES[sheet], existing) if existing else frappe.get_doc({"doctype": TYPES[sheet]})
    for field, value in payload.items():
        if isinstance(value, list):
            doc.set(field, [])
            for child in value:
                doc.append(field, child)
        else:
            doc.set(field, value)
    doc.save() if existing else doc.insert()
    records[row["key"]] = doc.name
    return doc


def _apply(rows, organization, mapping):
    business = frappe.get_doc("Organization", organization)
    incoming = rows["Organization"][0]
    # Organization names are stable document addresses; imports edit facts rather than rename them.
    business.organization_name = incoming["name"]
    business.timezone = incoming["timezone"]
    for field in ("email", "phone", "description"):
        if frappe.get_meta("Organization").has_field(field):
            business.set(field, incoming[field])
    business.save()
    hours = {}
    for row in rows["Availability"]:
        hours.setdefault(row["location_key"], {})[row["weekday"]] = row
    for row in rows["Locations"]:
        schedule = hours.get(row["key"], {})
        _upsert("Locations", row, {"location_name": f"{organization} — {row['name']}", "organization": organization,
                "timezone": row["timezone"], "address_line_1": row["address"], "phone": row["phone"], "is_active": 1,
                "opening_hours": [{"day_of_week": day, "is_open": int(day in schedule),
                                   "start_time": schedule[day]["opens_at"] if day in schedule else "09:00",
                                   "end_time": schedule[day]["closes_at"] if day in schedule else "17:00"} for day in workbook.DAYS]}, mapping)
    for row in rows["Providers"]:
        _upsert("Providers", row, {"provider_name": f"{organization} — {row['name']}", "email": row["email"].lower(),
                "user": row["email"].lower(), "bio": row["description"], "is_active": 1, "use_default_hours": 1,
                "organizations": [{"organization": organization, "status": "Active", "accept_org_bookings": 1}]}, mapping)
    for row in rows["Services"]:
        provider = mapping["Providers"][row["provider_key"]]
        location = mapping["Locations"][row["location_key"]]
        service = _upsert("Services", row, {"organization": organization, "service_name": row["name"],
                "duration": int(row["duration"]), "price": row["price"] or 0, "use_default_hours": 1, "is_active": 1,
                "service_providers": [{"provider": provider, "status": "Active"}]}, mapping)
        _upsert("Offerings", row, {"event_type_name": row["name"], "service": service.name,
                "provider": provider, "location": location, "is_active": int(row["public"])}, mapping)
    for row in rows["Team"]:
        user = row["email"].lower()
        existing = frappe.db.get_value("Business Membership", {"organization": organization, "user": user,
                                       "membership_role": row["role"]}, "name")
        member = frappe.get_doc("Business Membership", existing) if existing else frappe.get_doc({"doctype": "Business Membership"})
        member.update({"organization": organization, "user": user, "membership_role": row["role"], "status": "Active",
                       "provider": mapping["Providers"].get(row["provider_key"]), "assigned_by": frappe.session.user,
                       "assigned_at": frappe.utils.now_datetime()})
        member.set("locations", [])
        for key in filter(None, (part.strip() for part in row["location_keys"].split(","))):
            member.append("locations", {"location": mapping["Locations"][key]})
        member.save() if existing else member.insert()
    if rows["Website Content"]:
        website.apply(rows["Website Content"], organization)
