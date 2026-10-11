"""The facts behind the landing page promise: free to start, live in N minutes, Amharic everywhere.

Every number comes from configuration, so the page never claims more than the platform gives:

- the platform fee and its free allowance come from Payment Settings (`platform_fee_type`,
  `platform_fee_value`, `free_bookings`), the same values `scheduler.payments` charges with;
- the minutes come from Growth Settings `marketing_live_minutes`;
- `signup_open` follows Appointment Registration Settings.

See docs/growth/MARKETING.md.
"""

from __future__ import annotations

import frappe
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, flt

from appointment.growth.settings import growth

# How the landing page words "free". Each value has its own catalog sentence (world.promise.free*).
NO_FEE = "no_fee"  # No platform fee is configured: bookings carry no platform fee.
FREE_ALLOWANCE = "free_allowance"  # A fee is configured, but the first N paid bookings are waived.
FREE_SETUP = "free_setup"  # A fee applies from the first paid booking; sign-up and setup cost nothing.


def offer() -> dict:
    """Public, language-independent facts for the landing page and the partners page."""
    settings = frappe.get_cached_doc("Payment Settings")
    fee_type = settings.platform_fee_type or "None"
    charges_fee = fee_type in ("Fixed", "Percent") and flt(settings.platform_fee_value) > 0
    free_bookings = max(cint(settings.free_bookings), 0)
    if not charges_fee:
        free = NO_FEE
    elif free_bookings:
        free = FREE_ALLOWANCE
    else:
        free = FREE_SETUP
    return {
        "free": free,
        "free_bookings": free_bookings if free == FREE_ALLOWANCE else 0,
        "live_minutes": max(cint(growth()["marketing_live_minutes"]), 1),
        "signup_open": _signup_open(),
        "card_required": False,  # Sign-up asks for a name, an email and a password only.
    }


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=120, seconds=60)
def public_offer():
    return offer()


def _signup_open() -> bool:
    from appointment.scheduler.registration import self_signup_enabled

    return bool(self_signup_enabled())
