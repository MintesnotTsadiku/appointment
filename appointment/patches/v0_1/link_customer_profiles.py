"""Link existing bookings to business-owned customer profiles.

Groups unlinked bookings by business plus normalized email, then by business
plus normalized phone. Names never group bookings. A booking with neither gets
its own profile. Safe to run again: it only touches unlinked bookings.

Dry run: bench --site <site> execute appointment.patches.v0_1.link_customer_profiles.report
"""

from collections import defaultdict

import frappe

from appointment.scheduler.customer_identity import find_by_key, normalize_email
from appointment.scheduler.notification_sms import normalize_phone

FIELDS = ["name", "organization", "client_name", "client_email", "client_phone", "customer_language", "creation"]


def report():
    """Counts per business without writing anything."""
    result = {}
    for organization, groups in _groups().items():
        result[organization] = dict(
            bookings=sum(len(rows) for rows in groups.values()),
            customers=len(groups),
            by_email=sum(1 for key in groups if key[0] == "email"),
            by_phone=sum(1 for key in groups if key[0] == "phone"),
            no_contact=sum(1 for key in groups if key[0] == "none"),
            existing_profiles=sum(1 for key in groups if _existing(organization, key)),
        )
    return result


def execute(commit=True):
    linked = 0
    for organization, groups in _groups().items():
        for key, rows in groups.items():
            profile = _existing(organization, key) or _create(organization, rows)
            for row in rows:
                # A direct link: saving would re-run today's availability checks on past bookings.
                frappe.db.set_value("Appointment", row.name, "customer", profile, update_modified=False)
            linked += len(rows)
        if commit:
            frappe.db.commit()
    return linked


def _groups():
    grouped = defaultdict(lambda: defaultdict(list))
    rows = frappe.get_all(
        "Appointment", filters={"customer": ["is", "not set"], "organization": ["is", "set"]}, fields=FIELDS, order_by="creation asc"
    )
    for row in rows:
        email, phone = normalize_email(row.client_email), normalize_phone(row.client_phone)
        key = ("email", email) if email else ("phone", phone) if phone else ("none", row.name)
        grouped[row.organization][key].append(row)
    return grouped


def _existing(organization, key):
    kind, value = key
    if kind == "none":
        return None
    return find_by_key(organization, **{kind: value}).get(kind)


def _create(organization, rows):
    latest = rows[-1]
    email = next((normalize_email(r.client_email) for r in reversed(rows) if normalize_email(r.client_email)), None)
    phone = next((normalize_phone(r.client_phone) for r in reversed(rows) if normalize_phone(r.client_phone)), None)
    if phone and find_by_key(organization, phone=phone):
        phone = None  # The phone already belongs to another profile; it stays on the bookings.
    return frappe.get_doc(
        dict(
            doctype="Customer Profile",
            organization=organization,
            display_name=(latest.client_name or "").strip() or email or phone or latest.name,
            primary_email=email,
            primary_phone=phone,
            preferred_language=latest.customer_language or None,
        )
    ).insert(ignore_permissions=True).name
