"""The public partners page (`/partners` in English, `/am/partners` in Amharic).

Associations, beauty and medical schools, coaching groups, trainers and Telegram channel admins
apply here. The page is server-rendered and works without JavaScript:

- With JavaScript, `public/js/partners.js` posts the form to the guest API (`apply_method()`),
  validates inline and shows the success state in place.
- Without JavaScript, the browser posts the form to the page itself. `handle_post()` validates,
  calls the same API function (same rate limit, same record) and renders errors or success.

CSRF: the same rule as Frappe web forms. A guest session has no CSRF token, so a guest post needs
none; a signed-in visitor's form carries the session token (`csrf_token` field or the
`X-Frappe-CSRF-Token` header), which Frappe checks before the page runs.

Copy lives in the frontend catalog under `growthPartners.*` (merged with the growth `strings.sh`
helper); Amharic comes from the Translation records, like the tool pages. See docs/growth/MARKETING.md.
"""

from __future__ import annotations

import frappe
from frappe.utils import get_url, nowdate, validate_email_address

from appointment.growth.tools.catalog import text

GROUP = "growthPartners"
LANGS = ("en", "am")
TITLE_LIMIT = 60
KINDS = ("association", "school", "trainer", "telegram", "other")
AUDIENCE = ("associations", "schools", "coaching", "trainers", "telegram")
FAQ_COUNT = 5
CODE_PLACEHOLDER = "PARTNERCODE"
FIELDS = ("name", "organization", "email", "phone", "kind", "message")
HONEYPOT = "website"
# Inline checks mirror the API's limits so the visitor sees the problem next to the field.
MAX_NAME = 140
MAX_MESSAGE = 1000


class Copy:
    """`t("title")` reads `growthPartners.title` in the page language; extra args fill `{0}`, `{1}`."""

    def __init__(self, lang: str):
        self.lang = lang

    def __call__(self, key: str, *args) -> str:
        value = text(f"{GROUP}.{key}", self.lang)
        return value.format(*args) if args else value


def path(lang: str) -> str:
    return "/am/partners" if lang == "am" else "/partners"


def request_lang() -> str:
    request = getattr(frappe.local, "request", None)
    current = getattr(request, "path", "") or ""
    return "am" if current.rstrip("/") == "/am/partners" else "en"


def enabled() -> bool:
    from appointment.growth.settings import growth

    return bool(growth()["partner_program_enabled"])


def apply_method() -> str:
    """Workstream C's guest API. The brief names `referrals.apply_partner`; C implements it in `partners`."""
    from appointment.growth import referrals

    if hasattr(referrals, "apply_partner"):
        return "appointment.growth.referrals.apply_partner"
    return "appointment.growth.partners.apply_partner"


def build(context, lang: str | None = None):
    """Fill the Jinja context. Raises a 404 when the partner program is off."""
    if not enabled():
        raise frappe.PageDoesNotExistError
    from appointment.growth.brand import brand
    from appointment.growth.marketing import offer
    from appointment.growth.settings import growth
    from appointment.growth.tools import colors

    lang = lang or request_lang()
    frappe.local.lang = lang  # brand tagline and server messages follow the page language
    t = Copy(lang)
    values = brand()
    settings = growth()
    product = values["product_name"]
    alternates = {code: get_url(path(code)) for code in LANGS}
    numbers = dict(
        reward=settings["partner_reward_free_bookings"],
        business_reward=settings["referral_reward_free_bookings"],
        threshold=max(1, settings["referral_threshold_bookings"]),
        minutes=offer()["live_minutes"],
    )
    faq = [(t(f"faq{i}q"), t(f"faq{i}a", product, numbers["reward"], numbers["threshold"])) for i in range(1, FAQ_COUNT + 1)]
    form = form_state(t)
    context.update(
        no_header=1,
        no_breadcrumbs=1,
        no_cache=1,
        lang=lang,
        t=t,
        title=seo_title(t("title"), product),
        h1=t("h1"),
        description=t("description", product),
        canonical_url=alternates[lang],  # Frappe overwrites `canonical` with the resolved route (/partners for /am/partners)
        alternates=alternates,
        other_lang="en" if lang == "am" else "am",
        brand=values,
        product_name=product,
        colors=colors.palette(values.get("primary_color")),
        numbers=numbers,
        audience=[(key, t(f"audience.{key}"), t(f"audience.{key}Text")) for key in AUDIENCE],
        kinds=[(key, t(f"kind.{key}")) for key in KINDS],
        faq=faq,
        faq_json_ld=json_ld(faq_schema(faq)),
        kit=telegram_kit(t, values, numbers),
        code_placeholder=CODE_PLACEHOLDER,
        form=form,
        apply_method=apply_method(),
        csrf_token=_csrf_token(),
        asset_version=asset_version(),
        year=frappe.utils.now_datetime().year,
    )
    return context


def asset_version() -> str:
    import os

    public = os.path.join(frappe.get_app_path("appointment"), "public")
    paths = [os.path.join(public, *parts) for parts in (("css", "tools.css"), ("css", "partners.css"), ("js", "partners.js"))]
    try:
        return str(int(max(os.path.getmtime(item) for item in paths if os.path.exists(item))))
    except ValueError:
        return "1"


def seo_title(page_title: str, product: str) -> str:
    full = f"{page_title} | {product}"
    return full if len(full) <= TITLE_LIMIT else page_title[:TITLE_LIMIT]


# ---------------------------------------------------------------------------
# Form
# ---------------------------------------------------------------------------
def form_state(t: Copy) -> dict:
    """The form's values, errors and state. A POST without JavaScript is handled here."""
    request = getattr(frappe.local, "request", None)
    if not request or request.method != "POST":
        return dict(state="open", values={field: "" for field in FIELDS}, errors={}, message="")
    return handle_post(t, frappe.local.form_dict)


def handle_post(t: Copy, data) -> dict:
    values = {field: str(data.get(field) or "").strip() for field in FIELDS}
    if str(data.get(HONEYPOT) or "").strip():
        # A filled hidden field is a bot. Answer like a success and store nothing.
        return dict(state="sent", values={}, errors={}, message=t("form.success"))
    errors = validate(t, values)
    if errors:
        return dict(state="invalid", values=values, errors=errors, message=t("form.fixErrors"))
    try:
        result = frappe.get_attr(apply_method())(**values)
    except frappe.RateLimitExceededError:
        return _failed(values, t("form.rateLimited"))
    except (frappe.ValidationError, frappe.PermissionError) as error:
        return _failed(values, _plain(error) or t("form.failed"))
    finally:
        frappe.local.message_log = []  # the page shows the outcome itself, not as a JSON message
    return dict(state="sent", values={}, errors={}, message=(result or {}).get("message") or t("form.success"))


def validate(t: Copy, values: dict) -> dict:
    """Field errors for the inline messages. The API validates again and stays the authority."""
    errors = {}
    if not values["name"]:
        errors["name"] = t("form.nameRequired")
    elif len(values["name"]) > MAX_NAME:
        errors["name"] = t("form.tooLong")
    if not values["email"] or len(values["email"]) > MAX_NAME or not validate_email_address(values["email"]):
        errors["email"] = t("form.emailInvalid")
    if values["kind"] not in KINDS:
        errors["kind"] = t("form.kindRequired")
    if len(values["organization"]) > MAX_NAME:
        errors["organization"] = t("form.tooLong")
    if len(values["message"]) > MAX_MESSAGE:
        errors["message"] = t("form.tooLong")
    return errors


def _failed(values: dict, message: str) -> dict:
    return dict(state="failed", values=values, errors={}, message=message)


def _plain(error: Exception) -> str:
    from frappe.utils import strip_html

    return strip_html(str(error)).strip()


def _csrf_token() -> str:
    """Signed-in visitors post with their session token; guests have none and need none."""
    if frappe.session.user == "Guest":
        return ""
    from frappe.sessions import get_csrf_token

    return get_csrf_token()


# ---------------------------------------------------------------------------
# Telegram admin kit
# ---------------------------------------------------------------------------
def telegram_kit(t: Copy, values: dict, numbers: dict) -> list[dict]:
    """Ready-to-post messages in both languages. Admins replace PARTNERCODE with their code."""
    from appointment.growth.tools.registry import get

    base = values["product_url"].rstrip("/")
    source = f"?source=partner_{CODE_PLACEHOLDER}"
    signup = f"{base}/signup?ref={CODE_PLACEHOLDER}&source=partner"
    posts = []
    for lang in LANGS:
        copy = Copy(lang)
        tool = {slug: f"{base}{get(slug).path(lang)}{source}" for slug in (
            "ethiopian-time-converter", "ethiopian-calendar-converter", "amharic-appointment-reminder")}
        posts.append(dict(
            id=f"tools-{lang}", lang=lang, label=t("kit.toolsLabel", t(f"kit.lang.{lang}")),
            text=copy("kit.toolsPost", tool["ethiopian-time-converter"], tool["ethiopian-calendar-converter"],
                      tool["amharic-appointment-reminder"], values["product_name"]),
        ))
        posts.append(dict(
            id=f"signup-{lang}", lang=lang, label=t("kit.signupLabel", t(f"kit.lang.{lang}")),
            text=copy("kit.signupPost", values["product_name"], numbers["minutes"], signup),
        ))
    return posts


# ---------------------------------------------------------------------------
# SEO
# ---------------------------------------------------------------------------
def faq_schema(faq: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": answer}}
            for question, answer in faq
        ],
    }


def json_ld(data: dict) -> str:
    from appointment.growth.tools.page import json_ld as encode

    return encode(data)


def sitemap_links() -> list[dict]:
    """Both languages with hreflang alternates, for `/sitemap.xml`. Empty when the program is off."""
    if not enabled():
        return []
    alternates = {lang: get_url(path(lang)) for lang in LANGS}
    return [{"loc": alternates[lang], "lastmod": nowdate(), "alternates": alternates} for lang in LANGS]
