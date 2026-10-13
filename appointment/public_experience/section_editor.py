"""What the website editor may change in each section, for every template.

The editor draws its forms from this description, so a new section type or field needs one entry here
and its rule in `section_schemas.py`. Limits mirror the validators. `test_website_editor` builds content
from this description and validates it, so the two cannot drift apart.

Field kinds: `text` (one localized line), `long` (localized paragraph), `plain` (a phone or email),
`format` (how a session or place meets), `consent` (a testimonial's consent), `strings` (a list of
localized lines). A section or item with `image` has an image slot (`image`, `imageAlt`, `imageFocus`).
A `list` has records; `add: False` means its records come from business facts and can only be edited,
reordered or removed.
"""

from __future__ import annotations

from appointment.public_experience.section_schemas import PLACE_FORMATS, SESSION_FORMATS


def _field(key, kind="text", *, required=False, max_length=1000, **extra):
    return {"key": key, "kind": kind, "required": required, "maxLength": max_length, **_camel(extra)}


def _title(required=True):
    return _field("title", required=required)


def _intro():
    return _field("intro", "long")


def _list(fields, *, max_items, add=True, label, **extra):
    return {"key": "items", "fields": fields, "maxItems": max_items, "add": add, "label": label, **_camel(extra)}


def _camel(values):
    return {key.split("_")[0] + "".join(part.title() for part in key.split("_")[1:]): value for key, value in values.items()}


EDITOR_SCHEMA: dict[str, dict] = {
    "hero": {"fields": [_field("eyebrow"), _title(), _field("subtitle", "long"), _field("body", "long", max_length=2400)],
             "image": True},
    "benefits": {"fields": [_title(), _intro()], "image": True,
                 "list": _list([_field("title", required=True), _field("description", "long", required=True)],
                               max_items=12, label="title", inherit=["icon"], defaults={"icon": "check"})},
    "approaches": {"fields": [_title(), _intro()], "image": True,
                   "list": _list([_field("title", required=True), _field("description", "long", required=True)],
                                 max_items=12, label="title")},
    "about": {"fields": [_title(), _field("body", "long", required=True, max_length=2400),
                         _field("highlights", "strings", max_items=8)], "image": True},
    "process": {"fields": [_title(), _intro()],
                "list": _list([_field("title", required=True), _field("description", "long", required=True)],
                              max_items=12, label="title", numbered="step")},
    "services": {"fields": [_title(), _intro()],
                 "list": _list([_field("name", required=True), _field("summary", "long"),
                                _field("format", "format", options=list(SESSION_FORMATS))],
                               max_items=24, add=False, label="name", facts=["durationMinutes", "price", "currency"])},
    "providers": {"fields": [_title(), _intro()],
                  "list": _list([_field("name", required=True), _field("role"),
                                 _field("specialties", "strings", max_items=12),
                                 _field("credentials", "strings", max_items=12)],
                                max_items=24, add=False, label="name", image=True)},
    "proof": {"fields": [_title(), _intro()],
              "list": _list([_field("label", required=True), _field("value", required=True), _field("detail")],
                            max_items=12, label="value")},
    "testimonials": {"fields": [_title(), _intro()],
                     "list": _list([_field("quote", "long", required=True), _field("attribution", required=True),
                                    _field("role"), _field("consent", "consent", required=True)],
                                   max_items=12, label="attribution", defaults={"consent": False})},
    "faq": {"fields": [_title()], "image": True,
            "list": _list([_field("question", required=True), _field("answer", "long", required=True, max_length=1600)],
                          max_items=20, label="question")},
    "notice": {"fields": [_title(), _field("body", "long", max_length=2400)], "image": True,
               "list": _list([_field("label", required=True, max_length=160), _field("phone", "plain", max_length=32, pattern="phone")],
                             max_items=6, label="label")},
    "locations": {"fields": [_title(), _intro()],
                  "list": _list([_field("format", "format", options=list(PLACE_FORMATS)), _field("name", required=True),
                                 _field("address", required=True), _field("body", "long", max_length=600),
                                 _field("notes", "strings", max_items=6, max_length=240), _field("hours", "long"),
                                 _field("phone", "plain", max_length=32)],
                                max_items=12, label="name", image=True, generated_id="place")},
    "contact": {"fields": [_title(), _field("body", "long", max_length=2400), _field("phone", "plain", max_length=32),
                           _field("email", "plain", max_length=160, pattern="email")]},
    "booking_cta": {"fields": [_title(), _field("body", "long", max_length=2400)], "image": True},
    "footer": {"fields": [_field("body", "long", max_length=2400)],
               "list": _list([_field("label", required=True)], max_items=12, add=False, label="label")},
}
