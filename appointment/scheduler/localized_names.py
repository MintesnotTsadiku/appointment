"""Names in the language of the public page.

The English name stays the record's own field; the Amharic name sits next to it:
`Provider.display_name_am`, `Organization.organization_name_am`, `Organization.description_am`,
`Location.location_name_am` and `Location.address_am` (the whole address in one line).
Public APIs send both as `{"en": …, "am": …}` (the shape of the website content), and the page
shows its own language, else the other one. An empty Amharic value is left out, so an Amharic
page falls back to the English name.

Packaged showcase portraits ship small avatar variants (`<name>-96.webp`, `<name>-192.webp` and AVIF);
`avatar` gives the 192 px file to the chooser and the time picker instead of the 768 px original.
"""

from __future__ import annotations

from pathlib import Path

import frappe

PORTRAITS = "/assets/appointment/brand-experience/providers/"
AVATAR_SIZE = 192


def pair(english: object, amharic: object, limit: int = 140) -> dict[str, str]:
    """`{"en": …, "am": …}` with only the non-empty values."""
    values = {"en": _text(english, limit), "am": _text(amharic, limit)}
    return {locale: text for locale, text in values.items() if text}


def in_language(names: dict[str, str], lang: str | None) -> str:
    """The name in `lang` ("am" or "en"), else the other one."""
    first, second = ("am", "en") if (lang or "").startswith("am") else ("en", "am")
    return names.get(first) or names.get(second) or ""


def for_language(names: dict[str, str], lang: str | None, english: object) -> str:
    """Messages and booking pages: the Amharic name in Amharic, else the English text they always showed."""
    if (lang or "").startswith("am") and names.get("am"):
        return names["am"]
    return _text(english, 1000)


def provider_english(row) -> str:
    """The provider's public English name: display name, else full name, else the record title."""
    return _text(row.get("display_name") or row.get("full_name") or row.get("provider_name"))


def provider_names(row) -> dict[str, str]:
    return pair(provider_english(row), row.get("display_name_am"))


def organization_names(row) -> dict[str, str]:
    return pair(row.get("organization_name"), row.get("organization_name_am"))


def organization_descriptions(row) -> dict[str, str]:
    return pair(row.get("description"), row.get("description_am"), limit=1000)


def owner_names(owner_type: str, owner: str) -> dict[str, str]:
    """The business name of a site owner (an Organization, or a Provider who is the business)."""
    if owner_type == "Organization":
        row = frappe.db.get_value("Organization", owner, ["organization_name", "organization_name_am"], as_dict=True)
        return organization_names(row) if row else {}
    row = frappe.db.get_value("Provider", owner, ["display_name", "full_name", "provider_name", "display_name_am"], as_dict=True)
    return provider_names(row) if row else {}


LOCATION_FIELDS = ("location_name", "location_name_am", "address_line_1", "address_line_2", "city", "address_am", "location_type")
ADDRESS_LIMIT = 280


def location_names(row) -> dict[str, str]:
    return pair(row.get("location_name"), row.get("location_name_am"))


def english_address(row) -> str:
    """"Bole Road, 2nd floor, Addis Ababa": the address lines and the city, when the place has a street address."""
    if not row.get("address_line_1"):
        return ""
    return ", ".join(part for part in (row.get("address_line_1"), row.get("address_line_2"), row.get("city")) if part)


def location_addresses(row) -> dict[str, str]:
    """The address in both languages. An online place has none."""
    if row.get("location_type") == "Online":
        return {}
    return pair(english_address(row), row.get("address_am"), limit=ADDRESS_LIMIT)


def place_names(row) -> dict[str, dict[str, str]]:
    """The public pages' extra keys for a place: `local_location_name` and `local_address` as `{en, am}`."""
    return {"local_location_name": location_names(row), "local_address": location_addresses(row)}


def booking_names(doc) -> dict[str, dict[str, str]]:
    """The names a customer sees for one booking, each as `{en, am}`: business, provider, location and address.

    The business is the booking's owner (`business_owner`); an online booking has no address.
    """
    from appointment.scheduler import business_owner

    owner = business_owner.for_booking(doc)
    business = owner_names("Organization" if owner and owner.organization else "Provider", owner.organization or owner.provider) if owner else {}
    provider = frappe.db.get_value("Provider", doc.get("provider"), ["display_name", "full_name", "provider_name", "display_name_am"],
                                   as_dict=True) if doc.get("provider") else None
    place = frappe.db.get_value("Location", doc.get("location"), list(LOCATION_FIELDS), as_dict=True) if doc.get("location") else None
    return {
        "business": business,
        "provider": provider_names(provider) if provider else {},
        "location": location_names(place) if place else {},
        "address": location_addresses(place) if place and not doc.get("is_online") else {},
    }


def avatar(url: str | None) -> str | None:
    """The small variant of a packaged portrait when it ships, else the image itself."""
    if not url or not url.startswith(PORTRAITS) or not url.endswith(".webp") or ".." in url:
        return url
    small = f"{url[:-len('.webp')]}-{AVATAR_SIZE}.webp"
    path = Path(frappe.get_app_path("appointment", "public")) / small.removeprefix("/assets/appointment/")
    return small if path.is_file() else url


def _text(value: object, limit: int = 140) -> str:
    return " ".join(str(value or "").split())[:limit]
