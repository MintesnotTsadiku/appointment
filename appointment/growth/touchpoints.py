"""Customer touchpoints: the "Powered by" line, book-again links and the SMS segment guard.

Every customer email, SMS and public booking page is a small advert for the platform:
a quiet "Powered by" line with a sign-up link that carries `?source=<channel>`, and a
"Book again" link that sends the customer straight back to the same business and service.
The Growth Settings flags switch each part on or off. See docs/growth/TOUCHPOINTS.md.
"""

import math
from contextlib import contextmanager
from urllib.parse import urlencode

import frappe
from frappe import _
from frappe.utils import escape_html, get_url

from appointment.growth.brand import brand
from appointment.growth.settings import growth
from appointment.scheduler import business_owner

# Emails that carry the book-again link. There is no post-visit email, so the
# confirmation and the receipt carry it as well as the reminder.
BOOK_AGAIN_EMAILS = ("Confirmation", "Reminder", "Payment receipt")
BOOK_AGAIN_SMS = ("Reminder",)

# GSM 03.38: the basic table costs one septet, the extension table two.
GSM_BASIC = frozenset(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?"
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
)
GSM_EXTENDED = frozenset("^{}\\[~]|€\f")
GSM_SINGLE, GSM_PART = 160, 153
UCS2_SINGLE, UCS2_PART = 70, 67


# ---------------------------------------------------------------------------
# Language
# ---------------------------------------------------------------------------
@contextmanager
def language(lang):
    """Read brand and growth texts in `lang` ("en" or "am"), as a background job has no request language."""
    previous = getattr(frappe.local, "lang", None)
    frappe.local.lang = lang if lang in ("en", "am") else "en"
    try:
        yield
    finally:
        frappe.local.lang = previous


# ---------------------------------------------------------------------------
# Links
# ---------------------------------------------------------------------------
def signup_path(source, **params):
    """The platform sign-up path with `?source=<channel>`. Never carries personal data."""
    return "/signup?" + urlencode({"source": source, **{key: value for key, value in params.items() if value}})


def signup_url(source):
    """Absolute sign-up URL on the platform's product site (same rule as the SPA `PoweredBy`)."""
    return brand()["product_url"] + signup_path(source)


def short_signup_link(source):
    """`<short host>/signup?source=…` without the scheme, for SMS."""
    return f"{brand()['short_host']}{signup_path(source)}"


def book_again_path(owner, offering=None, checked=None):
    """The business's booking page, with the same service preselected when that offering is still bookable.

    Organizations: `/schedule/org/<slug>/<offering>`, else `/<slug>/book`.
    Independent providers: `/schedule/p/<page address>/<offering>`, else their provider page
    (`/schedule/individual/<offering>` paths only before the provider has a page address).
    `checked` is an optional dict that remembers offerings already resolved, for lists.
    """
    if not owner:
        return ""
    if offering and _bookable(offering, checked if checked is not None else {}):
        if owner.organization and owner.slug:
            return f"/schedule/org/{owner.slug}/{offering}"
        if owner.provider:
            return f"/schedule/p/{owner.page_slug}/{offering}" if owner.get("page_slug") else f"/schedule/individual/{offering}"
    return owner.book_path or ""


def book_again_url(doc):
    """Absolute book-again URL for an Appointment, or "" when the business has no public booking page."""
    path = book_again_path(business_owner.for_booking(doc), doc.get("event_type"))
    return get_url(path) if path else ""


def _bookable(offering, checked):
    from appointment.scheduler.booking import offering as resolve

    if offering not in checked:
        try:
            resolve(offering, public=True)
            checked[offering] = True
        except Exception:
            frappe.clear_messages()
            checked[offering] = False
    return checked[offering]


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
def email_context(event, doc, lang):
    """Extra template values for one customer email: the book-again button and the platform footer.

    Values are escaped here, like the rest of the email context.
    """
    with language(lang):
        settings = growth()
        values = {}
        if settings["book_again_enabled"] and event in BOOK_AGAIN_EMAILS:
            url = book_again_url(doc)
            if url:
                values.update(booking_label=escape_html(_("Book again in 10 seconds", lang=lang)), booking_url=escape_html(url))
        values["powered_by"] = email_footer(lang) if settings["powered_by_emails"] else None
    return values


def email_footer(lang):
    """The small "Powered by" block under the email card."""
    with language(lang):
        platform = brand()
        text = growth()["own_page_text"]
    mark = platform["mark"]
    return dict(
        label=escape_html(_("Powered by {0}", lang=lang).format(platform["product_name"])),
        product_url=escape_html(platform["product_url"]),
        mark_url=escape_html(get_url(mark)) if mark.startswith("/") else "",
        cta=escape_html(text),
        cta_url=escape_html(signup_url("powered_by_email")),
    )


# ---------------------------------------------------------------------------
# SMS
# ---------------------------------------------------------------------------
def sms_encoding(text):
    """"GSM" when every character is in the GSM 03.38 tables, else "UCS-2" (Amharic is always UCS-2)."""
    return "GSM" if all(char in GSM_BASIC or char in GSM_EXTENDED for char in text) else "UCS-2"


def sms_parts(text):
    """How many SMS segments the gateway bills for `text`."""
    if sms_encoding(text) == "GSM":
        units = sum(2 if char in GSM_EXTENDED else 1 for char in text)
        single, part = GSM_SINGLE, GSM_PART
    else:
        units = len(text.encode("utf-16-le")) // 2  # Characters outside the BMP take two units.
        single, part = UCS2_SINGLE, UCS2_PART
    return 1 if units <= single else math.ceil(units / part)


def append_if_fits(text, line):
    """`text` plus `line` on a new line, only when that costs no extra segment."""
    if not line:
        return text
    candidate = f"{text}\n{line}"
    return candidate if sms_parts(candidate) == sms_parts(text) else text


def sms_with_extras(event, doc, lang, text):
    """Add the book-again link (reminders) and the "Powered by" line when each fits in the segments already used."""
    with language(lang):
        settings = growth()
        if settings["book_again_enabled"] and event in BOOK_AGAIN_SMS:
            url = book_again_url(doc)
            if url:
                text = append_if_fits(text, _("Book again: {0}", lang=lang).format(url.removeprefix("https://")))
        if settings["powered_by_sms"]:
            # An em dash is not in the GSM table and would turn an English message into UCS-2.
            own_page = (settings["own_page_text"] or "").replace("—", "-").strip()
            if own_page:
                text = append_if_fits(text, f"{own_page}: {short_signup_link('powered_by_sms')}")
    return text
