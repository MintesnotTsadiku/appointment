"""Merge an edited section into the stored one without losing a language.

An editor (or an older client) may send only the English value of a localized field. The stored Amharic
of that field stays, so an English edit never drops a translation. Rules:

- A localized value is an object whose keys are locales and whose values are strings.
  A locale that the edit leaves out keeps its stored text; an empty string clears it.
  A localized value with no text left is removed.
- Other object keys follow the edit: a key that the edit leaves out is removed (for example an image reset).
- List items are matched by their `id` when they have one. Items without an `id` (FAQ, notes, steps) are
  taken as sent, because a reorder changes their positions; the editor always sends both languages for them.
"""

from __future__ import annotations

from appointment.public_experience.section_schemas import SUPPORTED_LOCALES


def merge_content(stored: object, edited: object) -> object:
    if is_localized(edited):
        return _merge_localized(stored if is_localized(stored) else {}, edited)
    if isinstance(edited, dict):
        base = stored if isinstance(stored, dict) else {}
        merged = {}
        for key, value in edited.items():
            result = merge_content(base.get(key), value)
            if result is not _EMPTY:
                merged[key] = result
        return merged
    if isinstance(edited, list):
        return _merge_list(stored if isinstance(stored, list) else [], edited)
    return edited


def is_localized(value: object) -> bool:
    return (isinstance(value, dict) and bool(value) and set(value) <= set(SUPPORTED_LOCALES)
            and all(isinstance(text, str) for text in value.values()))


_EMPTY = object()


def _merge_localized(stored: dict, edited: dict) -> object:
    merged = {**stored, **edited}
    cleaned = {locale: text for locale, text in merged.items() if text.strip()}
    return cleaned or _EMPTY


def _merge_list(stored: list, edited: list) -> list:
    by_id = {item["id"]: item for item in stored if isinstance(item, dict) and isinstance(item.get("id"), str)}
    merged = []
    for item in edited:
        previous = by_id.get(item.get("id")) if isinstance(item, dict) and isinstance(item.get("id"), str) else None
        result = merge_content(previous, item)
        if result is not _EMPTY:
            merged.append(result)
    return merged
