"""Monthly payment statement per business: payments, refunds, platform fees, payouts and the net.

Month boundaries are local to the business. Payment times are stored in UTC;
ledger entries use their creation time (system time). Owners and managers see
their business; platform administrators see every business. A job on the 1st
emails last month's statement to each owner with activity.
See docs/features/RECEIPTS_AND_STATEMENTS_PLAN.md.
"""

import csv
import io
import re
from datetime import datetime, timedelta

import frappe
import pytz
from frappe import _
from frappe.utils import escape_html, flt, get_datetime

from appointment.scheduler.booking_access import managed_organizations
from appointment.scheduler.receipts import business_zone, font_url

TEMPLATE = "appointment/templates/receipts/statement.html"
CSV_COLUMNS = ["section", "date", "booking", "receipt", "customer", "method", "collector", "status", "amount", "currency"]


def _require(organization):
    if "System Manager" not in frappe.get_roles() and organization not in managed_organizations():
        frappe.throw(_("You cannot view statements for this business."), frappe.PermissionError)


def _bounds(organization, month):
    match = re.fullmatch(r"(\d{4})-(\d{2})", month or "")
    if not match or not 1 <= int(match[2]) <= 12:
        frappe.throw(_("Choose a month."))
    year, number = int(match[1]), int(match[2])
    zone = pytz.timezone(business_zone(organization))
    start = zone.localize(datetime(year, number, 1))
    end = zone.localize(datetime(year + (number == 12), number % 12 + 1, 1))
    system = pytz.timezone(frappe.utils.get_system_timezone())
    naive = lambda value, target: value.astimezone(target).replace(tzinfo=None)  # noqa: E731
    return zone, (naive(start, pytz.UTC), naive(end, pytz.UTC)), (naive(start, system), naive(end, system))


def build(organization, month):
    """The statement as data: lines per section and the totals."""
    zone, (utc_start, utc_end), (sys_start, sys_end) = _bounds(organization, month)
    local = lambda value, source=pytz.UTC: source.localize(get_datetime(value)).astimezone(zone).strftime("%Y-%m-%d %H:%M") if value else ""  # noqa: E731
    system = pytz.timezone(frappe.utils.get_system_timezone())

    def booking(name):
        return frappe.db.get_value("Appointment", name, ["appointment_id", "client_name"], as_dict=True) or frappe._dict()

    def receipt(payment, kind):
        return frappe.db.get_value("Payment Receipt", {"booking_payment": payment, "kind": kind, "status": "Issued"}, "receipt_number") or ""

    payments = []
    for row in frappe.get_all(
        "Booking Payment",
        filters={"organization": organization, "status": ["in", ["Paid", "Refunded"]], "paid_at": ["between", [utc_start, utc_end - timedelta(microseconds=1)]]},
        fields=["name", "appointment", "method", "collector", "amount", "currency", "paid_at"], order_by="paid_at asc",
    ):
        info = booking(row.appointment)
        payments.append(dict(date=local(row.paid_at), booking=info.appointment_id or row.appointment, receipt=receipt(row.name, "Payment"),
                             customer=info.client_name or "", method=row.method, collector=row.collector, status="Paid",
                             amount=flt(row.amount), currency=row.currency or "ETB"))
    refunds = []
    for row in frappe.get_all(
        "Booking Payment",
        filters={"organization": organization, "status": "Refunded", "refunded_at": ["between", [utc_start, utc_end - timedelta(microseconds=1)]]},
        fields=["name", "appointment", "method", "collector", "refund_amount", "currency", "refunded_at"], order_by="refunded_at asc",
    ):
        info = booking(row.appointment)
        refunds.append(dict(date=local(row.refunded_at), booking=info.appointment_id or row.appointment, receipt=receipt(row.name, "Refund"),
                            customer=info.client_name or "", method=row.method, collector=row.collector, status="Refunded",
                            amount=flt(row.refund_amount), currency=row.currency or "ETB"))
    fees, payouts = [], []
    for row in frappe.get_all(
        "Platform Ledger Entry",
        filters={"organization": organization, "creation": ["between", [sys_start, sys_end - timedelta(microseconds=1)]]},
        fields=["entry_type", "amount", "status", "appointment", "booking_payment", "creation"], order_by="creation asc",
    ):
        info = booking(row.appointment) if row.appointment else frappe._dict()
        collector = frappe.db.get_value("Booking Payment", row.booking_payment, "collector") if row.booking_payment else ""
        line = dict(date=local(row.creation, system), booking=info.appointment_id or row.appointment or "", receipt="",
                    customer=info.client_name or "", method="", collector=collector or "", status=row.status,
                    amount=flt(row.amount), currency="ETB")
        (fees if row.entry_type == "Platform fee" else payouts).append(line)

    total = lambda rows, **match: round(sum(r["amount"] for r in rows if all(r[k] == v for k, v in match.items())), 2)  # noqa: E731
    totals = dict(
        collected_business=total(payments, collector="Business"),
        collected_platform=total(payments, collector="Platform"),
        refunded_business=total(refunds, collector="Business"),
        refunded_platform=total(refunds, collector="Platform"),
        fees_due=total(fees, status="Due"), fees_waived=total(fees, status="Waived"), fees_settled=total(fees, status="Settled"),
        payouts_due=total(payouts, status="Due"), payouts_settled=total(payouts, status="Settled"),
    )
    # Fees on payments the platform collected are already deducted from the payout.
    business_fees = total(fees, collector="Business", status="Due") + total(fees, collector="Business", status="Settled")
    totals["net"] = round(
        totals["collected_business"] - totals["refunded_business"] - business_fees + totals["payouts_due"] + totals["payouts_settled"], 2
    )
    return dict(
        organization=organization, organization_name=frappe.db.get_value("Organization", organization, "organization_name"),
        month=month, timezone=zone.zone, currency="ETB",
        payments=payments, refunds=refunds, fees=fees, payouts=payouts, totals=totals,
        has_activity=bool(payments or refunds or fees or payouts),
    )


# ---------------------------------------------------------------------------
# Files
# ---------------------------------------------------------------------------
def to_csv(data):
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(CSV_COLUMNS)
    for section in ("payments", "refunds", "fees", "payouts"):
        for row in data[section]:
            writer.writerow([section, *(row[c] for c in CSV_COLUMNS[1:])])
    writer.writerow([])
    for key, value in data["totals"].items():
        writer.writerow(["total", "", "", "", "", "", "", key, f"{value:.2f}", data["currency"]])
    return out.getvalue()


def to_pdf(data, language="en"):
    from frappe.utils.pdf import get_pdf

    def t(text, *args):
        return _(text, lang=language).format(*(escape_html(str(arg)) for arg in args))

    money = lambda value: f"{data['currency']} {flt(value):,.2f}"  # noqa: E731
    status = {"Paid": t("Paid"), "Refunded": t("Refunded"), "Due": t("Due"), "Waived": t("Waived"), "Settled": t("Settled")}
    sections = [
        (t("Payments received"), data["payments"]), (t("Refunds"), data["refunds"]),
        (t("Platform fees"), data["fees"]), (t("Payouts to the business"), data["payouts"]),
    ]
    totals = data["totals"]
    context = dict(
        lang=language, font_url=font_url(),
        title=t("Monthly statement"), business=escape_html(data["organization_name"] or ""),
        period=t("{0} · times in {1}", data["month"], data["timezone"]),
        columns=[t("Date"), t("Booking"), t("Receipt"), t("Customer"), t("Collected by"), t("Status"), t("Amount")],
        sections=[(name, [[escape_html(x) for x in (r["date"], r["booking"], r["receipt"], r["customer"],
                                                     t("Business") if r["collector"] == "Business" else t("Platform") if r["collector"] == "Platform" else "",
                                                     status.get(r["status"], r["status"]), money(r["amount"]))] for r in rows])
                  for name, rows in sections],
        empty=t("No entries."),
        totals=[(t(label), escape_html(money(totals[key]))) for label, key in (
            ("Collected by the business", "collected_business"), ("Collected by the platform", "collected_platform"),
            ("Refunded", "refunded_business"), ("Platform fees due", "fees_due"), ("Platform fees settled", "fees_settled"),
            ("Platform fees waived", "fees_waived"), ("Payouts due", "payouts_due"), ("Payouts settled", "payouts_settled"),
        )],
        net_label=t("Net to the business"), net=escape_html(money(totals["net"])),
        note=t("Payment statement — not a tax document."),
    )
    return get_pdf(frappe.render_template(TEMPLATE, context), {"orientation": "Landscape"})


# ---------------------------------------------------------------------------
# APIs
# ---------------------------------------------------------------------------
@frappe.whitelist()
def get_statement(organization, month):
    _require(organization)
    return build(organization, month)


@frappe.whitelist()
def download(organization, month, file_format="pdf", language=None):
    _require(organization)
    data = build(organization, month)
    slug = re.sub(r"[^A-Za-z0-9]+", "-", data["organization_name"] or organization).strip("-").lower()
    if file_format == "csv":
        frappe.local.response.filename = f"statement-{slug}-{month}.csv"
        frappe.local.response.filecontent = to_csv(data)
        frappe.local.response.type = "download"
        return
    frappe.local.response.filename = f"statement-{slug}-{month}.pdf"
    frappe.local.response.filecontent = to_pdf(data, language if language in ("en", "am") else frappe.local.lang or "en")
    frappe.local.response.type = "pdf"


# ---------------------------------------------------------------------------
# Monthly email
# ---------------------------------------------------------------------------
def previous_month(organization, now=None):
    zone = pytz.timezone(business_zone(organization))
    today = (now or datetime.now(pytz.UTC)).astimezone(zone).date().replace(day=1)
    last = today - timedelta(days=1)
    return f"{last:%Y-%m}"


def send_monthly_statements():
    """Cron on the 1st: email last month's statement to each business owner with activity, once."""
    names = set(frappe.get_all("Booking Payment", pluck="organization", distinct=True)) | set(
        frappe.get_all("Platform Ledger Entry", pluck="organization", distinct=True)
    )
    sent = 0
    for organization in sorted(names):
        month = previous_month(organization)
        key = f"appointment_statement_sent:{organization}"
        if frappe.db.get_default(key) == month:
            continue
        data = build(organization, month)
        owner = frappe.db.get_value("Organization", organization, "owner_user")
        recipient = frappe.db.get_value("User", owner, "email") if owner else None
        if data["has_activity"] and recipient:
            language = frappe.db.get_value("User", owner, "language") or "en"
            language = language if language in ("en", "am") else "en"
            frappe.sendmail(
                recipients=[recipient],
                subject=_("Your {0} statement for {1}", lang=language).format(data["organization_name"], month),
                message=_("Hello, your monthly payment statement for {0} is attached as PDF and CSV.", lang=language).format(escape_html(month)),
                attachments=[
                    {"fname": f"statement-{month}.pdf", "fcontent": to_pdf(data, language)},
                    {"fname": f"statement-{month}.csv", "fcontent": to_csv(data)},
                ],
                reference_doctype="Organization", reference_name=organization,
            )
            sent += 1
        frappe.db.set_default(key, month)
    return {"sent": sent}
