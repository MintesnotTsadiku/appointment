"""Move an existing website draft to another certified template.

The owner confirms the switch in website setup. The draft takes the new recipe, its default
appearance and its starter content. Sections the owner edited keep the owner's words when the new
recipe uses them; a section the new recipe does not use is left out. The published website does
not change until the owner publishes again.
"""

from __future__ import annotations

import json

import frappe

from appointment.public_experience import setup
from appointment.public_experience.recipes import get_recipe
from appointment.public_experience.section_schemas import validate_typed_section


def switch(site, expected_version, recipe_key):
    doc = setup._locked_site(site, expected_version)
    recipe = get_recipe(recipe_key)
    if doc.recipe_key == recipe.key and int(doc.recipe_version or 0) == recipe.version:
        return setup.state(doc)
    scope = {"owner_type": doc.owner_type, "organization": doc.organization, "provider": doc.provider}
    preferences = json.loads(doc.website_setup_json or "{}").get("preferences") or {}
    starter = _by_type(setup.prefill_sections(scope, doc.site_title, recipe, preferences))
    untouched = _by_type(setup.prefill_sections(scope, doc.site_title, get_recipe(doc.recipe_key, doc.recipe_version), preferences))
    _switch_profile(doc.brand_profile, recipe)
    doc.recipe_key, doc.recipe_version = recipe.key, recipe.version
    doc.set("sections", _sections(doc.sections, starter, untouched, recipe))
    progress = json.loads(doc.website_setup_json or "{}")
    progress["step"] = "brand"
    doc.website_setup_json = json.dumps(progress)
    doc.save()
    return setup.state(doc)


def _switch_profile(profile_name, recipe):
    profile = frappe.get_doc("Brand Profile", profile_name)
    profile.recipe_key, profile.recipe_version = recipe.key, recipe.version
    # The appearance choices of the old template do not fit the new one; start from its defaults.
    profile.brand_inputs_json = json.dumps(dict(recipe.default_inputs))
    profile.save()


def _sections(stored_rows, starter, untouched, recipe):
    """The new recipe's sections: the owner's edited content where it is valid, else the starter."""
    rows = []
    for kind in recipe.required_sections:
        row = next((item for item in stored_rows if item.section_type == kind), None)
        content = json.loads(row.content_json or "{}") if row else None
        edited = row and row.content_json != (untouched.get(kind) or {}).get("content_json")
        keep = edited and validate_typed_section(kind, content, allowed_intents=recipe.action_intents).ok
        rows.append({**starter[kind], **({"content_json": row.content_json} if keep else {})})
    return rows


def _by_type(rows):
    return {row["section_type"]: row for row in rows}
