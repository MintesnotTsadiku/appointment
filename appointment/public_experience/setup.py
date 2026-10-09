"""Owner website setup, backed by the certified compiler and publisher."""

from __future__ import annotations

import json
from importlib.resources import files

import frappe
from frappe import _

from appointment.content import entitlements, tenancy
from appointment.public_experience import brand_compiler, publisher
from appointment.public_experience.errors import BrandExperienceError, StaleDraftError
from appointment.public_experience.recipes import get_recipe, list_recipes
from appointment.public_experience.setup_preview import content_examples

STEPS = ("template", "brand", "content", "features", "readiness", "published", "skipped")
CATALOG = {
    "selam-movement": ("wellness", "warm", "expressive"),
    "bloom-hair": ("beauty", "bold", "expressive"),
    "meron-atelier": ("creative", "editorial", "spacious"),
    "abugida-language": ("education", "friendly", "comfortable"),
    "tena-clinic": ("health", "calm", "comfortable"),
}


def validated_preferences(value):
    if value is None:
        return {}
    allowed = {
        "industry": {"", "wellness", "beauty", "creative", "education", "health"},
        "mood": {"", "warm", "bold", "editorial", "friendly", "calm"},
        "audience": {"", "clients", "learners", "patients"},
        "density": {"", "comfortable", "spacious", "expressive"},
        "main_action": {"booking", "contact"},
    }
    if not isinstance(value, dict) or set(value) - set(allowed):
        frappe.throw(_("Choose supported website preferences."))
    if any(not isinstance(choice, str) or choice not in allowed[key] for key, choice in value.items()):
        frappe.throw(_("Choose supported website preferences."))
    return dict(value)


def ranked_catalog(industry="", mood="", audience="", preferred_density=""):
    catalog = json.loads(files("appointment").joinpath("public_experience/manifest/showcase/catalog.v1.json").read_text())
    rows = []
    for recipe in list_recipes():
        sector, feeling, density = CATALOG[recipe.key]
        target = {"health": "patients", "education": "learners"}.get(sector, "clients")
        score = (4 if sector == industry else 0) + (2 if feeling == mood else 0) + (2 if target == audience else 0) + (1 if density == preferred_density else 0)
        rows.append({**recipe.as_summary(), "industry": sector, "density": density,
                     "score": score, "audienceAttributes": [target], "imageryIntensity": "high",
                     "rankingReasons": [label for value, match, label in ((sector, industry, _("Business focus")), (feeling, mood, _("Feeling")), (target, audience, _("Audience")), (density, preferred_density, _("Content density"))) if match and value == match],
                     "fontPairing": recipe.primitives["typography"].key.replace("-", " "),
                     "requiredAssetRoles": ["heroAsset", "detailAsset"], "lightDarkSupport": ["light", "dark"],
                     "surfaces": ["landing", "book", "scheduler", "blog", "article", "gallery", "collection", "newsletter"],
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
        raise StaleDraftError(_("Your website changed. Reload before saving."))
    return doc


def state(doc):
    profile = frappe.get_doc("Brand Profile", doc.brand_profile)
    from appointment.public_experience.appearance import options

    return {"appearanceOptions": options(get_recipe(doc.recipe_key)), "owner": doc.organization or doc.provider, "site": doc.name, "title": doc.site_title, "slug": doc.slug,
            "draftVersion": doc.draft_version, "recipeKey": doc.recipe_key,
            "profile": profile.name, "brandVersion": profile.draft_version,
            "brandInputs": json.loads(profile.brand_inputs_json or "{}"),
            "identityAssets": {field: profile.get(field) for field in ("logo_primary", "logo_compact", "favicon")},
            "setup": json.loads(doc.website_setup_json or "{}"),
            "sections": [{"type": row.section_type, "content": json.loads(row.content_json)} for row in doc.sections],
            "status": doc.status, "url": doc.platform_url,
            "capabilities": list(entitlements.list_entitlements(doc.owner_type, doc.organization, doc.provider).values())}


def start(owner_type, owner, title, slug, recipe_key, preferences=None):
    preferences = validated_preferences(preferences)
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
                          "website_setup_json": json.dumps({"step": "brand", "features": [], "preferences": preferences})})
    for row in prefill_sections(scope, title, recipe, preferences):
        doc.append("sections", row)
    doc.insert()
    return state(doc)


def save(site, expected_version, step, title=None, sections=None, features=None, brand_inputs=None):
    if step not in STEPS:
        frappe.throw(_("Choose a website setup step."))
    doc = _locked_site(site, expected_version)
    setup = json.loads(doc.website_setup_json or "{}")
    if features is not None:
        if not isinstance(features, list) or set(features) - {"blog", "gallery", "newsletter"}:
            frappe.throw(_("Choose supported website features."))
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
            frappe.throw(_("Provide at most twenty website sections."))
        doc.set("sections", [])
        for index, row in enumerate(sections):
            if not isinstance(row, dict) or set(row) != {"type", "content"}:
                frappe.throw(_("Each section needs a type and content."))
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


def readiness(site, expected_version):
    """Validate the same draft that the guided publisher will compile."""
    doc = _locked_site(site, expected_version)
    checks = []
    try:
        preview(site, expected_version)
        checks.append({"check": "website_draft", "ok": True, "remediation": None})
    except (BrandExperienceError, frappe.ValidationError) as error:
        checks.append({"check": "website_draft", "ok": False, "remediation": str(error)})
    business = frappe.get_doc(doc.owner_type, doc.organization or doc.provider)
    if doc.organization:
        from appointment.scheduler import workspace

        offerings = [row for row in workspace.overview() if row["organization"] == doc.organization]
        booking_ready = bool(business.enable_public_booking and any(row["published"] for row in offerings))
    else:
        booking_ready = bool(frappe.db.get_value("Provider", doc.provider, "enable_public_booking") and frappe.db.exists("EventType", {"provider": doc.provider, "is_active": 1}))
    checks.append({"check": "booking", "ok": booking_ready,
                   "remediation": None if booking_ready else _("Create and publish an appointment offering in Business settings.")})
    for capability in json.loads(doc.website_setup_json or "{}").get("features", []):
        entitlement = entitlements.resolve_entitlement(doc.owner_type, doc.organization, doc.provider, capability)
        active = bool(entitlement and entitlement["active"])
        checks.append({"check": capability, "ok": active,
                       "remediation": None if active else _("Restore this website feature before publishing.")})
    return {"ready": all(check["ok"] for check in checks), "checks": checks}


def preview(site, expected_version, brand_inputs=None):
    doc = _locked_site(site, expected_version)
    profile = frappe.get_doc("Brand Profile", doc.brand_profile)
    if brand_inputs is not None:
        if isinstance(brand_inputs, str):
            brand_inputs = json.loads(brand_inputs)
        allowed = {"paletteChoice", "fontChoice", "accentColor", "presentationDensity"}
        if not isinstance(brand_inputs, dict) or set(brand_inputs) - allowed:
            frappe.throw(_("Choose supported appearance adjustments."))
        inputs = json.loads(profile.brand_inputs_json or "{}")
        for key in ("palette_choice", "font_choice", "accent_color", "presentation_density"):
            inputs.pop(key, None)
        profile.brand_inputs_json = json.dumps({**inputs, **brand_inputs})
    # Compile drafts without publishing a brand revision or experience release.
    design = brand_compiler.compile_brand(profile, profile.draft_version).as_dict()["compiledDesign"]
    recipe = get_recipe(doc.recipe_key)
    sections = publisher._compose_sections(doc, recipe, public_path=f"/{doc.slug}")
    return {"contract": "appointment-public-snapshot.v2", "recipeKey": recipe.key,
            "recipeVersion": recipe.version, "compiledDesign": design, "sections": sections,
            "locale": doc.default_locale, "routeKind": "site", "availableLocales": [doc.default_locale],
            "seo": json.loads(doc.seo_json or "{}"), "booking": json.loads(doc.booking_json or "{}"),
            "previewContent": content_examples(recipe)}


def preview_template(owner_type, owner, recipe_key, preferences=None):
    preferences = validated_preferences(preferences)
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
    for row in prefill_sections(scope, title, recipe, preferences):
        doc.append("sections", row)
    return {"contract": "appointment-public-snapshot.v2", "recipeKey": recipe.key,
            "recipeVersion": recipe.version, "compiledDesign": design,
            "sections": publisher._compose_sections(doc, recipe, public_path="/website-preview"),
            "locale": "en", "routeKind": "site", "availableLocales": ["en"], "seo": {}, "booking": {},
            "previewContent": content_examples(recipe)}


def prefill_sections(scope, title, recipe, preferences=None):
    text = lambda value: {"en": value}
    contact = (preferences or {}).get("main_action") == "contact"
    action = {"intent": "contact" if contact else "booking_start",
              "label": text("Contact us" if contact else "Book an appointment"), "placement": "primary"}
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
                    "booking_cta": {"title": text("Plan your appointment"), "action": {
                        "intent": "booking_start", "label": text("Book an appointment"), "placement": "primary"}},
                    "footer": {"body": text(title), "items": []}})
    for field in ("phone", "email"):
        if business.get(field):
            content["contact"][field] = business.get(field)
    operational_owner = {"organization": scope["organization"]} if scope["organization"] else {"independent_provider": scope["provider"], "organization": ["is", "not set"]}
    if scope["organization"] or scope["provider"]:
        services = frappe.get_all("Service", filters={**operational_owner, "is_active": 1},
                                  fields=["name", "service_name", "description", "duration", "price"], limit=24)
        content["services"]["items"] = [{"id": row.name, "name": text(row.service_name),
                                          "durationMinutes": row.duration, "price": row.price, "currency": "ETB",
                                          **({"summary": text(row.description)} if row.description else {})} for row in services]
        locations = frappe.get_all("Location", filters={**operational_owner, "is_active": 1},
                                   fields=["name", "location_name", "address_line_1", "phone"], order_by="location_name", limit=12)
        for location in locations:
            if not location.address_line_1:
                continue
            hours = frappe.get_doc("Location", location.name).opening_hours
            description = "; ".join(f"{row.day_of_week}: {frappe.utils.get_time(row.start_time).strftime('%H:%M')}–{frappe.utils.get_time(row.end_time).strftime('%H:%M')}"
                                    for row in hours if row.is_open)
            content["locations"]["items"].append({"id": location.name[:64], "name": text(location.location_name),
                                                  "address": text(location.address_line_1),
                                                  **({"hours": text(description)} if description else {}),
                                                  **({"phone": location.phone} if location.phone else {})})
        names = frappe.get_all("Provider Organization", filters={"organization": scope["organization"], "status": "Active"},
                               pluck="parent", limit=24)
    else:
        names = [scope["provider"]]
    if names:
        providers = frappe.get_all("Provider", filters={"name": ["in", names], "is_active": 1}, fields=["name", "provider_name"], limit=24)
        content["providers"]["items"] = [{"id": row.name[:64], "name": text(row.provider_name),
                                           "role": text("Provider"), "specialties": [], "credentials": []} for row in providers]
    if scope["organization"]:
        from appointment.organization_import import website

        merged = website.merge([{"type": kind, "content": value} for kind, value in content.items()],
                               website.pending(scope["organization"]))
        content = {row["type"]: row["content"] for row in merged}
    return [{"section_id": kind, "section_type": kind, "enabled": 1, "order_index": index,
             "schema_version": 2, "content_json": json.dumps(content[kind])}
            for index, kind in enumerate(recipe.required_sections)]
