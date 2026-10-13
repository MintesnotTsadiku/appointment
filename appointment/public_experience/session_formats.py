"""How each session and place of a business meets, derived from its Location records, for the website editor.

A Location is "In person" or "Online"; an online Location whose platform is a phone call meets by phone.
The editor shows this as "Auto"; an owner `format` in the section content overrides it for the website text.
Public pages get the same facts live from `api.get_public_experience_snapshot` (`sessionFormats`, `placeFormats`).
Sites on a schema without `Location.location_type` derive nothing, and templates keep their own fallback.
"""

from __future__ import annotations

import re

import frappe

_PHONE_PLATFORM = re.compile(r"phone|ስልክ", re.IGNORECASE)


class DerivedFormats:
    """Session formats by Service name and place formats by Location name, for one business."""

    def __init__(self, owner_type: str, organization: str | None, provider: str | None):
        self._names: list[str] = []
        self.places = self._place_formats(owner_type, organization, provider)
        self.services = self._service_formats()

    def as_dict(self) -> dict:
        return {"services": dict(self.services), "places": dict(self.places)}

    def _place_formats(self, owner_type, organization, provider) -> dict[str, str]:
        meta = frappe.get_meta("Location")
        if not meta.has_field("location_type"):
            return {}
        owner = {"organization": organization} if owner_type == "Organization" else {"independent_provider": provider}
        if not any(owner.values()):
            return {}
        fields = ["name", "location_type"] + (["video_platform"] if meta.has_field("video_platform") else [])
        rows = frappe.get_all("Location", filters={**owner, "is_active": 1}, fields=fields, ignore_permissions=True)
        self._names = [row.name for row in rows]
        # Place items carry the Location name cut to 64 characters as their id.
        return {row.name[:64]: _location_format(row) for row in rows}

    def _service_formats(self) -> dict[str, str]:
        if not self.places:
            return {}
        seen: dict[str, set[str]] = {}
        rows = frappe.get_all("EventType", filters={"location": ["in", sorted(self._names)], "is_active": 1},
                              fields=["service", "location"], ignore_permissions=True)
        for row in rows:
            if row.service:
                seen.setdefault(row.service, set()).add(self.places[row.location[:64]])
        # A session offered in two formats has no single format; the owner chooses one for the text.
        return {service: formats.pop() for service, formats in seen.items() if len(formats) == 1}


def for_site(site) -> DerivedFormats:
    return DerivedFormats(site.owner_type, site.organization, site.provider)


def _location_format(row) -> str:
    from appointment.scheduler.online_meeting import is_online

    if not is_online(row):
        return "in_person"
    return "phone" if _PHONE_PLATFORM.search(row.get("video_platform") or "") else "online"
