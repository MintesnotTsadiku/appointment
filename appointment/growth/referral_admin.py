"""Platform administrator view of the referral loop: referrals, sign-up sources and partners."""

from datetime import timedelta

import frappe
from frappe.query_builder.functions import Count, Sum
from frappe.utils import cint, now_datetime

from appointment.growth.partners import partner_row, require_admin
from appointment.growth.settings import growth

LIST_LIMIT = 200
WINDOWS = (30, 90)


@frappe.whitelist()
def overview():
    require_admin()
    settings = growth()
    return dict(
        settings=dict(
            business_referrals_enabled=settings["business_referrals_enabled"],
            partner_program_enabled=settings["partner_program_enabled"],
            threshold=cint(settings["referral_threshold_bookings"]),
            reward=cint(settings["referral_reward_free_bookings"]),
            partner_reward=cint(settings["partner_reward_free_bookings"]),
        ),
        totals=_totals(),
        referrals=_referrals(),
        sources={str(days): _sources(days) for days in WINDOWS},
        partners=_partners(),
    )


def _totals():
    counts = {status: frappe.db.count("Business Referral", {"status": status}) for status in ("Pending", "Qualified", "Rewarded")}
    credit = frappe.qb.DocType("Free Booking Credit")
    rows = (frappe.qb.from_(credit).select(credit.status, Sum(credit.free_bookings).as_("total")).groupby(credit.status)).run(as_dict=True)
    credits = {row.status: cint(row.total) for row in rows}
    return dict(
        **{status.lower(): count for status, count in counts.items()},
        credited_free_bookings=credits.get("Credited", 0),
        partner_payout_owed=credits.get("Payout owed", 0),
        pending_partners=frappe.db.count("Growth Partner", {"status": "Pending"}),
    )


def _referrals():
    threshold = max(1, cint(growth()["referral_threshold_bookings"]))
    rows = frappe.get_all(
        "Business Referral",
        fields=["name", "referred_name", "referrer_name", "referrer_partner", "referral_code", "source", "status",
                "qualifying_bookings", "creation", "rewarded_at"],
        order_by="creation desc", limit=LIST_LIMIT,
    )
    for row in rows:
        row["threshold"] = threshold
        row["referrer_kind"] = "Partner" if row.referrer_partner else "Business"
        row["joined_on"] = str(row.creation)[:10]
    return rows


def _sources(days):
    """New businesses per sign-up source in the last `days` days, largest first."""
    signup = frappe.qb.DocType("Business Signup Source")
    since = now_datetime() - timedelta(days=days)
    rows = (
        frappe.qb.from_(signup).select(signup.source, Count(signup.name).as_("count"))
        .where((signup.status == "Attached") & (signup.attached_at >= since))
        .groupby(signup.source)
    ).run(as_dict=True)
    return sorted(({"source": row.source or "direct", "count": cint(row.count)} for row in rows), key=lambda row: (-row["count"], row["source"]))


def _partners():
    docs = frappe.get_all(
        "Growth Partner",
        fields=["name", "partner_name", "organization_name", "email", "phone", "kind", "message", "status", "referral_code", "creation"],
        order_by="creation desc", limit=LIST_LIMIT,
    )
    docs.sort(key=lambda doc: ("Pending", "Approved", "Rejected").index(doc.status))  # Stable: newest first within a status.
    referred = _rewarded_by_partner()
    rows = []
    for doc in docs:
        row = partner_row(doc)
        row["qualified_businesses"] = referred.get(doc.name, 0)
        rows.append(row)
    return rows


def _rewarded_by_partner():
    referral = frappe.qb.DocType("Business Referral")
    rows = (
        frappe.qb.from_(referral).select(referral.referrer_partner, Count(referral.name).as_("total"))
        .where((referral.status == "Rewarded") & referral.referrer_partner.isnotnull())
        .groupby(referral.referrer_partner)
    ).run(as_dict=True)
    return {row.referrer_partner: cint(row.total) for row in rows}
