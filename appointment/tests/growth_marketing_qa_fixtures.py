"""QA fixtures for the marketing workstream (landing promise, /partners, sign-up timing).

- `setup()` picks a fresh sign-up identity (email and a generated password) for the timing run,
  which signs up through the real pages, creates a business and publishes its booking page.
- `cleanup()` removes that account, the business the run created, and the partner application the
  /partners run submitted. Records go through `frappe.delete_doc`, so their lifecycle hooks run.

Run `setup` before `qa/manifests/growth/marketing-*.yaml` and `cleanup` afterwards (`$G/qa.sh` does both).
"""

import json
import secrets

import frappe

STATE_KEY = "appointment_growth_marketing_qa"
FULL_NAME = "Selam Tadesse"
BUSINESS_NAME = "Selam Beauty Bole"
LOCATION_NAME = "Bole Medhanialem"
SERVICE_NAME = "Hair styling"
PARTNER_NAME = "Hiwot Alemu"
PARTNER_ORGANIZATION = "Addis Beauty Academy"
PARTNER_DOMAIN = "addis-beauty-academy.example.test"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    token = secrets.token_hex(3)
    state = {
        "email": f"selam.tadesse.{token}@example.test",
        # Generated per run, never stored in the repository; cleanup forgets it.
        "password": secrets.token_urlsafe(12) + "Aa1!",
        "partner_email": f"hiwot.{token}@{PARTNER_DOMAIN}",
        "token": token,
    }
    frappe.db.set_default(STATE_KEY, json.dumps(state))
    frappe.db.commit()
    return {"email": state["email"]}


def browser_values(manifest=None):
    state = _state()
    return {
        "qa_mkt_full_name": FULL_NAME,
        "qa_mkt_email": state.get("email", ""),
        "qa_mkt_password": state.get("password", ""),
        "qa_mkt_business": f"{BUSINESS_NAME} {state.get('token', '')}".strip(),
        "qa_mkt_location": LOCATION_NAME,
        "qa_mkt_service": SERVICE_NAME,
        "qa_mkt_partner_name": PARTNER_NAME,
        "qa_mkt_partner_org": PARTNER_ORGANIZATION,
        "qa_mkt_partner_email": state.get("partner_email", ""),
    }


def cleanup():
    frappe.set_user("Administrator")
    state = _state()
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # The booking-URL sync commits; cleanup commits once at the end.
    try:
        if state.get("email"):
            remove_signup(state["email"])
        remove_partners(PARTNER_DOMAIN)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def remove_signup(email: str):
    """Remove an account made through /signup and every business it created."""
    if not email or "@" not in email:
        return  # Never build delete filters from an empty value.
    organizations = frappe.get_all("Organization", filters={"owner_user": email}, pluck="name")
    providers = frappe.get_all("Provider", filters={"user": email}, pluck="name")
    for organization in organizations:
        _remove_linked(organization, "Organization", "organization")
    for provider in providers:
        _remove_linked(provider, "Provider", "independent_provider")
    for doctype, field in (("Business Signup Source", "signup_user"), ("Business Membership", "user"), ("Provider", "user")):
        for name in frappe.get_all(doctype, filters={field: email}, pluck="name"):
            frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
    for organization in organizations:
        frappe.delete_doc("Organization", organization, ignore_permissions=True, force=True)
    if frappe.db.exists("User", email):
        from frappe.sessions import clear_sessions

        clear_sessions(user=email, force=True)
        frappe.delete_doc("User", email, ignore_permissions=True, force=True)


def remove_partners(domain: str):
    """Partner applications from the QA partner domain (workstream C's Partner DocType)."""
    if not domain:
        return
    doctype = _partner_doctype()
    if not doctype:
        return
    for name in frappe.get_all(doctype, filters={"email": ["like", f"%@{domain}"]}, pluck="name"):
        # Codes and credits issued to an approved QA partner go first.
        for linked in ("Free Booking Credit", "Business Referral Code"):
            for row in frappe.get_all(linked, filters={"growth_partner": name}, pluck="name"):
                frappe.delete_doc(linked, row, ignore_permissions=True, force=True)
        frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)


def _partner_doctype():
    for name in ("Growth Partner", "Partner", "Referral Partner"):
        if frappe.db.exists("DocType", name) and frappe.get_meta(name).has_field("email"):
            return name
    return None


# Records a new business owns, removed child-first. Each entry is (doctype, owner field).
_OWNED = (
    "Free Booking Credit", "Business Referral", "Business Referral Code", "Business Signup Source", "Appointment", "Walk In", "Appointment Notification", "Customer Notification Opt Out", "Customer Profile",
    "Customer Notification Settings", "Booking URL", "EventType", "Service", "Location", "Business Membership",
    "Business Entitlement", "Public Site",
)


def _remove_linked(owner: str, owner_doctype: str, independent_field: str):
    if not owner:
        return
    for doctype in _OWNED:
        if not frappe.db.exists("DocType", doctype):
            continue
        meta = frappe.get_meta(doctype)
        fields = [f.fieldname for f in meta.fields if f.fieldtype == "Link" and f.options == owner_doctype]
        if owner_doctype == "Provider" and meta.has_field(independent_field):
            fields.append(independent_field)
        for field in dict.fromkeys(fields):
            for name in frappe.get_all(doctype, filters={field: owner}, pluck="name"):
                if frappe.db.exists(doctype, name):
                    frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
    # EventTypes link the provider and the service, not always the organization.
    if owner_doctype == "Organization":
        for provider in frappe.get_all("Provider Organization", filters={"organization": owner}, pluck="parent"):
            for name in frappe.get_all("EventType", filters={"provider": provider}, pluck="name"):
                frappe.delete_doc("EventType", name, ignore_permissions=True, force=True)


def _state() -> dict:
    return json.loads(frappe.db.get_default(STATE_KEY) or "{}")
