"""Seeded defaults for the platform brand and growth settings.

Runs after install and after every migrate. It only fills values that were never
saved, so an administrator's choices always win.
"""

import frappe

BRAND_DEFAULTS = {
    "product_name": "Meet.et",
    "product_url": "https://meet.et",
    "short_host": "meet.et",
    "tagline_en": "Online booking for Ethiopian service businesses.",
    "tagline_am": "ለኢትዮጵያ የአገልግሎት ንግዶች የኦንላይን ቀጠሮ ማስያዣ።",
    "mark": "/assets/appointment/appointment-logo.png",
    "og_image": "/assets/appointment/frontend/icons/icon-512x512.png",
    "primary_color": "#A23B72",
}

GROWTH_DEFAULTS = {
    "powered_by_pages": 1,
    "powered_by_emails": 1,
    "powered_by_sms": 1,
    "own_page_text_en": "Get your own booking page — free",
    "own_page_text_am": "የራስዎን የቀጠሮ ገጽ በነጻ ያግኙ",
    "book_again_enabled": 1,
    "customer_business_prompt_enabled": 1,
    "share_message_en": "Book with {business} online: {link}",
    "share_message_am": "ከ{business} ጋር ቀጠሮ ይያዙ፦ {link}",
    "posters_enabled": 1,
    "business_referrals_enabled": 1,
    "referral_threshold_bookings": 20,
    "referral_reward_free_bookings": 50,
    "customer_referrals_enabled": 1,
    "customer_referral_default_percent": 10,
    "partner_program_enabled": 1,
    "partner_reward_free_bookings": 50,
    "tools_enabled": 1,
    "directory_enabled": 1,
    "year_review_enabled": 1,
    "template_credit_enabled": 1,
    "marketing_live_minutes": 5,
}


def ensure_defaults():
    """Fill brand and growth values that were never set. Safe to run any number of times."""
    _fill("Platform Brand Settings", BRAND_DEFAULTS)
    _fill("Growth Settings", GROWTH_DEFAULTS)


def _fill(doctype: str, defaults: dict):
    if not frappe.db.table_exists("Singles") or not frappe.db.exists("DocType", doctype):
        return
    # Install stores a single's fields empty without saving it (no `creation`). Until the first save,
    # fill every empty field. After it, fill only fields never stored (new fields), so a text the
    # admin cleared on purpose, or a switch set to 0, stays as chosen.
    singles = frappe.qb.Table("tabSingles")
    stored = dict(frappe.qb.from_(singles).select(singles.field, singles.value).where(singles.doctype == doctype).run())
    if stored.get("creation"):
        missing = {field: value for field, value in defaults.items() if field not in stored}
    else:
        missing = {field: value for field, value in defaults.items() if stored.get(field) in (None, "")}
    if not missing:
        return
    doc = frappe.get_single(doctype)
    doc.update(missing)
    doc.flags.ignore_permissions = True
    doc.save()
