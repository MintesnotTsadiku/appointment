"""Public business directory: opt-in listings by category and area.

A business (an Organization or an independent Provider, see `business_owner`)
appears only when its owner turns the listing on, picks a category and an area,
and the business has a published booking page. Categories and areas are
configurable DocTypes seeded from `directory_seed`. The server-rendered pages
live in `appointment/www/directory.py`.
"""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import timedelta

import frappe
from frappe import _
from frappe.query_builder.functions import Count
from frappe.utils import getdate

from appointment.growth.sharing import require_business
from appointment.growth.settings import growth
from appointment.scheduler import localized_names
from appointment.scheduler.analytics_calculations import BOOKED
from appointment.scheduler.business_owner import PREFIX
from appointment.scheduler.provider_page import provider_bio

LISTING = "Directory Listing"
CATEGORY = "Directory Category"
AREA = "Directory Area"
SOURCE = "directory"
TOP_SERVICES = 3


def clean_slug(value) -> str:
    """Lowercase ASCII words joined by hyphens."""
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    if not slug:
        frappe.throw(_("Enter a slug with letters or numbers."))
    return slug


def enabled() -> bool:
    return bool(growth().get("directory_enabled"))


# ---------------------------------------------------------------------------
# Categories and areas
# ---------------------------------------------------------------------------
def categories() -> list[dict]:
    return frappe.get_all(
        CATEGORY, filters={"enabled": 1},
        fields=["name", "slug", "category_name", "category_name_am", "booking_phrase_en", "booking_phrase_am",
                "description_en", "description_am", "suggest_for", "sort_order"],
        order_by="sort_order asc, category_name asc",
    )


def areas() -> list[dict]:
    return frappe.get_all(
        AREA, filters={"enabled": 1},
        fields=["name", "slug", "area_name", "area_name_am", "city", "city_am", "aliases", "sort_order"],
        order_by="sort_order asc, area_name asc",
    )


def label(row, lang: str, field: str) -> str:
    """The Amharic `<field>_am` value on Amharic pages, else the English one."""
    english = row.get(field) or ""
    return (row.get(f"{field}_am") or english) if lang == "am" else english


def _lines(text) -> list[str]:
    return [line.strip().lower() for line in str(text or "").splitlines() if line.strip()]


def suggest_category(owner) -> str | None:
    """The first category whose `suggest_for` lists the business type."""
    kind = (frappe.db.get_value("Organization", owner.organization, "organization_type") if owner.organization
            else frappe.db.get_value("Provider", owner.provider, "business_type")) or ""
    for row in categories():
        if kind.lower() in _lines(row.suggest_for):
            return row.name
    return None


def suggest_area(owner) -> str | None:
    """An area named in the business's location address, else its city."""
    filters = {"organization": owner.organization} if owner.organization else {"independent_provider": owner.provider}
    locations = frappe.get_all("Location", filters={**filters, "is_active": 1},
                               fields=["location_name", "address_line_1", "address_line_2", "city"], order_by="creation asc")
    rows = areas()
    for location in locations:
        text = " ".join(filter(None, (location.address_line_1, location.address_line_2, location.location_name))).lower()
        for row in rows:
            names = [row.area_name.lower(), *_lines(row.aliases)]
            if any(re.search(rf"(?<![a-z]){re.escape(name)}(?![a-z])", text) for name in names):
                return row.name
    for location in locations:
        city = (location.city or "").strip().lower()
        for row in rows:
            if city and city == row.area_name.lower():
                return row.name
    return None


# ---------------------------------------------------------------------------
# Booking pages and listings
# ---------------------------------------------------------------------------
def booking_pages(owner_keys) -> dict[str, dict]:
    """Published booking page per owner key: `{href, logo, name, names, description, descriptions}`.

    `names` is the name by language (Organization.organization_name_am, Provider.display_name_am).
    `descriptions` is by language ("en", "am"): the organization description, or the provider's bio,
    each falling back to the other.

    A published Public Site wins. Without one, the scheduler page counts when
    public booking is on (an organization slug, or an independent offering).
    Owners without either are left out.
    """
    keys = set(owner_keys)
    organizations = [key for key in keys if not key.startswith(PREFIX)]
    providers = [key.removeprefix(PREFIX) for key in keys if key.startswith(PREFIX)]
    pages = {}
    sites = frappe.get_all(
        "Public Site",
        filters={"status": "Published", "current_release": ["is", "set"]},
        or_filters=_owner_filters(organizations, providers, "provider"),
        fields=["owner_type", "organization", "provider", "slug", "site_title", "brand_profile", "public_booking_enabled"],
    )
    profiles = {row.name: row for row in frappe.get_all(
        "Brand Profile", filters={"name": ["in", [site.brand_profile for site in sites if site.brand_profile] or [""]]},
        fields=["name", "application_name", "logo_compact", "logo_primary"])}
    for site in sites:
        key = site.organization if site.owner_type == "Organization" else PREFIX + (site.provider or "")
        if key not in keys or not site.slug or not site.public_booking_enabled:
            continue
        profile = profiles.get(site.brand_profile) or {}
        pages[key] = dict(href=f"/{site.slug}", logo=profile.get("logo_compact") or profile.get("logo_primary") or "",
                          name=profile.get("application_name") or site.site_title or "")
    for row in frappe.get_all("Organization", filters={"name": ["in", organizations or [""]], "is_active": 1},
                              fields=["name", "organization_name", "organization_name_am", "slug", "logo", "description", "description_am", "enable_public_booking"]):
        page = pages.get(row.name)
        if not page and row.enable_public_booking and row.slug:
            page = pages[row.name] = dict(href=f"/schedule/org/{row.slug}", logo="", name="")
        if page:
            name = page["name"] or row.organization_name or row.name
            descriptions = {"en": _summary(row.description), "am": _summary(row.description_am or row.description)}
            page.update(name=name, names=localized_names.pair(name, row.organization_name_am), logo=page["logo"] or row.logo or "",
                        description=descriptions["en"], descriptions=descriptions)
    for row in frappe.get_all("Provider", filters={"name": ["in", providers or [""]], "is_active": 1, "organization": ["is", "not set"]},
                              fields=["name", "display_name", "display_name_am", "provider_name", "profile_photo", "bio", "bio_am", "enable_public_booking", "public_slug"]):
        key = PREFIX + row.name
        page = pages.get(key)
        if not page and row.enable_public_booking:
            offering = _first_offering(row.name)
            if offering:
                # The provider page lists every service; the first offering only before the page has an address.
                href = f"/schedule/p/{row.public_slug}" if row.public_slug else f"/schedule/individual/{offering}"
                page = pages[key] = dict(href=href, logo="", name="")
        if page:
            # The bio in each language, else the other one (`provider_page.provider_bio`).
            descriptions = {lang: _summary(provider_bio(row, lang)) for lang in ("en", "am")}
            name = page["name"] or row.display_name or row.provider_name or row.name
            page.update(name=name, names=localized_names.pair(name, row.display_name_am),
                        logo=page["logo"] or row.profile_photo or "", description=descriptions["en"], descriptions=descriptions)
    return pages


def _owner_filters(organizations, providers, provider_field):
    """Match rows of these owners only. An empty list adds no condition, because `in ("")` also matches empty fields."""
    filters = {}
    if organizations:
        filters["organization"] = ["in", organizations]
    if providers:
        filters[provider_field] = ["in", providers]
    return filters or {"name": ["is", "not set"]}


def _first_offering(provider):
    services = frappe.get_all("Service", filters={"independent_provider": provider, "organization": ["is", "not set"], "is_active": 1}, pluck="name")
    rows = frappe.get_all("EventType", filters={"provider": provider, "service": ["in", services or [""]], "is_active": 1},
                          pluck="name", order_by="creation asc", limit=1)
    return rows[0] if rows else None


def _summary(text, limit=140) -> str:
    plain = " ".join(re.sub(r"<[^>]+>", " ", str(text or "")).split())
    return plain if len(plain) <= limit else plain[: limit - 1].rsplit(" ", 1)[0] + "…"


def top_services(owner_keys) -> dict[str, list[str]]:
    """Up to three service names per owner, most booked in the last year first."""
    keys = set(owner_keys)
    organizations = [key for key in keys if not key.startswith(PREFIX)]
    providers = [key.removeprefix(PREFIX) for key in keys if key.startswith(PREFIX)]
    services = frappe.get_all(
        "Service", filters={"is_active": 1}, or_filters=_owner_filters(organizations, providers, "independent_provider"),
        fields=["name", "service_name", "organization", "independent_provider"], order_by="creation asc",
    )
    owner_of = {row.name: row.organization or PREFIX + (row.independent_provider or "") for row in services}
    appointment = frappe.qb.DocType("Appointment")
    since = getdate() - timedelta(days=365)
    counts = dict(
        (frappe.qb.from_(appointment).select(appointment.service, Count(appointment.name))
         .where(appointment.service.isin(list(owner_of) or [""]) & appointment.status.isin(list(BOOKED)) & (appointment.appointment_date >= since))
         .groupby(appointment.service)).run()
    )
    grouped = defaultdict(list)
    for row in sorted(services, key=lambda item: -counts.get(item.name, 0)):
        names = grouped[owner_of[row.name]]
        if row.service_name not in names and len(names) < TOP_SERVICES:
            names.append(row.service_name)
    return grouped


PUBLIC_CACHE_KEY = "appointment:directory_public"


def is_public() -> bool:
    """True when the directory is on and lists at least one business, so links never lead to an empty page."""
    if not enabled():
        return False
    cached = frappe.cache.get_value(PUBLIC_CACHE_KEY)
    if cached is None:
        cached = int(bool(listings()))
        frappe.cache.set_value(PUBLIC_CACHE_KEY, cached, expires_in_sec=600)
    return bool(cached)


def listings(category: str | None = None, area: str | None = None) -> list[dict]:
    """Listed businesses with a published booking page, by name. Filters are category/area names."""
    filters = {"listed": 1, "category": ["is", "set"], "area": ["is", "set"]}
    if category:
        filters["category"] = category
    if area:
        filters["area"] = area
    rows = frappe.get_all(LISTING, filters=filters, fields=["owner_key", "category", "area", "listed_at"])
    live_categories = {row.name for row in categories()}
    live_areas = {row.name for row in areas()}
    rows = [row for row in rows if row.category in live_categories and row.area in live_areas]
    pages = booking_pages(row.owner_key for row in rows)
    services = top_services(pages)
    result = []
    for row in rows:
        page = pages.get(row.owner_key)
        if page:
            result.append(dict(owner_key=row.owner_key, category=row.category, area=row.area, name=page["name"],
                               logo=page["logo"], description=page.get("description") or "",
                               descriptions=page.get("descriptions") or {},
                               href=f"{page['href']}?source={SOURCE}", services=services.get(row.owner_key, [])))
    return sorted(result, key=lambda item: item["name"].lower())


# ---------------------------------------------------------------------------
# Owner API
# ---------------------------------------------------------------------------
def _listing_doc(owner):
    name = frappe.db.get_value(LISTING, {"owner_key": owner.key})
    if name:
        return frappe.get_doc(LISTING, name)
    return frappe.get_doc(dict(doctype=LISTING, owner_key=owner.key, owner_type="Organization" if owner.organization else "Provider",
                               organization=owner.organization, provider=owner.provider, listed=0))


def _owner_state(owner, lang: str | None = None) -> dict:
    doc = _listing_doc(owner)
    page = booking_pages([owner.key]).get(owner.key)
    lang = lang if lang in ("en", "am") else (frappe.local.lang or "en").split("-")[0]
    category = doc.category or suggest_category(owner)
    area = doc.area or suggest_area(owner)
    path = None
    if doc.listed and doc.category and doc.area:
        slugs = dict(category=frappe.db.get_value(CATEGORY, doc.category, "slug"), area=frappe.db.get_value(AREA, doc.area, "slug"))
        path = f"/directory/{slugs['category']}/{slugs['area']}"
    return dict(
        enabled=enabled(), listed=bool(doc.listed), category=category, area=area, saved=not doc.is_new(),
        published=bool(page), name=(page or {}).get("name") or owner.display_name, page_path=(page or {}).get("href"),
        directory_path=path,
        categories=[dict(value=row.name, label=label(row, lang, "category_name")) for row in categories()],
        areas=[dict(value=row.name, label=label(row, lang, "area_name"), city=label(row, lang, "city")) for row in areas()],
    )


@frappe.whitelist(methods=["GET"])
def owner_listing(owner_key: str, lang: str | None = None):
    """The owner's directory listing with the category and area choices, labelled in `lang` (the staff
    app's own language, which can differ from the account language)."""
    return _owner_state(require_business(owner_key), lang)


@frappe.whitelist(methods=["POST"])
def save_owner_listing(owner_key: str, listed: int | str = 0, category: str | None = None, area: str | None = None,
                       lang: str | None = None):
    owner = require_business(owner_key)
    if not enabled():
        frappe.throw(_("The business directory is not available right now."))
    listed = bool(frappe.utils.cint(listed))
    if category and not frappe.db.get_value(CATEGORY, {"name": category, "enabled": 1}):
        frappe.throw(_("Choose a category from the list."))
    if area and not frappe.db.get_value(AREA, {"name": area, "enabled": 1}):
        frappe.throw(_("Choose an area from the list."))
    if listed and not booking_pages([owner.key]).get(owner.key):
        frappe.throw(_("Publish your booking page before you list your business."))
    doc = _listing_doc(owner)
    doc.update(dict(listed=listed, category=category or doc.category, area=area or doc.area))
    if doc.is_new():
        doc.insert(ignore_permissions=True)
    else:
        doc.save(ignore_permissions=True)
    frappe.cache.delete_value(PUBLIC_CACHE_KEY)
    return _owner_state(owner, lang)


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
def ensure_defaults():
    """Insert the seeded categories and areas that are missing. Never changes a saved row."""
    from appointment.growth.directory_seed import AREAS, CATEGORIES

    if not frappe.db.table_exists(CATEGORY) or not frappe.db.table_exists(AREA):
        return
    for doctype, rows in ((CATEGORY, CATEGORIES), (AREA, AREAS)):
        for index, row in enumerate(rows):
            if not frappe.db.exists(doctype, row["slug"]):
                frappe.get_doc(dict(doctype=doctype, sort_order=(index + 1) * 10, enabled=1, **row)).insert(ignore_permissions=True)
    _fill_amharic_cities(AREAS)


def _fill_amharic_cities(seeded: list[dict]):
    """Give seeded areas saved before `city_am` existed their Amharic city. Fills empty values only."""
    for row in seeded:
        if not row.get("city_am"):
            continue
        current = frappe.db.get_value(AREA, row["slug"], ["city", "city_am"], as_dict=True)
        if current and not current.city_am and current.city == row["city"]:
            doc = frappe.get_doc(AREA, row["slug"])
            doc.city_am = row["city_am"]
            doc.save(ignore_permissions=True)
