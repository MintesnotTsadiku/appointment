"""QA fixtures for the referral loop (workstream C).

`setup()` creates, and records by exact name:

- Meskerem Hair Studio (organization, owner qa-referrals-owner@example.test): the referrer. Its customer
  offer is on ("both friends get 10%"), Hanna Bekele has booked and has a share code, and her friend
  Lulit Tesfaye has booked with it (a voucher each).
- Hiwot Lash Studio (independent provider, owner qa-referrals-solo@example.test), for the Amharic run.
- Two businesses that joined with Meskerem's code: Kalkidan Nail Bar (in progress) and Saba Spa
  (rewarded), so the progress list shows both states.
- One partner application awaiting review.
- A fresh identity (email and generated password) for the browser sign-up through the referral link.

`cleanup()` deletes only what this module recorded: every delete uses one exact name or one exact
single-value filter (never a list, never an empty value), and it refuses to run on an empty record.
Run `setup` before `qa/manifests/growth/referrals-*.yaml` and `cleanup` afterwards ($G/qa.sh does both).
"""

import json
import secrets

import frappe
from frappe.utils.password import update_password

from appointment.growth import customer_referrals, referral_rewards, referrals
from appointment.scheduler import booking, independent, workspace
from appointment.tests import qa_days

STATE_KEY = "appointment_growth_referrals_qa"
OWNER = "qa-referrals-owner@example.test"
SOLO = "qa-referrals-solo@example.test"
JOINED = ("qa-referrals-kalkidan@example.test", "qa-referrals-saba@example.test")
BUSINESS = "Meskerem Hair Studio"
SOLO_BUSINESS = "Hiwot Lash Studio"
JOINED_BUSINESSES = ("Kalkidan Nail Bar", "Saba Spa")
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
OWN_DOCTYPES = ("Customer Referral Reward", "Customer Referral Code", "Customer Referral Offer", "Free Booking Credit",
                "Business Signup Source", "Business Referral Code")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    token = secrets.token_hex(3)
    state = {"keys": [], "users": [], "partners": [], "signup_email": f"dawit.kebede.{token}@example.test",
             # Generated per run, never stored in the repository; cleanup forgets it.
             "signup_password": secrets.token_urlsafe(12) + "Aa1!", "owner_password": secrets.token_urlsafe(12) + "Aa1!"}
    _save(state)  # Recorded first, so a failed setup can still be cleaned.
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # the booking-URL sync commits; setup commits once at the end
    try:
        owner = _org(state, OWNER, "Meskerem", "Alemu", BUSINESS)
        # The sign-up run signs in as the referrer afterwards; the password exists only for this run.
        update_password(OWNER, state["owner_password"])
        _solo(state, SOLO, "Hiwot", "Tesfaye", SOLO_BUSINESS)
        code = referrals.business_code(owner["key"])
        progress = _org(state, JOINED[0], "Kalkidan", "Haile", JOINED_BUSINESSES[0], ref=code, source="telegram_share")
        rewarded = _org(state, JOINED[1], "Saba", "Girma", JOINED_BUSINESSES[1], ref=code, source="referral")
        referral_rewards.reward(frappe.db.get_value("Business Referral", {"referred_owner_key": rewarded["key"]}, "name"))
        customer_referrals.save_offer(owner["key"], 1, "Percent", 10, None, None, 1)
        hanna = _book(owner["offering"], 0, "Hanna Bekele", f"hanna.bekele.{token}@example.test")
        state["customer_code"] = referral_codes_for(hanna)
        friend = _book(owner["offering"], 1, "Lulit Tesfaye", f"lulit.tesfaye.{token}@example.test", state["customer_code"])
        state.update(owner=owner, progress=progress, friend_booking=friend, day=str(qa_days.open_day(owner["offering"])),
                     guest_emails=[f"abel.girma.{token}@example.test", f"meron.haile.{token}@example.test"])
        partner = frappe.get_doc(dict(
            doctype="Growth Partner", partner_name="Tigist Worku", organization_name="Addis Beauty Association",
            email=f"tigist.worku.{token}@example.test", phone="+251911234567", kind="association", status="Pending",
            message="We train about 200 stylists a year and run a Telegram group for salon owners.",
        )).insert(ignore_permissions=True)
        state["partners"].append(partner.name)
    finally:
        frappe.flags.syncing_booking_urls = previous
        frappe.set_user("Administrator")
        _save(state)
    frappe.db.commit()
    return {"code": code, "customer_code": state.get("customer_code")}


def browser_values(manifest=None):
    state = _state()
    owner = state.get("owner") or {}
    return {
        "qa_ref_owner_slug": owner.get("slug", ""),
        "qa_ref_owner_offering": owner.get("offering", ""),
        "qa_ref_code": frappe.db.get_value("Business Referral Code", {"owner_key": owner.get("key") or "-"}, "name") or "",
        "qa_ref_customer_code": state.get("customer_code", ""),
        "qa_ref_friend_booking": state.get("friend_booking", ""),
        "qa_ref_day": state.get("day", ""),
        "qa_ref_guest_1": (state.get("guest_emails") or ["", ""])[0],
        "qa_ref_guest_2": (state.get("guest_emails") or ["", ""])[1],
        "qa_ref_signup_email": state.get("signup_email", ""),
        "qa_ref_signup_password": state.get("signup_password", ""),
        "qa_ref_signup_business": "Dawit Barber Lounge",
        "qa_ref_owner_email": OWNER,
        "qa_ref_owner_password": state.get("owner_password", ""),
        "qa_ref_partner": (state.get("partners") or [""])[0],
    }


def referral_codes_for(appointment):
    from appointment.growth import referral_codes

    return referral_codes.customer_code(frappe.db.get_value("Appointment", appointment, "customer"))


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
def cleanup():
    """Delete what `setup` and the browser runs recorded. Nothing is filtered by a list or an empty value."""
    frappe.set_user("Administrator")
    state = _state()
    signup = state.get("signup_email")
    if signup and frappe.db.exists("User", signup):
        state.setdefault("users", []).append(signup)
        for org in frappe.get_all("Organization", filters={"owner_user": signup}, pluck="name"):
            state.setdefault("keys", []).append(org)
    if not state.get("keys") and not state.get("users") and not state.get("partners"):
        return  # Nothing recorded: refuse to look for records by any wider rule.
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for partner in state.get("partners") or []:
            _delete_where("Business Referral Code", "owner_key", "Partner:" + partner)
            _delete_where("Free Booking Credit", "growth_partner", partner)
            _delete_one("Growth Partner", partner)
        for key in state.get("keys") or []:
            _remove_business(key)
        for user in state.get("users") or []:
            _delete_where("Business Signup Source", "signup_user", user)
            # Onboarding gives the new owner a Provider record that no organization row points to.
            _delete_where("Provider", "user", user)
            _delete_where("Business Membership", "user", user)
            _delete_one("User", user)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def _remove_business(key):
    _require(key)
    for doctype in OWN_DOCTYPES:
        _delete_where(doctype, "owner_key", key)
    for referral in frappe.get_all("Business Referral", filters={"referred_owner_key": key}, pluck="name") + \
            frappe.get_all("Business Referral", filters={"referrer_owner_key": key}, pluck="name"):
        _delete_where("Free Booking Credit", "business_referral", referral)
        _delete_one("Business Referral", referral)
    if key.startswith("Provider:"):
        provider = key.removeprefix("Provider:")
        bookings = frappe.get_all("Appointment", filters={"provider": provider}, pluck="name")
        owned = ("independent_provider", provider)
    else:
        provider = None
        bookings = frappe.get_all("Appointment", filters={"organization": key}, pluck="name")
        owned = ("organization", key)
    for name in bookings:
        _delete_where("Appointment Notification", "appointment", name)
        _delete_where("Booking Payment", "appointment", name)
        _delete_one("Appointment", name)
    services = frappe.get_all("Service", filters={owned[0]: owned[1]}, pluck="name")
    for service in services:
        _delete_where("EventType", "service", service)
        _delete_one("Service", service)
    for doctype in ("Customer Profile", "Location"):
        _delete_where(doctype, owned[0], owned[1])
    if provider:
        _delete_one("Provider", provider)
        return
    _delete_where("Business Membership", "organization", key)
    for name in frappe.get_all("Provider Organization", filters={"organization": key, "parenttype": "Provider"}, pluck="parent"):
        _delete_one("Provider", name)
    _delete_one("Organization", key)


def _delete_where(doctype, field, value):
    """Delete the rows whose `field` equals one non-empty value."""
    _require(value)
    for name in frappe.get_all(doctype, filters={field: value}, pluck="name"):
        _delete_one(doctype, name)


def _delete_one(doctype, name):
    _require(name)
    if frappe.db.exists(doctype, name):
        frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)


def _require(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Refusing a cleanup filter without one exact value.")


# ---------------------------------------------------------------------------
# Setup helpers
# ---------------------------------------------------------------------------
def _user(state, email, first, last):
    frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name=last, send_welcome_email=0, enabled=1,
                        user_type="System User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    state["users"].append(email)
    _save(state)


def _org(state, email, first, last, name, ref=None, source=None):
    _user(state, email, first, last)
    referrals.remember_signup(email, ref, source)
    frappe.set_user(email)
    row = workspace.create(name, f"{name}, Bole", "Haircut and styling", "Africa/Addis_Ababa", 45, "08:30", "18:30",
                           list(DAYS), "qa-referrals-" + secrets.token_hex(8))
    workspace.publish(row["organization"], 1)
    frappe.set_user("Administrator")
    state["keys"].append(row["organization"])
    _save(state)
    return {"key": row["organization"], "offering": row["offering"], "slug": frappe.db.get_value("Organization", row["organization"], "slug")}


def _solo(state, email, first, last, name):
    from appointment.public_experience import solo_setup

    _user(state, email, first, last)
    referrals.remember_signup(email, None, "directory")
    frappe.set_user(email)
    provider = solo_setup.create(name)["provider"]
    state["keys"].append("Provider:" + provider)
    _save(state)
    row = independent.create(provider, f"{name}, Piassa", "Lash lift", "Africa/Addis_Ababa", 60, "09:00", "18:00", list(DAYS))
    independent.publish(provider, 1)
    frappe.set_user("Administrator")
    return {"key": "Provider:" + provider, "offering": row["offering"]}


def _book(offering, index, name, email, code=""):
    day = qa_days.open_day(offering)
    slot = [s for s in booking.slots(offering, day)["all_available_slots_for_data"] if s["available"]][index]
    frappe.set_user("Guest")
    result = booking.book(offering, slot["start_time"], slot["end_time"], name, email, "qa-referrals-" + secrets.token_hex(8),
                          referral_source="customer_referral" if code else "", referral_code=code)
    frappe.set_user("Administrator")
    return result["booking_id"]


def _state():
    return json.loads(frappe.db.get_default(STATE_KEY) or "{}")


def _save(state):
    frappe.db.set_default(STATE_KEY, json.dumps(state))
