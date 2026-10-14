"""Closed schema-versioned content contracts for curated recipe sections.

The schema is intentionally typed and finite. Public content stores canonical
facts and typed actions; it never stores HTML, CSS, scripts or arbitrary URLs.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping

from appointment.public_experience.actions import ACTION_INTENTS, validate_action
from appointment.public_experience.validation import ValidationIssue, ValidationReport

SUPPORTED_LOCALES = ("en", "am")
CONTENT_SCHEMA_VERSION = 2
_MAX_TEXT = 1000
_MAX_ITEMS = 48


def _issue(field: str, rule: str, observed: object, requirement: str, remediation: str) -> ValidationIssue:
    return ValidationIssue(field, rule, observed, requirement, remediation)


def _localized(value: object, field: str, *, required: bool = True, max_length: int = _MAX_TEXT) -> list[ValidationIssue]:
    if value is None and not required:
        return []
    if not isinstance(value, dict):
        return [_issue(field, "localized_object", value, "an object with an English value", "Provide localized plain text.")]
    issues: list[ValidationIssue] = []
    for locale, text in value.items():
        if locale not in {"en", "am"}:
            issues.append(_issue(f"{field}.{locale}", "unknown_locale", locale, "en or am", "Remove the unsupported locale."))
            continue
        if not isinstance(text, str) or not text.strip() or len(text) > max_length or any(
            character in text for character in "<>\x00\x01\x02\x03"
        ):
            issues.append(_issue(f"{field}.{locale}", "safe_text", text, f"plain text of at most {max_length} characters", "Remove markup and keep copy concise."))
    if required and not str(value.get("en") or "").strip():
        issues.append(_issue(f"{field}.en", "required", value.get("en"), "an English value", "Provide the English copy."))
    return issues


def _string(value: object, field: str, *, required: bool = True, max_length: int = 160) -> list[ValidationIssue]:
    if value is None and not required:
        return []
    if not isinstance(value, str) or not value.strip() or len(value) > max_length or any(
        character in value for character in "<>\x00\x01\x02\x03"
    ):
        return [_issue(field, "safe_text", value, f"plain text of at most {max_length} characters", "Use plain text only.")]
    return []

# Owner uploads live in this site's media library as public files with a generated, flat name.
_OWNER_FILE_RE = re.compile(r"^/files/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$")
IMAGE_KEYS = ("image", "imageAlt", "imageFocus")


def _asset(value: object, field: str) -> list[ValidationIssue]:
    """A packaged template asset, or an owner upload. The publisher checks that an upload belongs to the site."""
    issues = _string(value, field, max_length=255)
    if issues:
        return issues
    text = str(value)
    if ".." in text or not (text.startswith("/assets/appointment/") or _OWNER_FILE_RE.fullmatch(text)):
        return [_issue(field, "local_asset", value, "a packaged asset or an image from this website's media library", "Choose an image from your media library.")]
    return []


def is_owner_upload(value: object) -> bool:
    return isinstance(value, str) and _OWNER_FILE_RE.fullmatch(value) is not None and ".." not in value


def _focus(value: object, field: str) -> list[ValidationIssue]:
    """The focal point of a photo, in percent from the top-left corner. Templates crop around it."""
    if (isinstance(value, dict) and set(value) == {"x", "y"}
            and all(isinstance(value[axis], int) and not isinstance(value[axis], bool) and 0 <= value[axis] <= 100 for axis in ("x", "y"))):
        return []
    return [_issue(field, "focus", value, "x and y from 0 to 100", "Choose the focal point again.")]


def _image(content: Mapping[str, object], field: str) -> list[ValidationIssue]:
    """Optional owner photo: a packaged asset or an owner upload, its localized alt text and a focal point.

    Releases published before these fields existed simply omit them, so the
    template hides the image instead of borrowing another business's photo.
    An owner upload must describe the photo in English for screen readers.
    """
    prefix = f"{field}." if field else ""
    issues: list[ValidationIssue] = []
    image = content.get("image")
    if image is not None:
        issues.extend(_asset(image, f"{prefix}image"))
    if content.get("imageAlt") is not None:
        issues.extend(_localized(content.get("imageAlt"), f"{prefix}imageAlt", required=False, max_length=240))
    if is_owner_upload(image):
        alt = content.get("imageAlt")
        if not isinstance(alt, dict) or not str(alt.get("en") or "").strip():
            issues.append(_issue(f"{prefix}imageAlt.en", "alt_required", None, "an English description of the photo", "Describe the photo for people who cannot see it."))
    if content.get("imageFocus") is not None:
        issues.extend(_focus(content.get("imageFocus"), f"{prefix}imageFocus"))
    return issues


# How a session or place meets: in a room, over video or by phone. Templates draw the matching badge.
SESSION_FORMATS = ("in_person", "online", "phone")
PLACE_FORMATS = ("in_person", "online")


def _format(content: Mapping[str, object], field: str, allowed: tuple[str, ...]) -> list[ValidationIssue]:
    value = content.get("format")
    if value is None or value in allowed:
        return []
    return [_issue(f"{field}.format", "enum", value, " or ".join(allowed), "Choose how this session or place meets.")]


def _closed(value: Mapping[str, object], field: str, allowed: set[str]) -> list[ValidationIssue]:
    return [
        _issue(f"{field}.{key}", "unknown_key", key, "a field in the section schema", "Remove the unsupported field.")
        for key in sorted(set(value) - allowed)
    ]


def _list(value: object, field: str, *, required: bool = True, max_items: int = _MAX_ITEMS) -> list[ValidationIssue]:
    if value is None and not required:
        return []
    if not isinstance(value, list):
        return [_issue(field, "array", value, "an array", "Provide a list of typed records.")]
    if len(value) > max_items:
        return [_issue(field, "max_items", len(value), f"at most {max_items} records", "Reduce the number of records.")]
    return []


def _record_list(content: Mapping[str, object], field: str, allowed: set[str], *, required: bool = True, max_items: int = _MAX_ITEMS) -> list[ValidationIssue]:
    issues = _list(content.get(field), field, required=required, max_items=max_items)
    values = content.get(field)
    if not isinstance(values, list):
        return issues
    for index, value in enumerate(values):
        item_field = f"{field}[{index}]"
        if not isinstance(value, dict):
            issues.append(_issue(item_field, "object", value, "a typed record object", "Provide a structured record."))
            continue
        issues.extend(_closed(value, item_field, allowed))
    return issues


def _common(content: Mapping[str, object], allowed: set[str], *, title_required: bool = True) -> list[ValidationIssue]:
    issues = _closed(content, "content", allowed)
    issues.extend(_localized(content.get("title"), "title", required=title_required))
    if "intro" in content:
        issues.extend(_localized(content.get("intro"), "intro", required=False))
    if "body" in content:
        issues.extend(_localized(content.get("body"), "body", required=False, max_length=2400))
    return issues


def _action(content: Mapping[str, object], key: str, allowed: Iterable[str]) -> list[ValidationIssue]:
    if content.get(key) is None:
        return []
    return validate_action(content.get(key), allowed_intents=allowed, field=key)


def _hero(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"eyebrow", "title", "subtitle", "body", "primaryAction", "secondaryAction", "imageRole", "image", "imageAlt", "imageFocus"})
    issues.extend(_localized(content.get("eyebrow"), "eyebrow", required=False))
    issues.extend(_image(content, ""))
    issues.extend(_localized(content.get("subtitle"), "subtitle", required=False))
    issues.extend(_action(content, "primaryAction", allowed))
    issues.extend(_action(content, "secondaryAction", allowed))
    if content.get("imageRole") is not None:
        issues.extend(_string(content.get("imageRole"), "imageRole", max_length=64))
    return issues


def _services(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "intro", "items"})
    issues.extend(_record_list(content, "items", {"id", "name", "summary", "durationMinutes", "price", "currency", "action", "image", "imageAlt", "imageFocus", "format"}, max_items=24))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("name"), f"items[{index}].name"))
            issues.extend(_localized(item.get("summary"), f"items[{index}].summary", required=False))
            issues.extend(_string(item.get("id"), f"items[{index}].id", max_length=64))
            duration = item.get("durationMinutes")
            if isinstance(duration, bool) or not isinstance(duration, int) or not 5 <= duration <= 1440:
                issues.append(_issue(f"items[{index}].durationMinutes", "bounds", duration, "an integer from 5 to 1440", "Use the canonical service duration."))
            if item.get("price") is not None and (isinstance(item.get("price"), bool) or not isinstance(item.get("price"), (int, float)) or item.get("price") < 0):
                issues.append(_issue(f"items[{index}].price", "number", item.get("price"), "a non-negative amount", "Use the canonical service price."))
            if item.get("currency") is not None:
                issues.extend(_string(item.get("currency"), f"items[{index}].currency", max_length=8))
            issues.extend(_action(item, "action", allowed))
            issues.extend(_image(item, f"items[{index}]"))
            issues.extend(_format(item, f"items[{index}]", SESSION_FORMATS))
    return issues


def _providers(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "intro", "items"})
    issues.extend(_record_list(content, "items", {"id", "name", "role", "specialties", "credentials", "imageRole", "image", "imageAlt", "imageFocus", "action"}, max_items=24))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("name"), f"items[{index}].name"))
            issues.extend(_localized(item.get("role"), f"items[{index}].role", required=False))
            issues.extend(_string(item.get("id"), f"items[{index}].id", required=False, max_length=64))
            for key in ("specialties", "credentials"):
                entries = item.get(key)
                if not isinstance(entries, list):
                    issues.append(_issue(f"items[{index}].{key}", "array", entries, "a list of localized strings", "Provide canonical facts or an empty list. Never invent credentials."))
                else:
                    for entry_index, entry in enumerate(entries):
                        issues.extend(_localized(entry, f"items[{index}].{key}[{entry_index}]"))
            if item.get("imageRole") is not None:
                issues.extend(_string(item.get("imageRole"), f"items[{index}].imageRole", max_length=64))
            issues.extend(_image(item, f"items[{index}]"))
            issues.extend(_action(item, "action", allowed))
    return issues


def _process(content: Mapping[str, object]) -> list[ValidationIssue]:
    """Steps of a visit. An optional section photo, and an optional photo per step (sticky story scenes)."""
    issues = _common(content, {"title", "intro", "items", *IMAGE_KEYS})
    issues.extend(_image(content, ""))
    issues.extend(_record_list(content, "items", {"step", "title", "description", *IMAGE_KEYS}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            step = item.get("step")
            if isinstance(step, bool) or not isinstance(step, int) or not 1 <= step <= 12:
                issues.append(_issue(f"items[{index}].step", "bounds", step, "an integer from 1 to 12", "Number each step."))
            issues.extend(_localized(item.get("title"), f"items[{index}].title"))
            issues.extend(_localized(item.get("description"), f"items[{index}].description"))
            issues.extend(_image(item, f"items[{index}]"))
    return issues


def _gallery(content: Mapping[str, object]) -> list[ValidationIssue]:
    """Up to twelve photos with a description and an optional caption. Every item needs its photo."""
    issues = _common(content, {"title", "intro", "items"})
    issues.extend(_record_list(content, "items", {"caption", *IMAGE_KEYS}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            if item.get("image") is None:
                issues.append(_issue(f"items[{index}].image", "required", None, "a photo", "Add a photo or remove this item."))
            issues.extend(_image(item, f"items[{index}]"))
            issues.extend(_localized(item.get("caption"), f"items[{index}].caption", required=False, max_length=240))
    return issues


def _benefits(content: Mapping[str, object]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "intro", "items", "image", "imageAlt", "imageFocus"})
    issues.extend(_image(content, ""))
    issues.extend(_record_list(content, "items", {"title", "description", "icon"}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("title"), f"items[{index}].title"))
            issues.extend(_localized(item.get("description"), f"items[{index}].description"))
            issues.extend(_string(item.get("icon"), f"items[{index}].icon", max_length=32))
    return issues


def _approaches(content: Mapping[str, object]) -> list[ValidationIssue]:
    """Ways of working in plain words, for example the therapy approaches a practice uses."""
    issues = _common(content, {"title", "intro", "items", "image", "imageAlt", "imageFocus"})
    issues.extend(_image(content, ""))
    issues.extend(_record_list(content, "items", {"title", "description"}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("title"), f"items[{index}].title"))
            issues.extend(_localized(item.get("description"), f"items[{index}].description"))
    return issues


_NOTICE_PHONE_RE = re.compile(r"^[+0-9][0-9().\-\s]{1,31}$")


def _notice(content: Mapping[str, object]) -> list[ValidationIssue]:
    """A short safety or scope notice, with optional phone lines (for example emergency numbers).

    The numbers are owner content, never platform logic, so each region and practice can edit them.
    """
    issues = _common(content, {"title", "body", "items", "image", "imageAlt", "imageFocus"})
    issues.extend(_image(content, ""))
    issues.extend(_record_list(content, "items", {"label", "phone"}, required=False, max_items=6))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("label"), f"items[{index}].label", max_length=160))
            phone = item.get("phone")
            if phone is not None and (not isinstance(phone, str) or _NOTICE_PHONE_RE.fullmatch(phone.strip()) is None):
                issues.append(_issue(f"items[{index}].phone", "phone", phone, "a phone number of digits, spaces and + ( ) - only", "Enter the number as people dial it."))
    return issues


def _testimonials(content: Mapping[str, object]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "intro", "items", *IMAGE_KEYS})
    issues.extend(_image(content, ""))
    issues.extend(_record_list(content, "items", {"quote", "attribution", "role", "consent"}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("quote"), f"items[{index}].quote"))
            issues.extend(_localized(item.get("attribution"), f"items[{index}].attribution"))
            issues.extend(_localized(item.get("role"), f"items[{index}].role", required=False))
            if item.get("consent") is not True:
                issues.append(_issue(f"items[{index}].consent", "consent_required", item.get("consent"), "true", "Only publish consented testimonials."))
    return issues


def _proof(content: Mapping[str, object]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "intro", "items"})
    issues.extend(_record_list(content, "items", {"label", "value", "detail"}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("label"), f"items[{index}].label"))
            issues.extend(_localized(item.get("value"), f"items[{index}].value"))
            issues.extend(_localized(item.get("detail"), f"items[{index}].detail", required=False))
    return issues


def _locations(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "intro", "items"})
    issues.extend(_record_list(content, "items", {"id", "name", "address", "phone", "hours", "directionsAction", "image", "imageAlt", "imageFocus", "format", "body", "notes"}, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_string(item.get("id"), f"items[{index}].id", max_length=64))
            issues.extend(_localized(item.get("name"), f"items[{index}].name"))
            issues.extend(_localized(item.get("address"), f"items[{index}].address"))
            issues.extend(_localized(item.get("hours"), f"items[{index}].hours", required=False, max_length=1000))
            if item.get("phone") is not None:
                issues.extend(_string(item.get("phone"), f"items[{index}].phone", max_length=32))
            issues.extend(_action(item, "directionsAction", allowed))
            issues.extend(_image(item, f"items[{index}]"))
            issues.extend(_format(item, f"items[{index}]", PLACE_FORMATS))
            issues.extend(_localized(item.get("body"), f"items[{index}].body", required=False, max_length=600))
            notes = item.get("notes")
            issues.extend(_list(notes, f"items[{index}].notes", required=False, max_items=6))
            if isinstance(notes, list) and len(notes) <= 6:
                for note_index, note in enumerate(notes):
                    issues.extend(_localized(note, f"items[{index}].notes[{note_index}]", max_length=240))
    return issues


def _about(content: Mapping[str, object]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "body", "highlights", "imageRole", "image", "imageAlt", "imageFocus"})
    issues.extend(_localized(content.get("body"), "body", max_length=2400))
    highlights = content.get("highlights")
    if highlights is not None:
        if not isinstance(highlights, list) or len(highlights) > 8:
            issues.append(_issue("highlights", "array", highlights, "up to eight localized highlights", "Use a short list."))
        elif isinstance(highlights, list):
            for index, item in enumerate(highlights):
                issues.extend(_localized(item, f"highlights[{index}]"))
    if content.get("imageRole") is not None:
        issues.extend(_string(content.get("imageRole"), "imageRole", max_length=64))
    issues.extend(_image(content, ""))
    return issues


def _faq(content: Mapping[str, object]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "items", "image", "imageAlt", "imageFocus"})
    issues.extend(_image(content, ""))
    issues.extend(_record_list(content, "items", {"question", "answer"}, max_items=20))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("question"), f"items[{index}].question"))
            issues.extend(_localized(item.get("answer"), f"items[{index}].answer", max_length=1600))
    return issues


def _contact(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "body", "phone", "email", "action", *IMAGE_KEYS})
    issues.extend(_image(content, ""))
    if content.get("phone") is not None:
        issues.extend(_string(content.get("phone"), "phone", max_length=32))
    if content.get("email") is not None:
        issues.extend(_string(content.get("email"), "email", max_length=160))
    issues.extend(_action(content, "action", allowed))
    return issues


def _booking(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "body", "action", "image", "imageAlt", "imageFocus"})
    issues.extend(_image(content, ""))
    action = content.get("action")
    if action is None:
        issues.append(_issue("action", "required", None, "a booking action", "Add the primary booking action."))
    else:
        issues.extend(validate_action(action, allowed_intents=allowed, field="action"))
        if isinstance(action, dict) and action.get("intent") not in {"booking_start", "service_selection", "provider_selection"}:
            issues.append(_issue("action.intent", "booking_required", action.get("intent"), "a booking intent", "Use booking_start for the primary CTA."))
    return issues


def _footer(content: Mapping[str, object], allowed: Iterable[str]) -> list[ValidationIssue]:
    issues = _common(content, {"title", "body", "items"}, title_required=False)
    issues.extend(_record_list(content, "items", {"label", "action"}, required=False, max_items=12))
    values = content.get("items")
    if isinstance(values, list):
        for index, item in enumerate(values):
            if not isinstance(item, dict):
                continue
            issues.extend(_localized(item.get("label"), f"items[{index}].label"))
            issues.extend(_action(item, "action", allowed))
    return issues


def validate_typed_section(
    section_type: object,
    content: object,
    *,
    allowed_intents: Iterable[str] = ACTION_INTENTS,
) -> ValidationReport:
    """Validate one v2 section against its closed typed contract."""

    if not isinstance(content, dict):
        return ValidationReport((_issue("content", "object", content, "a section content object", "Provide structured content."),))
    validators = {
        "hero": lambda: _hero(content, allowed_intents),
        "services": lambda: _services(content, allowed_intents),
        "providers": lambda: _providers(content, allowed_intents),
        "process": lambda: _process(content),
        "benefits": lambda: _benefits(content),
        "approaches": lambda: _approaches(content),
        "notice": lambda: _notice(content),
        "testimonials": lambda: _testimonials(content),
        "proof": lambda: _proof(content),
        "locations": lambda: _locations(content, allowed_intents),
        "about": lambda: _about(content),
        "faq": lambda: _faq(content),
        "contact": lambda: _contact(content, allowed_intents),
        "booking_cta": lambda: _booking(content, allowed_intents),
        "footer": lambda: _footer(content, allowed_intents),
        "gallery": lambda: _gallery(content),
    }
    validator = validators.get(section_type)
    if validator is None:
        return ValidationReport((_issue("section_type", "unknown_section_type", section_type, "a section in the selected recipe", "Choose a supported section."),))
    return ValidationReport(tuple(validator()))
