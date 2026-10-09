"""Business and assigned-provider scope shared by booking APIs and documents."""

import frappe
from frappe import _

from appointment.scheduler import membership


def managed_organizations(user=None):
    return membership.manager_organizations(user)


def reception_scope(user=None):
    return membership.reception_scopes(user)


def receptionist_organizations(user=None):
    return membership.receptionist_organizations(user)


def _within_reception_scope(doc, scopes, organization, provider=None, location=None):
    """True when a receptionist's location/provider scope covers this record."""
    provider = provider or doc.get("provider")
    location = location or doc.get("location")
    for scope in scopes:
        if scope["organization"] != organization:
            continue
        if scope["locations"] and location not in scope["locations"]:
            continue
        if scope["provider"] and provider != scope["provider"]:
            continue
        return True
    return False


def providers(user=None):
    user = user or frappe.session.user
    if user == "Guest" or not frappe.db.get_value("User", user, "enabled"):
        return []
    return frappe.get_all("Provider", filters={"user": user, "is_active": 1}, pluck="name")


def can_access(doc, user=None):
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    if user == "Guest" or not frappe.db.get_value("User", user, "enabled"):
        return False
    org = doc.get("organization") or frappe.db.get_value("Service", doc.get("service"), "organization")
    if not org and doc.get("provider") in providers(user):
        from appointment.scheduler.independent import matches

        return matches(frappe.get_doc("Service", doc.service), frappe.get_doc("Location", doc.location),
                       frappe.get_doc("Provider", doc.provider))
    if org in managed_organizations(user):
        return True
    if _within_reception_scope(doc, reception_scope(user), org):
        return True
    return bool(
        doc.get("provider") in providers(user)
        and frappe.db.exists(
            "Provider Organization",
            {
                "parent": doc.provider,
                "parenttype": "Provider",
                "organization": org,
                "status": "Active",
            },
        )
    )


def require_access(doc):
    if not can_access(doc):
        frappe.throw(_("Not permitted to access this booking."), frappe.PermissionError)


def appointment_permission(doc, user=None, permission_type=None, **kwargs):
    return can_access(doc, user)


def appointment_query(user=None):
    user = user or frappe.session.user
    if user == "Administrator":
        return ""
    if user == "Guest" or not frappe.db.get_value("User", user, "enabled"):
        return "1=0"
    orgs = managed_organizations(user)
    parts = []
    if orgs:
        parts.append("`tabAppointment`.organization in (" + ",".join(frappe.db.escape(x) for x in orgs) + ")")
    for scope in reception_scope(user):
        condition = "`tabAppointment`.organization = " + frappe.db.escape(scope["organization"])
        if scope["locations"]:
            condition += " and `tabAppointment`.location in (" + ",".join(
                frappe.db.escape(x) for x in scope["locations"]
            ) + ")"
        if scope["provider"]:
            condition += " and `tabAppointment`.provider = " + frappe.db.escape(scope["provider"])
        parts.append("(" + condition + ")")
    own = providers(user)
    if own:
        parts.append(
            "(`tabAppointment`.provider in ("
            + ",".join(frappe.db.escape(x) for x in own)
            + """)
          and exists (select 1 from `tabProvider Organization` membership
            where membership.parent=`tabAppointment`.provider and membership.parenttype='Provider'
            and membership.organization=`tabAppointment`.organization and membership.status='Active'))"""
        )
    if own:
        own_names = ",".join(frappe.db.escape(x) for x in own)
        parts.append(f"(coalesce(`tabAppointment`.organization, '')='' and `tabAppointment`.provider in ({own_names}) and exists (select 1 from `tabService` s where s.name=`tabAppointment`.service and s.independent_provider=`tabAppointment`.provider and coalesce(s.organization, '')='') and exists (select 1 from `tabLocation` l where l.name=`tabAppointment`.location and l.independent_provider=`tabAppointment`.provider and coalesce(l.organization, '')=''))")
    return "(" + " or ".join(parts) + ")" if parts else "1=0"


def require_staff():
    user = frappe.session.user
    if user == "Administrator":
        return
    if not frappe.db.get_value("User", user, "enabled"):
        frappe.throw(_("Staff access is required."), frappe.PermissionError)
    if not (providers() or managed_organizations() or reception_scope()):
        frappe.throw(_("Staff access is required."), frappe.PermissionError)


def business_scope(user=None):
    user = user or frappe.session.user
    orgs = managed_organizations(user)
    own = providers(user)
    if own:
        orgs += frappe.get_all(
            "Provider Organization",
            filters={"parent": ["in", own], "parenttype": "Provider", "status": "Active"},
            pluck="organization",
        )
    orgs += receptionist_organizations(user)
    return list(set(orgs))


def config_organization(doc):
    if doc.doctype == "Organization":
        return doc.name
    if doc.doctype == "EventType":
        return frappe.db.get_value("Service", doc.service, "organization")
    if doc.doctype == "Walk In":
        return frappe.db.get_value("Location", doc.location, "organization")
    return doc.get("organization")


def config_permission(doc, user=None, permission_type="read", ptype=None, **kwargs):
    permission_type = ptype or permission_type
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    if doc.doctype == "Organization" and doc.is_new() and permission_type == "create":
        from appointment.scheduler.workspace import _SETUP_CREATE

        return (doc.flags.workspace_setup is _SETUP_CREATE and doc.owner_user == user
                and "Organization Manager" in frappe.get_roles(user))
    from appointment.scheduler.independent import permits

    if permits(doc, user):
        return True
    org = config_organization(doc)
    if permission_type in ("read", "select", "print", "export", "report"):
        if doc.doctype == "Provider":
            return doc.name in providers(user) or any(
                r.organization in managed_organizations(user) for r in doc.organizations
            )
        return org in business_scope(user)
    if doc.doctype == "Provider":
        managed = managed_organizations(user)
        return bool(doc.organizations) and all(row.organization in managed for row in doc.organizations)
    return org in managed_organizations(user)


def validate_config(doc, method=None):
    from appointment.onboarding import _ONBOARDING_UPDATE
    from appointment.scheduler import independent

    independent.validate(doc)
    if doc.flags.get("independent_setup") is independent._SETUP and independent.permits(doc, frappe.session.user):
        return

    # Only the self-onboarding endpoint can supply this in-memory capability.
    # It controls all changed fields and cannot assign business membership.
    if (doc.doctype == "Provider" and doc.flags.get("onboarding_update") is _ONBOARDING_UPDATE
            and doc.user == frappe.session.user and frappe.session.user != "Guest"
            and frappe.db.get_value("User", doc.user, "enabled")):
        return

    if frappe.session.user == "Administrator":
        return
    if doc.doctype == "Organization" and doc.is_new():
        from appointment.scheduler.workspace import _SETUP_CREATE

        if doc.flags.workspace_setup is _SETUP_CREATE and doc.owner_user == frappe.session.user:
            return
    old = doc.get_doc_before_save()
    if old and doc.doctype == "Organization":
        from appointment.scheduler.workspace import _SETUP_CREATE

        if doc.flags.workspace_setup is not _SETUP_CREATE and any(
            doc.get(field) != old.get(field)
            for field in ("setup_request_key", "setup_request_hash", "setup_request_result", "workbook_creation_key")
        ):
            frappe.throw(_("Setup retry identity cannot be edited."), frappe.PermissionError)
    for target in (old, doc):
        if target and not config_permission(target, permission_type="write"):
            frappe.throw(_("Only a business manager may change this configuration."), frappe.PermissionError)


def config_query(doctype, user=None):
    user = user or frappe.session.user
    if user == "Administrator":
        return ""
    orgs = business_scope(user)
    own = providers(user)
    names = ",".join(frappe.db.escape(x) for x in orgs) or "NULL"
    if doctype == "Organization":
        return f"`tabOrganization`.name in ({names})"
    independent = ",".join(frappe.db.escape(x) for x in own) or "NULL"
    if doctype == "EventType":
        return f"(`tabEventType`.service in (select name from `tabService` where organization in ({names})) or exists (select 1 from `tabService` s inner join `tabLocation` l on l.name=`tabEventType`.location where s.name=`tabEventType`.service and coalesce(s.organization, '')='' and coalesce(l.organization, '')='' and s.independent_provider in ({independent}) and s.independent_provider=`tabEventType`.provider and l.independent_provider=s.independent_provider))"
    if doctype == "Walk In":
        return f"(`tabWalk In`.location in (select name from `tabLocation` where organization in ({names})) or `tabWalk In`.independent_provider in ({independent}))"
    if doctype == "Provider":
        own = providers(user)
        managed = managed_organizations(user)
        pieces = ["1=0"]
        if own:
            pieces.append("`tabProvider`.name in (" + ",".join(frappe.db.escape(x) for x in own) + ")")
        if managed:
            pieces.append(
                "`tabProvider`.name in (select parent from `tabProvider Organization` where parenttype='Provider' and organization in ("
                + ",".join(frappe.db.escape(x) for x in managed)
                + "))"
            )
        return "(" + " or ".join(pieces) + ")"
    if doctype in ("Service", "Location"):
        return f"(`tab{doctype}`.organization in ({names}) or (coalesce(`tab{doctype}`.organization, '')='' and `tab{doctype}`.independent_provider in ({independent})))"
    return f"`tab{doctype}`.organization in ({names})"


def service_query(user=None):
    return config_query("Service", user)


def location_query(user=None):
    return config_query("Location", user)


def eventtype_query(user=None):
    return config_query("EventType", user)


def provider_query(user=None):
    return config_query("Provider", user)


def organization_query(user=None):
    return config_query("Organization", user)


def walkin_query(user=None):
    return config_query("Walk In", user)
