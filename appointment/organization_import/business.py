"""Create a workbook business through a narrowly authorized normal insert."""

import hashlib

import frappe
from frappe import _

from appointment.content.tenancy import require_manage_business
from appointment.scheduler.workspace import _SETUP_CREATE, require_provider_account


def require_creation():
    user = require_provider_account()
    if "Organization Manager" not in frappe.get_roles(user):
        frappe.throw(_("Choose an organization owner account before creating a business."), frappe.PermissionError)
    return user


def existing(namespace):
    user = require_creation()
    return frappe.db.get_value("Organization", {"owner_user": user, "workbook_creation_key": _key(user, namespace)}, "name")


def create(row):
    user = require_creation()
    frappe.db.sql("select name from `tabUser` where name=%s for update", user)
    previous = existing(row["key"])
    if previous:
        require_manage_business("Organization", previous)
        return previous
    if frappe.db.exists("Organization", row["name"]):
        frappe.throw(_("That organization name is already used. Choose a different name in Organization B2."))
    doc = frappe.get_doc({"doctype": "Organization", "organization_name": row["name"], "owner_user": user,
                          "slug": "business-" + _key(user, row["key"])[:24],
                          "organization_type": "Other", "timezone": row["timezone"], "is_active": 1,
                          "enable_public_booking": 0, "workbook_creation_key": _key(user, row["key"])})
    doc.flags.workspace_setup = _SETUP_CREATE
    syncing = frappe.flags.syncing_booking_urls
    try:
        frappe.flags.syncing_booking_urls = True
        doc.insert()
    finally:
        frappe.flags.syncing_booking_urls = syncing
    return doc.name


def _key(user, namespace):
    return hashlib.sha256(("organization-workbook\0" + user + "\0" + namespace).encode()).hexdigest()
