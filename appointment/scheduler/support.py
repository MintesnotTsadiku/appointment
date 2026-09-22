"""Scoped, read-only support export. Requester verification and retention stay operational."""

import json

import frappe
from frappe import _

from appointment.scheduler.booking_access import managed_organizations

BOOKING_FIELDS = (
    "name",
    "organization",
    "service",
    "provider",
    "location",
    "status",
    "client_name",
    "client_email",
    "client_phone",
    "appointment_date",
    "start_time",
    "end_time",
    "booking_timezone",
    "starts_at",
    "ends_at",
    "creation",
    "modified",
)


@frappe.whitelist()
def customer_record(organization, email):
    if organization not in managed_organizations():
        frappe.throw(_("Only this business's manager may prepare a customer data export."), frappe.PermissionError)
    frappe.utils.validate_email_address(email, throw=True)
    rows = frappe.get_all(
        "Appointment",
        filters={"organization": organization, "client_email": email},
        fields=list(BOOKING_FIELDS),
        order_by="creation asc",
    )
    for row in rows:
        row["history"] = []
        for version in frappe.get_all(
            "Version",
            filters={"ref_doctype": "Appointment", "docname": row.name},
            fields=["owner", "creation", "data"],
            order_by="creation asc",
        ):
            detail = json.loads(version.data or "{}")
            row["history"].append(
                dict(
                    actor=version.owner,
                    timestamp=version.creation,
                    operation=detail.get("operation", "updated"),
                    changes=[change for change in detail.get("changed", []) if change[0] in BOOKING_FIELDS],
                )
            )
    return {
        "organization": organization,
        "email": email,
        "bookings": rows,
        "scope": "Canonical bookings matching this email in this business; verify requester identity before sharing.",
    }
