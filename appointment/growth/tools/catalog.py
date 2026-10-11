"""UI text for the server-rendered tool pages.

The English source lives in the frontend catalog (`frontend/src/lib/i18n/translations/en.json`,
merged with the growth `strings.sh` helper). Amharic comes from the `Translation` records that the
catalog import creates, so an administrator's correction in the Translation list also reaches these
pages.
"""

from __future__ import annotations

import json
import os

import frappe
from frappe import _

_CACHE: dict = {"mtime": None, "flat": {}}


def english_catalog() -> dict[str, str]:
    """The flattened English catalog, reread when the file changes."""

    path = os.path.join(
        os.path.dirname(frappe.get_app_path("appointment")), "frontend", "src", "lib", "i18n", "translations", "en.json"
    )
    mtime = os.path.getmtime(path)
    if _CACHE["mtime"] != mtime:
        with open(path, encoding="utf-8") as handle:
            _CACHE["flat"] = _flatten(json.load(handle))
        _CACHE["mtime"] = mtime
    return _CACHE["flat"]


def text(key: str, lang: str = "en") -> str:
    """The catalog text of `key` in `lang` ("en" or "am")."""

    english = english_catalog().get(key)
    if english is None:
        raise KeyError(f"Missing tools catalog key: {key}")
    return english if lang == "en" else _(english, lang=lang)


class Translator:
    """`t("title")` reads `<group>.title`; `t("tools.common.copy")` reads a full key."""

    def __init__(self, group: str, lang: str):
        self.group = group
        self.lang = lang

    def __call__(self, key: str, *args) -> str:
        full_key = key if key.startswith("tools.") else f"{self.group}.{key}"
        value = text(full_key, self.lang)
        return value.format(*args) if args else value

    def both(self, key: str) -> dict[str, str]:
        full_key = key if key.startswith("tools.") else f"{self.group}.{key}"
        return {"en": text(full_key, "en"), "am": text(full_key, "am")}


def _flatten(value: dict, prefix: str = "") -> dict[str, str]:
    flat = {}
    for key, item in value.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(item, dict):
            flat.update(_flatten(item, full_key))
        elif isinstance(item, str):
            flat[full_key] = item
    return flat
