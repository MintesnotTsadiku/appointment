"""Sharing a business's booking link: share messages, link preview cards and the Grow page data.

A business is an Organization or an independent Provider (owner key `Provider:<name>`). Its
public link is its published Public Site (`/<slug>`), else its booking page. Every owner endpoint
checks that the signed-in user runs that business; guests only ever receive public page meta.
See docs/growth/SHARING.md.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import frappe
from frappe import _
from frappe.utils import add_days, escape_html, get_url, now_datetime

from appointment.scheduler import business_owner

#: `?source=` values the share tools put on links; bookings keep them as `referral_source`.
SOURCES = ("telegram_share", "whatsapp_share", "web_share", "copy_link", "qr_poster")
LANGS = ("en", "am")
STATS_DAYS = 30
_PLACEHOLDER = re.compile(r"\{(business|link)\}")


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------
def require_business(key: str):
    """The business for `key` when the signed-in user runs it; raises PermissionError otherwise."""

    from appointment.scheduler.independent import require_owner
    from appointment.scheduler.membership import require_manager

    key = key or ""
    if not key or frappe.session.user == "Guest":
        frappe.throw(_("You cannot manage this business."), frappe.PermissionError)
    try:
        if key.startswith(business_owner.PREFIX):
            require_owner(key.removeprefix(business_owner.PREFIX))
        else:
            require_manager(key)
        return business_owner.from_key(key)
    except (frappe.DoesNotExistError, frappe.PermissionError):
        frappe.throw(_("You cannot manage this business."), frappe.PermissionError)


# ---------------------------------------------------------------------------
# The business as shared
# ---------------------------------------------------------------------------
def site_of(owner) -> frappe._dict | None:
    """The business's active (not archived) Public Site."""

    filters = {"status": ["!=", "Archived"]}
    if owner.organization:
        filters.update(owner_type="Organization", organization=owner.organization)
    else:
        filters.update(owner_type="Provider", provider=owner.provider)
    return frappe.db.get_value(
        "Public Site", filters, ["name", "slug", "status", "current_release", "brand_profile", "default_locale"],
        as_dict=True,
    )


def public_path(owner, site=None) -> str:
    """The path customers open: the published site, else the booking page."""

    site = site if site is not None else site_of(owner)
    if site and site.status == "Published" and site.slug:
        return f"/{site.slug}"
    if owner.organization:
        return f"/schedule/org/{owner.slug}" if owner.slug else ""
    return owner.book_path or ""


def profile(owner, lang: str = "en") -> dict:
    """Name, logo, colours, services and links of a business, in `lang` where content has it."""

    from appointment.growth.brand import brand

    site = site_of(owner)
    snapshot = _snapshot(site)
    design = snapshot.get("compiledDesign") or {}
    identity = design.get("identity") or {}
    tokens = (design.get("tokens") or {}).get("light") or {}
    path = public_path(owner, site)
    published = bool(site and site.status == "Published")
    short_host = brand()["short_host"]
    return dict(
        key=owner.key,
        kind=owner.kind,
        name=owner.display_name,
        logo=identity.get("logoCompact") or identity.get("logoPrimary") or _profile_logo(site) or owner.logo or "",
        colors=dict(
            background=tokens.get("canvas"), text=tokens.get("text"), muted=tokens.get("textMuted"),
            primary=tokens.get("primary") or brand().get("primary_color"), on_primary=tokens.get("onPrimary"),
        ),
        services=_services(owner, snapshot, lang),
        tagline=_tagline(snapshot, lang),
        site=site.name if site else None,
        published=published,
        slug=site.slug if site else None,
        path=path,
        url=get_url(path) if path else "",
        short=f"{short_host}/{site.slug}" if published else "",
    )


def dark_colors(owner) -> dict:
    """The business's dark-theme colours from its published design (empty without a site)."""

    tokens = ((_snapshot(site_of(owner)).get("compiledDesign") or {}).get("tokens") or {}).get("dark") or {}
    return dict(background=tokens.get("canvas"), text=tokens.get("text"), primary=tokens.get("primary"))


def _snapshot(site) -> dict:
    if not site or site.status != "Published" or not site.current_release:
        return {}
    from appointment.public_experience.resolver import public_snapshot

    return public_snapshot(site.current_release)


def _profile_logo(site) -> str:
    if not site or not site.brand_profile:
        return ""
    row = frappe.db.get_value("Brand Profile", site.brand_profile, ["logo_compact", "logo_primary"], as_dict=True)
    return (row and (row.logo_compact or row.logo_primary)) or ""


def _text(value, lang: str) -> str:
    if isinstance(value, dict):
        return str(value.get(lang) or value.get("en") or "").strip()
    return str(value or "").strip()


def _services(owner, snapshot: dict, lang: str, limit: int = 3) -> list[str]:
    for section in snapshot.get("sections") or []:
        if section.get("type") == "services":
            names = [_text(item.get("name"), lang) for item in (section.get("content") or {}).get("items") or []]
            names = [name for name in names if name]
            if names:
                return names[:limit]
    filters = {"is_active": 1, "resource_only": ["!=", 1]}
    if owner.organization:
        filters["organization"] = owner.organization
    else:
        filters.update(independent_provider=owner.provider, organization=["is", "not set"])
    return frappe.get_all("Service", filters=filters, pluck="service_name", order_by="creation asc", limit=limit)


def _tagline(snapshot: dict, lang: str) -> str:
    for section in snapshot.get("sections") or []:
        if section.get("type") == "hero":
            return _text((section.get("content") or {}).get("title"), lang)
    return ""


# ---------------------------------------------------------------------------
# Links and messages
# ---------------------------------------------------------------------------
def tracked_url(url: str, source: str) -> str:
    """`url` with `?source=<source>` set (other query values kept)."""

    if not url:
        return ""
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "source"]
    query.append(("source", source))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def fill_message(template: str, business: str, link: str) -> str:
    """Fill `{business}` and `{link}` in one pass, so a name that contains `{link}` stays as typed."""

    values = {"business": business or "", "link": link or ""}
    text = template if template and "{link}" in template else f"{template or '{business}'} {{link}}".strip()
    return _PLACEHOLDER.sub(lambda match: values[match.group(1)], text)


def share_templates() -> dict:
    from appointment.growth import cache
    from appointment.growth.settings import DOCTYPE

    values = cache.stored(DOCTYPE)
    english = values.get("share_message_en") or "{business}: {link}"
    return {"en": english, "am": values.get("share_message_am") or english}


def share_messages(name: str, link: str) -> dict:
    return {lang: fill_message(template, name, link) for lang, template in share_templates().items()}


# ---------------------------------------------------------------------------
# Link preview card
# ---------------------------------------------------------------------------
def card_url(data: dict, lang: str) -> str:
    """Site-relative URL of the business's 1200x630 share card in `lang` (drawn on first use)."""

    from appointment.growth.og_image import render_card

    return render_card(
        title=data["name"],
        subtitle=_("Book online", lang=lang),
        lines=data["services"],
        logo=data["logo"],
        colors=data["colors"],
        lang=lang,
        footer=data["short"] or urlsplit(data["url"]).netloc + urlsplit(data["url"]).path,
        key=f"{data['key']}-{lang}",
    )


def preview(data: dict, lang: str) -> dict:
    """What a chat app shows for the link: title, description, image and host."""

    return dict(
        title=page_title(data, lang),
        description=page_description(data, lang),
        image=card_url(data, lang),
        host=data["short"].split("/", 1)[0] if data["short"] else urlsplit(data["url"]).netloc,
    )


def page_title(data: dict, lang: str) -> str:
    return _("{0} · Book online", lang=lang).format(data["name"])[:70]


def page_description(data: dict, lang: str) -> str:
    services = data["services"]
    if services:
        joined = ("፣ " if lang == "am" else ", ").join(services)
        text = _("{0}. Choose a time and book online.", lang=lang).format(joined)
    else:
        text = _("Choose a time and book online.", lang=lang)
    return text if len(text) <= 155 else text[:154].rstrip() + "…"


def page_meta(host: str, path: str) -> dict | None:
    """Open Graph values for a published business page, or None for any other path."""

    from appointment.public_experience.errors import BrandExperienceError
    from appointment.public_experience.resolver import BOOKING, WEBSITE, normalize_path, resolve_public_experience

    clean = normalize_path(path)
    segments = [segment for segment in clean.split("/") if segment]
    locale = segments[-1] if len(segments) == 2 and segments[-1] in LANGS else None
    try:
        context = resolve_public_experience(host, clean, locale)
    except (BrandExperienceError, frappe.ValidationError):
        return None
    if context.route_kind not in (WEBSITE, BOOKING):
        return None
    lang = context.locale if context.locale in LANGS else "en"
    owner = business_owner.from_key(context.organization or business_owner.PREFIX + context.provider)
    data = profile(owner, lang)
    return dict(
        title=page_title(data, lang),
        description=page_description(data, lang),
        image=get_url(card_url(data, lang)),
        url=context.canonical_url,
        site_name=data["name"],
        locale="am_ET" if lang == "am" else "en_US",
    )


def meta_tags(meta: dict | None) -> str:
    """Escaped `<meta>` tags for the SPA shell (empty when there is no business page)."""

    if not meta:
        return ""
    tags = [
        ("property", "og:type", "website"),
        ("property", "og:site_name", meta["site_name"]),
        ("property", "og:title", meta["title"]),
        ("property", "og:description", meta["description"]),
        ("property", "og:url", meta["url"]),
        ("property", "og:image", meta["image"]),
        ("property", "og:image:width", "1200"),
        ("property", "og:image:height", "630"),
        ("property", "og:locale", meta["locale"]),
        ("name", "twitter:card", "summary_large_image"),
        ("name", "twitter:title", meta["title"]),
        ("name", "twitter:description", meta["description"]),
        ("name", "twitter:image", meta["image"]),
    ]
    return "\n    ".join(f'<meta {attr}="{name}" content="{escape_html(value)}">' for attr, name, value in tags)


def shell_meta_tags() -> str:
    """Meta tags for the current request; never breaks the page shell."""

    request = getattr(frappe.local, "request", None)
    if request is None:
        return ""
    from markupsafe import Markup

    try:
        # Values are escaped in meta_tags; Markup keeps an autoescaping template from escaping the tags.
        return Markup(meta_tags(page_meta(request.host.split(":")[0], request.path)))
    except Exception:
        frappe.log_error(title="Share card meta failed")
        return ""


# ---------------------------------------------------------------------------
# Visits and bookings from shared links
# ---------------------------------------------------------------------------
def stats(owner, data: dict) -> dict:
    """Visits (Web Page View) and bookings (referral_source) per share source in the last 30 days."""

    since = add_days(now_datetime(), -STATS_DAYS)
    visits = {source: 0 for source in SOURCES}
    if data["slug"]:
        rows = frappe.get_all(
            "Web Page View",
            filters={"creation": [">=", since], "source": ["in", SOURCES], "path": ["like", f"{data['slug']}%"]},
            fields=["source", "path"],
            limit=10000,
            ignore_permissions=True,
        )
        for row in rows:
            if row.path == data["slug"] or row.path.startswith(data["slug"] + "/"):
                visits[row.source] += 1
    bookings = {source: 0 for source in SOURCES}
    filters = {**business_owner.booking_filters(owner), "creation": [">=", since], "referral_source": ["in", SOURCES]}
    for row in frappe.get_all("Appointment", filters=filters, fields=["referral_source"], limit=10000, ignore_permissions=True):
        bookings[row.referral_source] += 1
    return {"days": STATS_DAYS, "visits": visits, "bookings": bookings}


# ---------------------------------------------------------------------------
# Grow page
# ---------------------------------------------------------------------------
@frappe.whitelist(methods=["GET"])
def grow_context(business: str):
    """Everything the Grow page needs for one business."""

    from appointment.growth.settings import growth
    from appointment.growth.short_links import ALIAS, RULES

    owner = require_business(business)
    flags = growth()
    english = profile(owner, "en")
    amharic = profile(owner, "am")
    links = {source: tracked_url(english["url"], source) for source in SOURCES}
    return dict(
        business=dict(key=owner.key, kind=owner.kind, name=english["name"], logo=english["logo"]),
        link=dict(url=english["url"], path=english["path"], short=english["short"], slug=english["slug"],
                  published=english["published"], site=english["site"], tracked=links),
        messages=dict(templates=share_templates(), en=share_messages(english["name"], links["telegram_share"])["en"],
                      am=share_messages(english["name"], links["telegram_share"])["am"]),
        preview=dict(en=preview(english, "en"), am=preview(amharic, "am")) if english["url"] else None,
        posters=dict(enabled=flags["posters_enabled"], locations=_poster_locations(owner)),
        slug=dict(editable=bool(english["site"]), rules=RULES,
                  aliases=frappe.get_all(ALIAS, filters={"public_site": english["site"]}, pluck="slug", order_by="creation desc")
                  if english["site"] else []),
        stats=stats(owner, english),
    )


def _poster_locations(owner) -> list[dict]:
    from appointment.growth.poster import locations

    return [{"name": row.name, "label": row.location_name} for row in locations(owner)]
