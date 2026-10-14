"""QA fixtures for "Use this template" carried from the landing gallery to website setup.

- `setup()` picks a fresh sign-up identity (email and a generated password). The run signs up through
  the real pages from the Ergata card, creates the business in onboarding and starts its website
  draft; the second scenario signs in as that owner and switches the draft to Bloom Hair.
- `cleanup()` removes exactly what that account created: its website drafts and brand profiles, then
  the account and its business (`growth_marketing_qa_fixtures.remove_signup`). Records go through
  `frappe.delete_doc`, so their lifecycle hooks run.

Run `setup` before `qa/manifests/growth/template-preselect.yaml` and `cleanup` afterwards.
"""

import json
import secrets

import frappe

from appointment.tests.growth_marketing_qa_fixtures import remove_signup

STATE_KEY = "appointment_growth_template_preselect_qa"
FULL_NAME = "Yonas Haile"
BUSINESS_NAME = "Yonas Haile Counselling"
LOCATION_NAME = "Kazanchis office"
SERVICE_NAME = "Individual counselling"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    token = secrets.token_hex(3)
    state = {
        "email": f"yonas.haile.{token}@example.test",
        # Generated per run, never stored in the repository; cleanup forgets it.
        "password": secrets.token_urlsafe(12) + "Aa1!",
        "token": token,
    }
    frappe.db.set_default(STATE_KEY, json.dumps(state))
    frappe.db.commit()
    return {"email": state["email"]}


def browser_values(manifest=None):
    state = _state()
    token = state.get("token", "")
    return {
        "qa_tp_full_name": FULL_NAME,
        "qa_tp_email": state.get("email", ""),
        "qa_tp_password": state.get("password", ""),
        "qa_tp_business": f"{BUSINESS_NAME} {token}".strip(),
        "qa_tp_location": LOCATION_NAME,
        "qa_tp_service": SERVICE_NAME,
        "qa_tp_address": f"yonas-haile-counselling-{token}" if token else "",
    }


def cleanup():
    frappe.set_user("Administrator")
    email = _state().get("email")
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # The booking-URL sync commits; cleanup commits once at the end.
    try:
        if email:
            _remove_websites(email)
            remove_signup(email)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def _remove_websites(email: str):
    """The website drafts and brand profiles of the businesses this account created."""
    if not email or "@" not in email:
        return  # Never build delete filters from an empty value.
    organizations = frappe.get_all("Organization", filters={"owner_user": email}, pluck="name")
    for organization in organizations:
        for doctype in ("Public Site", "Brand Profile"):
            for name in frappe.get_all(doctype, filters={"organization": organization}, pluck="name"):
                frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)


def _state() -> dict:
    return json.loads(frappe.db.get_default(STATE_KEY) or "{}")
