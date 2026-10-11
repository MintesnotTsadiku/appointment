"""Growth Settings: switches and texts for the organic-growth features."""

from frappe.utils import cint

from appointment.growth import cache
from appointment.growth.language import pick

DOCTYPE = "Growth Settings"
FLAGS = (
    "powered_by_pages", "powered_by_emails", "powered_by_sms", "book_again_enabled",
    "customer_business_prompt_enabled", "posters_enabled", "business_referrals_enabled",
    "customer_referrals_enabled", "partner_program_enabled", "tools_enabled",
    "directory_enabled", "year_review_enabled", "template_credit_enabled",
)
NUMBERS = (
    "referral_threshold_bookings", "referral_reward_free_bookings", "customer_referral_default_percent",
    "partner_reward_free_bookings", "marketing_live_minutes",
)
TEXTS = ("own_page_text", "share_message")


def growth() -> dict:
    """Flags as booleans, numbers as ints, texts in the current language plus their `_en`/`_am` pair."""
    values = cache.stored(DOCTYPE)
    result = {flag: bool(cint(values.get(flag))) for flag in FLAGS}
    result.update({number: cint(values.get(number)) for number in NUMBERS})
    result.update({text: pick(values, text) for text in TEXTS})
    for text in TEXTS:
        result.update({f"{text}_en": values.get(f"{text}_en") or "", f"{text}_am": values.get(f"{text}_am") or ""})
    return result


def share_message(business: str, link: str) -> str:
    """The share message with `{business}` and `{link}` filled in."""
    from appointment.growth.sharing import fill_message

    return fill_message(growth()["share_message"], business, link)
