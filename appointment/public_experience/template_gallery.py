"""Public template gallery for the platform landing page.

Every certified recipe (the latest version, as `list_recipes` offers them) becomes
one gallery entry. Its showcase, hero and preview screenshots come from the
showcase catalog, so a new recipe or a new showcase appears without code changes.
The live example link is offered only while that showcase site is published.
"""

from __future__ import annotations

import frappe

from appointment.public_experience.design_compiler import _load_primitive
from appointment.public_experience.recipes import RecipeDefinition, available_recipes
from appointment.public_experience.setup import CATALOG as RECIPE_FOCUS
from appointment.public_experience.showcase_catalog import load_showcase_catalog


def template_gallery() -> dict[str, list[dict[str, object]]]:
    showcases: dict[str, dict] = {}
    for site in load_showcase_catalog()["sites"].values():
        showcases.setdefault(site["recipe"], site)
    published = _published_titles([site["slug"] for site in showcases.values()])
    return {"templates": [_entry(recipe, showcases.get(recipe.key), published) for recipe in available_recipes()]}


def _entry(recipe: RecipeDefinition, site: dict | None, published: dict[str, str]) -> dict[str, object]:
    palette = _load_primitive(recipe, "palette")
    semantic = palette.get("semantic") if isinstance(palette.get("semantic"), dict) else {}
    light = semantic.get("light") or {}
    slug = site["slug"] if site else None
    return {
        "key": recipe.key,
        "version": recipe.version,
        "label": recipe.label,
        "description": recipe.description,
        "audience": recipe.audience,
        "industry": RECIPE_FOCUS.get(recipe.key, ("",))[0],
        "locales": list(recipe.supported_locales),
        "themes": [mode for mode in ("light", "dark") if mode in semantic],
        "accent": light.get("primary"),
        "hero": site.get("heroAsset") if site else None,
        "previews": {row["viewport"]: row["asset"] for row in (site or {}).get("previewAssets") or []},
        "showcase": {"path": "/" + slug, "title": published[slug]} if slug in published else None,
    }


def _published_titles(slugs: list[str]) -> dict[str, str]:
    if not slugs:
        return {}
    rows = frappe.get_all(
        "Public Site",
        filters={"slug": ["in", slugs], "status": "Published"},
        fields=["slug", "site_title"],
    )
    return {row.slug: row.site_title for row in rows}
