"""Owner website setup, backed by the certified compiler and publisher."""

from __future__ import annotations

import json
from importlib.resources import files

import frappe

from appointment.content import entitlements, tenancy
from appointment.public_experience import brand_compiler, publisher
from appointment.public_experience.errors import StaleDraftError
from appointment.public_experience.recipes import get_recipe, list_recipes

STEPS = ("template", "brand", "content", "features", "readiness", "published", "skipped")
CATALOG = {
    "selam-movement": ("wellness", "warm", "expressive"),
    "bloom-hair": ("beauty", "bold", "expressive"),
    "meron-atelier": ("creative", "editorial", "spacious"),
    "abugida-language": ("education", "friendly", "comfortable"),
    "tena-clinic": ("health", "calm", "comfortable"),
}


def ranked_catalog(industry="", mood=""):
    catalog = json.loads(files("appointment").joinpath("public_experience/manifest/showcase/catalog.v1.json").read_text())
    rows = []
    for recipe in list_recipes():
        sector, feeling, density = CATALOG[recipe.key]
        score = (4 if sector == industry else 0) + (2 if feeling == mood else 0)
        rows.append({**recipe.as_summary(), "industry": sector, "density": density,
                     "score": score, "surfaces": ["landing", "book", "scheduler", "blog", "gallery", "newsletter"],
                     "businessModels": ["individual", "organization"], "scripts": ["Latin", "Ethiopic"],
                     "imagery": dict(recipe.default_inputs), "certificationVersion": recipe.version,
                     "thumbnail": next(row["heroAsset"] for row in catalog["sites"].values() if row["recipe"] == recipe.key)})
    return sorted(rows, key=lambda row: (-row["score"], row["key"]))


def owner_scope(owner_type, owner):
    organization = owner if owner_type == "Organization" else None
    provider = owner if owner_type == "Provider" else None
    tenancy.require_manage_business(owner_type, organization, provider)
    entitlements.require_capability(owner_type, organization, provider, "public_site")
    return {"owner_type": owner_type, "organization": organization, "provider": provider}


def require_site(site):
    doc = frappe.get_doc("Public Site", site)
    owner_scope(doc.owner_type, doc.organization or doc.provider)
    return doc


def _locked_site(site, expected_version):
    doc = require_site(site)
    frappe.db.sql("select name from `tabPublic Site` where name=%s for update", doc.name)
    doc.reload()
    if int(doc.draft_version) != int(expected_version):
        raise StaleDraftError("Your website changed. Reload before saving.")
    return doc


def state(doc):
    profile = frappe.get_doc("Brand Profile", doc.brand_profile)
    return {"site": doc.name, "title": doc.site_title, "slug": doc.slug,
            "draftVersion": doc.draft_version, "recipeKey": doc.recipe_key,
            "profile": profile.name, "brandVersion": profile.draft_version,
            "brandInputs": json.loads(profile.brand_inputs_json or "{}"),
            "setup": json.loads(doc.website_setup_json or "{}"),
            "sections": [{"type": row.section_type, "content": json.loads(row.content_json)} for row in doc.sections],
            "status": doc.status, "url": doc.platform_url,
            "capabilities": list(entitlements.list_entitlements(doc.owner_type, doc.organization, doc.provider).values())}


def start(owner_type, owner, title, slug, recipe_key):
    scope = owner_scope(owner_type, owner)
    # Serialize concurrent starts on the business; a single active site/profile is authoritative.
    frappe.db.sql(f"select name from `tab{owner_type}` where name=%s for update", owner)
    existing = frappe.db.get_value("Public Site", {**scope, "status": ["!=", "Archived"]}, "name")
    if existing:
        return state(require_site(existing))
    recipe = get_recipe(recipe_key)
    profile_name = frappe.db.get_value("Brand Profile", {**scope, "lifecycle": ["!=", "Archived"]}, "name")
    if profile_name:
        profile = frappe.get_doc("Brand Profile", profile_name)
        recipe = get_recipe(profile.recipe_key)
    else:
        profile = frappe.get_doc({"doctype": "Brand Profile", **scope, "profile_name": title,
                                  "application_name": title, "recipe_key": recipe.key,
                                  "brand_inputs_json": json.dumps(dict(recipe.default_inputs))}).insert()
    doc = frappe.get_doc({"doctype": "Public Site", **scope, "site_title": title, "slug": slug,
                          "brand_profile": profile.name, "recipe_key": recipe.key,
                          "website_setup_json": json.dumps({"step": "brand", "features": []})})
    for row in prefill_sections(scope, title, recipe):
        doc.append("sections", row)
    doc.insert()
    return state(doc)


def save(site, expected_version, step, title=None, sections=None, features=None, brand_inputs=None):
    if step not in STEPS:
        frappe.throw("Choose a website setup step.")
    doc = _locked_site(site, expected_version)
    setup = json.loads(doc.website_setup_json or "{}")
    if features is not None:
        if not isinstance(features, list) or set(features) - {"blog", "gallery", "newsletter"}:
            frappe.throw("Choose supported website features.")
        for capability in features:
            entitlements.require_capability(doc.owner_type, doc.organization, doc.provider, capability)
        setup["features"] = sorted(set(features))
    if title is not None:
        doc.site_title = title
    if brand_inputs is not None:
        profile = frappe.get_doc("Brand Profile", doc.brand_profile)
        profile.brand_inputs_json = json.dumps(brand_inputs)
        profile.application_name = doc.site_title
        profile.save()
    if sections is not None:
        if not isinstance(sections, list) or len(sections) > 20:
            frappe.throw("Provide at most twenty website sections.")
        doc.set("sections", [])
        for index, row in enumerate(sections):
            if not isinstance(row, dict) or set(row) != {"type", "content"}:
                frappe.throw("Each section needs a type and content.")
            doc.append("sections", {"section_id": row["type"], "section_type": row["type"],
                                    "enabled": 1, "order_index": index, "schema_version": 2,
                                    "content_json": json.dumps(row["content"])})
    setup["step"] = step
    doc.website_setup_json = json.dumps(setup)
    doc.save()
    return state(doc)


def publish(site, expected_version):
    doc = _locked_site(site, expected_version)
    profile = frappe.get_doc("Brand Profile", doc.brand_profile)
    brand_compiler.publish_brand(profile, profile.draft_version)
    release = publisher.publish_experience(doc, doc.draft_version)
    doc.reload()
    setup = json.loads(doc.website_setup_json or "{}")
    setup["step"] = "published"
    doc.website_setup_json = json.dumps(setup)
    doc.save()
    return {**state(doc), "release": release.name}


def preview(site, expected_version):
    doc = _locked_site(site, expected_version)
    profile = frappe.get_doc("Brand Profile", doc.brand_profile)
    # Compile drafts without publishing a brand revision or experience release.
    design = brand_compiler.compile_brand(profile, profile.draft_version).as_dict()["compiledDesign"]
    recipe = get_recipe(doc.recipe_key)
    sections = publisher._compose_sections(doc, recipe, public_path=f"/{doc.slug}")
    return {"contract": "appointment-public-snapshot.v2", "recipeKey": recipe.key,
            "recipeVersion": recipe.version, "compiledDesign": design, "sections": sections,
            "locale": doc.default_locale, "routeKind": "site", "availableLocales": [doc.default_locale],
            "seo": json.loads(doc.seo_json or "{}"), "booking": json.loads(doc.booking_json or "{}")}


def preview_template(owner_type, owner, recipe_key):
    scope = owner_scope(owner_type, owner)
    recipe = get_recipe(recipe_key)
    business = frappe.get_doc(owner_type, owner)
    title = business.get("organization_name") or business.get("provider_name")
    profile = frappe.get_doc({"doctype": "Brand Profile", **scope, "profile_name": title,
                              "application_name": title, "recipe_key": recipe.key,
                              "recipe_version": recipe.version, "draft_version": 1})
    design = brand_compiler.compile_brand(profile, 1).as_dict()["compiledDesign"]
    doc = frappe.get_doc({"doctype": "Public Site", **scope, "slug": "website-preview", "site_title": title,
                          "recipe_key": recipe.key, "recipe_version": recipe.version, "default_locale": "en"})
    for row in prefill_sections(scope, title, recipe):
        doc.append("sections", row)
    return {"contract": "appointment-public-snapshot.v2", "recipeKey": recipe.key,
            "recipeVersion": recipe.version, "compiledDesign": design,
            "sections": publisher._compose_sections(doc, recipe, public_path="/website-preview"),
            "locale": "en", "routeKind": "site", "availableLocales": ["en"], "seo": {}, "booking": {}}


def prefill_sections(scope, title, recipe):
    text = lambda value: {"en": value}
    action = {"intent": "booking_start", "label": text("Book an appointment"), "placement": "primary"}
    list_types = {"services", "providers", "process", "benefits", "testimonials", "proof", "locations", "faq"}
    headings = {"services": "Services", "providers": "Our team", "process": "Your visit", "benefits": "What to expect",
                "testimonials": "Client stories", "proof": "Our work", "locations": "Visit us", "faq": "Questions"}
    business = frappe.get_doc(scope["owner_type"], scope["organization"] or scope["provider"])
    description = business.get("description") or f"Welcome to {title}. Contact us to learn more about our services."
    # Drafts never invent testimonials, credentials, addresses, or business claims.
    content = {kind: {"title": text(headings[kind]), "items": []} for kind in list_types}
    content.update({"hero": {"title": text(title), "subtitle": text(description[:1000]), "primaryAction": action},
                    "about": {"title": text(f"About {title}"), "body": text(description[:2400])},
                    "contact": {"title": text("Contact us")},
                    "booking_cta": {"title": text("Plan your appointment"), "action": action},
                    "footer": {"body": text(title), "items": []}})
    for field in ("phone", "email"):
        if business.get(field):
            content["contact"][field] = business.get(field)
    if scope["organization"]:
        services = frappe.get_all("Service", filters={"organization": scope["organization"], "is_active": 1},
                                  fields=["name", "service_name", "description", "duration", "price"], limit=24)
        content["services"]["items"] = [{"id": row.name, "name": text(row.service_name),
                                          "durationMinutes": row.duration, "price": row.price, "currency": "ETB",
                                          **({"summary": text(row.description)} if row.description else {})} for row in services]
    return [{"section_id": kind, "section_type": kind, "enabled": 1, "order_index": index,
             "schema_version": 2, "content_json": json.dumps(content[kind])}
            for index, kind in enumerate(recipe.required_sections)]
