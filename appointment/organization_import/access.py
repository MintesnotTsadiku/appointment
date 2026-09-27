"""Use the same business scope for workbook audit lists and direct reads."""

import frappe

from appointment.content import tenancy


def query(user=None):
    from appointment.scheduler.membership import manager_organizations

    actor = user or frappe.session.user
    if actor == "Administrator":
        return ""
    names = manager_organizations(actor)
    if not names:
        return "1=0"
    return "`tabOrganization Workbook Import`.organization in (" + ",".join(frappe.db.escape(name) for name in names) + ")"


def permission(doc, user=None, permission_type="read", ptype=None, **kwargs):
    from appointment.organization_import.service import _IMPORT_WRITE

    actor = user or frappe.session.user
    operation = ptype or permission_type
    if operation == "create" and doc.flags.workbook_factory is not _IMPORT_WRITE:
        return False
    if operation not in {"create", "read", "select", "report", "print", "export"}:
        return False
    return tenancy.can_manage_business("Organization", doc.organization, user=actor)


def membership_query(user=None):
    return query(user).replace("tabOrganization Workbook Import", "tabBusiness Membership")


def membership_permission(doc, user=None, permission_type="read", ptype=None, **kwargs):
    operation = ptype or permission_type
    actor = user or frappe.session.user
    if actor == "Administrator":
        return True
    if operation not in {"create", "read", "select", "report", "write"}:
        return False
    return tenancy.can_manage_business("Organization", doc.organization, user=actor)
