"""Platform administrator view of booking payments: the ledger, balances and who collects.

Only System Managers reach these methods. Owners and managers use
`payments.get_settings` / `save_settings` for their own business instead.
See docs/features/BOOKING_PAYMENTS_PLAN.md.
"""

import json

import frappe
from frappe import _
from frappe.query_builder.functions import Count, Sum
from frappe.utils import cint, flt, now_datetime

from appointment.scheduler import payments

COLLECTION_MODES = ("Business collects", "Platform collects")
OVERRIDES = ("Platform default",) + COLLECTION_MODES
FEE_TYPES = ("None", "Fixed", "Percent")
ENTRY_TYPES = ("Platform fee", "Payout due")
STATUSES = ("Due", "Waived", "Settled")
PAGE_LIMIT = 200


def _require_admin():
    if "System Manager" not in frappe.get_roles():
        frappe.throw(_("Only platform administrators can manage platform payments."), frappe.PermissionError)


def _accounts(rows):
    return [dict(bank=r.bank, account_name=r.account_name, account_number=r.account_number, note=r.note) for r in rows]


def _clean_accounts(value):
    rows = json.loads(value) if isinstance(value, str) else value
    return [
        dict(bank=(r.get("bank") or "").strip(), account_name=(r.get("account_name") or "").strip(),
             account_number=(r.get("account_number") or "").strip(), note=(r.get("note") or "").strip() or None)
        for r in rows or [] if (r.get("bank") or "").strip() and (r.get("account_number") or "").strip()
    ]


def _platform_view():
    settings = frappe.get_single("Payment Settings")
    return dict(
        collection_mode=settings.collection_mode or "Business collects",
        platform_fee_type=settings.platform_fee_type or "None",
        platform_fee_value=flt(settings.platform_fee_value),
        free_bookings=cint(settings.free_bookings),
        platform_bank_accounts=_accounts(settings.platform_bank_accounts),
        chapa_configured=bool(settings.chapa_secret_key),
        legal_name=settings.get("legal_name") or "",
        receipt_prefix=settings.get("receipt_prefix") or "",
        tin=settings.get("tin") or "",
    )


def _totals():
    """Sum per business, entry type and status in one query."""
    entry = frappe.qb.DocType("Platform Ledger Entry")
    rows = (
        frappe.qb.from_(entry)
        .select(entry.organization, entry.entry_type, entry.status, Sum(entry.amount).as_("amount"), Count(entry.name).as_("entries"))
        .groupby(entry.organization, entry.entry_type, entry.status)
    ).run(as_dict=True)
    totals = {}
    for row in rows:
        bucket = totals.setdefault(row.organization, dict(fee_due=0.0, payout_due=0.0, settled=0.0, waived=0.0, due_entries=0))
        amount = flt(row.amount)
        if row.status == "Due":
            bucket["fee_due" if row.entry_type == "Platform fee" else "payout_due"] += amount
            bucket["due_entries"] += cint(row.entries)
        elif row.status == "Settled":
            bucket["settled"] += amount
        else:
            bucket["waived"] += amount
    return totals


@frappe.whitelist()
def overview():
    """Platform settings and one row per business that takes payment or has ledger entries."""
    _require_admin()
    totals = _totals()
    overrides = {
        row.name: row for row in frappe.get_all(
            "Business Payment Settings", fields=["name", "collection_override", "override_platform_fee", "platform_fee_override"]
        )
    }
    paying = set(frappe.get_all("Organization", filters={"require_payment": 1}, pluck="name"))
    names = sorted(set(totals) | set(overrides) | paying)
    titles = dict(frappe.get_all("Organization", filters={"name": ["in", names or [""]]}, fields=["name", "organization_name"], as_list=True))
    businesses = []
    for name in names:
        override = overrides.get(name) or frappe._dict()
        businesses.append(dict(
            organization=name,
            organization_name=titles.get(name) or name,
            require_payment=int(name in paying),
            collector=payments.collector(name),
            collection_override=override.collection_override or "Platform default",
            override_platform_fee=cint(override.override_platform_fee),
            platform_fee_override=flt(override.platform_fee_override),
            **totals.get(name, dict(fee_due=0.0, payout_due=0.0, settled=0.0, waived=0.0, due_entries=0)),
        ))
    businesses.sort(key=lambda row: (-(row["fee_due"] + row["payout_due"]), row["organization_name"].lower()))
    return dict(platform=_platform_view(), businesses=businesses, currency="ETB")


@frappe.whitelist()
def entries(organization=None, status=None, entry_type=None):
    """Newest ledger entries first, with the booking reference."""
    _require_admin()
    filters = {}
    if organization:
        filters["organization"] = organization
    if status in STATUSES:
        filters["status"] = status
    if entry_type in ENTRY_TYPES:
        filters["entry_type"] = entry_type
    rows = frappe.get_all(
        "Platform Ledger Entry", filters=filters, order_by="creation desc", limit=PAGE_LIMIT,
        fields=["name", "creation", "organization", "entry_type", "amount", "status", "appointment", "booking_payment", "note"],
    )
    orgs = {row.organization for row in rows}
    titles = dict(frappe.get_all("Organization", filters={"name": ["in", list(orgs) or [""]]}, fields=["name", "organization_name"], as_list=True))
    bookings = {row.appointment for row in rows if row.appointment}
    refs = dict(frappe.get_all("Appointment", filters={"name": ["in", list(bookings) or [""]]}, fields=["name", "appointment_id"], as_list=True))
    for row in rows:
        row["organization_name"] = titles.get(row.organization) or row.organization
        row["booking_reference"] = refs.get(row.appointment) or row.appointment
    return dict(entries=rows, limit=PAGE_LIMIT)


@frappe.whitelist(methods=["POST"])
def settle(names=None, organization=None, note=None):
    """Mark Due entries as Settled: the listed ones, or every Due entry of one business."""
    _require_admin()
    if isinstance(names, str):
        names = json.loads(names)
    if not names and not organization:
        frappe.throw(_("Choose the entries to settle."))
    filters = {"status": "Due"}
    if names:
        filters["name"] = ["in", names]
    if organization:
        filters["organization"] = organization
    due = frappe.get_all("Platform Ledger Entry", filters=filters, pluck="name")
    # A stored record, so the stamp stays in one language whatever the administrator's UI language is.
    stamp = "Settled by {0} on {1}".format(frappe.session.user, now_datetime().strftime("%Y-%m-%d %H:%M"))
    note = (note or "").strip()
    for name in due:
        entry = frappe.get_doc("Platform Ledger Entry", name)
        entry.status = "Settled"
        entry.note = "\n".join(part for part in (entry.note, stamp + (f": {note}" if note else "")) if part)
        entry.save(ignore_permissions=True)
    return dict(settled=len(due))


@frappe.whitelist(methods=["POST"])
def save_platform(collection_mode=None, platform_fee_type=None, platform_fee_value=None, free_bookings=None,
                  platform_bank_accounts=None, chapa_secret_key=None, chapa_webhook_secret=None,
                  legal_name=None, receipt_prefix=None, tin=None):
    _require_admin()
    settings = frappe.get_single("Payment Settings")
    if collection_mode is not None:
        if collection_mode not in COLLECTION_MODES:
            frappe.throw(_("Choose who collects payments."))
        settings.collection_mode = collection_mode
    if platform_fee_type is not None:
        if platform_fee_type not in FEE_TYPES:
            frappe.throw(_("Choose a platform fee type."))
        settings.platform_fee_type = platform_fee_type
    if platform_fee_value is not None:
        settings.platform_fee_value = _fee_value(settings.platform_fee_type, platform_fee_value)
    if free_bookings is not None:
        if cint(free_bookings) < 0:
            frappe.throw(_("The free allowance cannot be negative."))
        settings.free_bookings = cint(free_bookings)
    if platform_bank_accounts is not None:
        settings.set("platform_bank_accounts", _clean_accounts(platform_bank_accounts))
    if chapa_secret_key:
        settings.chapa_secret_key = chapa_secret_key
    if chapa_webhook_secret:
        settings.chapa_webhook_secret = chapa_webhook_secret
    if legal_name is not None:
        settings.legal_name = (legal_name or "").strip()[:140] or None
    if receipt_prefix is not None:
        from appointment.scheduler import receipts

        settings.receipt_prefix = receipts.clean_prefix(receipt_prefix) or None
    if tin is not None:
        settings.tin = (tin or "").strip()[:40] or None
    if settings.collection_mode == "Platform collects" and not settings.platform_bank_accounts and not settings.chapa_secret_key:
        frappe.throw(_("Add a platform bank account or Chapa keys before the platform collects payments."))
    settings.save(ignore_permissions=True)
    frappe.clear_document_cache("Payment Settings", "Payment Settings")
    return overview()


@frappe.whitelist(methods=["POST"])
def save_business(organization, collection_override=None, override_platform_fee=None, platform_fee_override=None):
    """Per-business exceptions: who collects and the platform fee."""
    _require_admin()
    if not frappe.db.exists("Organization", organization):
        frappe.throw(_("Business not found."), frappe.DoesNotExistError)
    settings = payments.business(organization)
    if collection_override is not None:
        if collection_override not in OVERRIDES:
            frappe.throw(_("Choose who collects payments."))
        settings.collection_override = collection_override
    if override_platform_fee is not None:
        settings.override_platform_fee = cint(override_platform_fee)
    if platform_fee_override is not None:
        fee_type = frappe.db.get_single_value("Payment Settings", "platform_fee_type")
        settings.platform_fee_override = _fee_value(fee_type, platform_fee_override)
    if settings.collection_override == "Platform collects" and not frappe.get_single("Payment Settings").platform_bank_accounts:
        frappe.throw(_("Add a platform bank account before the platform collects for this business."))
    settings.save(ignore_permissions=True) if not settings.is_new() else settings.insert(ignore_permissions=True)
    return overview()


def _fee_value(fee_type, value):
    value = flt(value)
    if value < 0 or (fee_type == "Percent" and value > 100):
        frappe.throw(_("Enter a fee between 0 and 100 percent.") if fee_type == "Percent" else _("The fee cannot be negative."))
    return value
