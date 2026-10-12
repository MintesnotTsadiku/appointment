"""QA fixture for qa/manifests/growth/solo-success.yaml: solo setup ends on the live booking page.

- `setup()` makes three fresh accounts (one per scenario) with generated passwords. The browser signs
  in, runs solo setup and lands on the success screen.
- `browser_values()` gives the manifest the sign-in details and the business and service names.
- `cleanup()` removes exactly those accounts and the independent business each one created,
  through `frappe.delete_doc` so lifecycle hooks run. Nothing else is touched.

`$G/qa.sh qa/manifests/growth/solo-success.yaml appointment.tests.growth_solo_success_qa_fixtures`
runs `setup` before and `cleanup` after.
"""

import json
import secrets

import frappe

from appointment.tests.growth_marketing_qa_fixtures import remove_signup

STATE_KEY = "appointment_growth_solo_success_qa"
EMAIL_DOMAIN = "example.test"
# One fresh owner per scenario: (key, first name, last name, business, service).
OWNERS = (
    ("en", "Tigist", "Bekele", "Tigist Beauty Corner", "Eyelash extensions"),
    ("am", "Hanna", "Girma", "ሐና የፀጉር ሥራ", "የፀጉር ሹሩባ"),
    ("draft", "Dawit", "Mengistu", "Dawit Barber Shop", "Haircut and beard trim"),
)


def setup():
    frappe.set_user("Administrator")
    cleanup()
    token = secrets.token_hex(3)
    state = {"token": token, "accounts": {}}
    for key, first, last, _business, _service in OWNERS:
        email = f"{first.lower()}.{last.lower()}.{token}@{EMAIL_DOMAIN}"
        # Generated per run and never stored in the repository; cleanup forgets it.
        password = secrets.token_urlsafe(12) + "Aa1!"
        user = frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name=last, enabled=1,
                                   user_type="Website User", send_welcome_email=0, language="en"))
        user.new_password = password
        user.insert(ignore_permissions=True)
        state["accounts"][key] = {"email": email, "password": password}
    frappe.db.set_default(STATE_KEY, json.dumps(state))
    frappe.db.commit()
    return {"accounts": [account["email"] for account in state["accounts"].values()]}


def browser_values(manifest=None):
    state = _state()
    values = {}
    for key, _first, _last, business, service in OWNERS:
        account = state.get("accounts", {}).get(key, {})
        values.update({
            f"qa_solo_{key}_email": account.get("email", ""),
            f"qa_solo_{key}_password": account.get("password", ""),
            f"qa_solo_{key}_business": business,
            f"qa_solo_{key}_service": service,
        })
    return values


def cleanup():
    frappe.set_user("Administrator")
    state = _state()
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # The booking-URL sync commits; cleanup commits once at the end.
    try:
        for account in state.get("accounts", {}).values():
            email = account.get("email") or ""
            # Only the exact accounts this fixture made, by their generated address.
            if email.endswith(f".{state.get('token')}@{EMAIL_DOMAIN}"):
                remove_signup(email)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def _state() -> dict:
    return json.loads(frappe.db.get_default(STATE_KEY) or "{}")
