"""Growth partners: associations, schools, trainers and Telegram admins who bring in businesses.

Anyone can apply through the public partners page. A platform administrator
approves or rejects the application; approval issues a referral code that works
like a business code. Partners are not businesses, so their rewards are recorded
as Free Booking Credit rows owed for manual payout, or credited to their own
business when one is linked.
"""

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import now_datetime, validate_email_address

from appointment.growth import referral_codes
from appointment.growth.settings import growth
from appointment.scheduler import business_owner
from appointment.helpers.phone import hint as phone_hint
from appointment.helpers.phone import normalize_phone

KINDS = ("association", "school", "trainer", "telegram", "other")
REVIEWABLE = ("Pending", "Approved", "Rejected")
MAX_NAME = 140
MAX_MESSAGE = 1000


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=3600, methods=["POST"])
def apply_partner(name, organization, email, phone, kind, message):
    """Create a Growth Partner application awaiting review. The answer never reveals other applications."""
    if not growth()["partner_program_enabled"]:
        frappe.throw(_("The partner program is not open right now."), frappe.PermissionError)
    values = _validated(name, organization, email, phone, kind, message)
    existing = frappe.db.get_value("Growth Partner", {"email": values["email"], "status": ["in", ["Pending", "Approved"]]}, "name")
    if not existing:
        frappe.get_doc(dict(doctype="Growth Partner", status="Pending", **values)).insert(ignore_permissions=True)
    return {"status": "received", "message": _("Thank you. We will review your application and reply by email.")}


def _validated(name, organization, email, phone, kind, message):
    name = _text(name, MAX_NAME)
    if not name:
        frappe.throw(_("Enter your name."))
    address = (email or "").strip().lower()
    if not address or len(address) > MAX_NAME or not validate_email_address(address):
        frappe.throw(_("Enter a valid email address."))
    number = normalize_phone(phone) if phone else ""
    if phone and not number:
        frappe.throw(phone_hint())
    if kind not in KINDS:
        frappe.throw(_("Choose what kind of partner you are."))
    return dict(
        partner_name=name, organization_name=_text(organization, MAX_NAME) or None, email=address,
        phone=number or None, kind=kind, message=_text(message, MAX_MESSAGE) or None,
    )


def _text(value, limit):
    """Plain text without surrounding space. Short fields also collapse inner whitespace."""
    if value is not None and not isinstance(value, str):
        frappe.throw(_("Enter text only."))
    text = (value or "").strip()
    return (" ".join(text.split()) if limit <= MAX_NAME else text)[:limit]


# ---------------------------------------------------------------------------
# Administrator review
# ---------------------------------------------------------------------------
def require_admin():
    if "System Manager" not in frappe.get_roles():
        frappe.throw(_("Only platform administrators can manage referrals."), frappe.PermissionError)


@frappe.whitelist(methods=["POST"])
def review(partner, status, note=None, linked_business=None):
    """Approve or reject an application. Approval issues the partner's referral code."""
    require_admin()
    if status not in ("Approved", "Rejected"):
        frappe.throw(_("Choose approve or reject."))
    doc = frappe.get_doc("Growth Partner", partner)
    if linked_business:
        business_owner.from_key(linked_business)  # Raises when the business does not exist.
        doc.linked_owner_key = linked_business
    doc.update(dict(status=status, reviewed_by=frappe.session.user, reviewed_at=now_datetime()))
    if note is not None:
        doc.review_note = (note or "").strip()[:MAX_MESSAGE] or None
    doc.save(ignore_permissions=True)
    if status == "Approved" and not doc.referral_code:
        doc.db_set("referral_code", referral_codes.partner_code(doc))
    return partner_row(doc)


def partner_row(doc):
    return dict(
        name=doc.name, partner_name=doc.partner_name, organization_name=doc.organization_name, email=doc.email,
        phone=doc.phone, kind=doc.kind, message=doc.message, status=doc.status, referral_code=doc.referral_code,
        applied_on=str(doc.creation)[:10] if doc.creation else None,
    )
