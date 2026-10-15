"""Service photos for the booking pages, from the business's published website.

A scheduler service has no photo field. The published website can show a photo for each service in its
services section (the owner's photo or a template photo). The booking pages reuse that photo, so the
service chooser and the time picker look like the website. Only the active release is read, and only
local image paths are returned.
"""

from __future__ import annotations

import re

import frappe

_SAFE_PATH = re.compile(r"^/(?:assets/appointment|files)/[A-Za-z0-9][A-Za-z0-9._/-]{0,240}$")


def _safe(value: object) -> str:
    return value if isinstance(value, str) and _SAFE_PATH.match(value) and ".." not in value else ""


def _texts(value: object) -> dict[str, str]:
    """A localized text of the website ({"en": …, "am": …}), plain strings only."""
    if not isinstance(value, dict):
        return {}
    return {key: text[:400] for key, text in value.items() if isinstance(key, str) and len(key) <= 8 and isinstance(text, str) and text.strip()}


def for_organization(organization: str | None) -> dict[str, dict]:
    """What the website shows for each service of a business, by Service name: `image` (a local path or ""),
    `index` (the service's place in the services section; a template without an owner photo picks its own
    photo by that place), and the website's `name` and `summary` by language, so the booking pages use the
    same words as the website. Empty without a published site."""
    if not organization:
        return {}
    release_name = frappe.db.get_value(
        "Public Site", {"organization": organization, "status": "Published"}, "current_release"
    )
    if not release_name:
        return {}
    from appointment.public_experience.resolver import _json, _load_release

    release = _load_release(release_name)
    snapshot = _json(release.normalized_json) if release else {}
    photos: dict[str, dict] = {}
    for section in snapshot.get("sections") or []:
        if not isinstance(section, dict) or section.get("type") != "services":
            continue
        content = section.get("content") if isinstance(section.get("content"), dict) else {}
        for index, item in enumerate(content.get("items") or []):
            if isinstance(item, dict) and isinstance(item.get("id"), str) and item["id"] not in photos:
                photos[item["id"]] = {
                    "image": _safe(item.get("image")),
                    "index": index,
                    "name": _texts(item.get("name")),
                    "summary": _texts(item.get("summary")),
                }
    return photos
