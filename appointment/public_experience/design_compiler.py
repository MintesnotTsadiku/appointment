"""Pure compiler for certified curated Brand Recipes.

This module is deliberately independent of Frappe, the database, Redis and
request state. It accepts a recipe plus a small typed intent object and returns
one canonical, hashed CompiledDesign. The renderer and publisher consume that
artifact; they do not resolve primitives independently.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from appointment.public_experience.canonical import canonicalize, hash_document
from appointment.public_experience.colors import color_distance, contrast_ratio, is_valid_hex, normalize_hex
from appointment.public_experience.errors import DesignCompilationError, DesignManifestError
from appointment.public_experience.recipes import (
    COMPILER_POLICY_VERSION,
    COMPILED_DESIGN_CONTRACT,
    _read,
    get_recipe,
)

_ALLOWED_INPUTS = frozenset(
    {
        "application_name",
        "short_name",
        "accent_color",
        "motion",
        "presentation_density",
        "hero_asset",
        "detail_asset",
        "logo_primary",
        "logo_compact",
        "favicon",
    }
)
_ALLOWED_CAPABILITIES = frozenset({"sections", "locales", "content_richness"})
_PALETTE_ROLES = frozenset(
    {
        "canvas",
        "surface",
        "surfaceMuted",
        "surfaceStrong",
        "text",
        "textMuted",
        "border",
        "primary",
        "onPrimary",
        "accent",
        "link",
        "focus",
        "available",
        "selected",
        "today",
        "limitedCapacity",
        "waitlist",
        "unavailable",
        "danger",
        "error",
        "success",
        "notice",
        "authentication",
        "disabled",
    }
)
_ACTION_INTENTS = frozenset(
    {
        "booking_start",
        "service_selection",
        "provider_selection",
        "call",
        "directions",
        "contact",
        "faq_jump",
        "back_to_site",
    }
)


@dataclass(frozen=True)
class CompiledDesign:
    """An immutable renderer-safe design artifact."""

    contract: str
    compiler_policy_version: str
    recipe_key: str
    recipe_version: int
    recipe_hash: str
    primitive_manifest: Mapping[str, Mapping[str, object]]
    tokens: Mapping[str, Mapping[str, str]]
    typography: Mapping[str, object]
    layout: Mapping[str, object]
    surface: Mapping[str, object]
    density: Mapping[str, object]
    motion: str
    assets: Mapping[str, Mapping[str, object]]
    action_intents: tuple[str, ...]
    content_capabilities: Mapping[str, object]
    locale_capabilities: Mapping[str, object]
    identity: Mapping[str, str]
    validation: Mapping[str, object]
    canonical: str
    content_hash: str

    @property
    def is_valid(self) -> bool:
        return bool(self.validation.get("ok"))

    def as_dict(self) -> dict[str, object]:
        result = {
            "contract": self.contract,
            "compilerPolicyVersion": self.compiler_policy_version,
            "recipeKey": self.recipe_key,
            "recipeVersion": self.recipe_version,
            "recipeHash": self.recipe_hash,
            "primitiveManifest": {key: dict(value) for key, value in self.primitive_manifest.items()},
            "tokens": {mode: dict(values) for mode, values in self.tokens.items()},
            "typography": dict(self.typography),
            "layout": dict(self.layout),
            "surface": dict(self.surface),
            "density": dict(self.density),
            "motion": self.motion,
            "assets": {key: dict(value) for key, value in self.assets.items()},
            "actionIntents": list(self.action_intents),
            "contentCapabilities": dict(self.content_capabilities),
            "localeCapabilities": dict(self.locale_capabilities),
            "identity": dict(self.identity),
            "validation": dict(self.validation),
            "contentHash": self.content_hash,
        }
        return result


def _error(message: str, *, field: str | None = None, observed: object = None) -> DesignCompilationError:
    details = {}
    if field:
        details["field"] = field
    if observed is not None:
        details["observed"] = observed
    return DesignCompilationError(message, details=details)


def _safe_text(value: object, field: str, fallback: str = "") -> str:
    if value is None:
        return fallback
    if not isinstance(value, str) or not value.strip() or len(value) > 140 or any(
        character in value for character in "<>\x00\x01\x02\x03"
    ):
        raise _error(f"{field} must be short plain text", field=field, observed=value)
    return value.strip()


def _load_primitive(recipe, kind: str) -> dict[str, object]:
    reference = recipe.primitives[kind]
    path_template = {
        "palette": "public_experience/manifest/design/palettes/{key}.v{version}.json",
        "typography": "public_experience/manifest/design/typography/{key}.v{version}.json",
        "imagery": "public_experience/manifest/design/imagery/{key}.v{version}.json",
        "layout": "public_experience/manifest/design/layouts/{key}.v{version}.json",
        "surface": "public_experience/manifest/design/surfaces/{key}.v{version}.json",
    }[kind]
    return _read(path_template.format(key=reference.key, version=reference.version))


def _validate_palette(palette: Mapping[str, object]) -> dict[str, dict[str, str]]:
    if palette.get("kind") != "palette":
        raise DesignManifestError("palette primitive has the wrong kind")
    semantic = palette.get("semantic")
    if not isinstance(semantic, dict) or set(semantic) != {"light", "dark"}:
        raise DesignManifestError("palette must define exactly light and dark semantic modes")
    normalized: dict[str, dict[str, str]] = {}
    for mode, values in semantic.items():
        if not isinstance(values, dict) or set(values) != _PALETTE_ROLES:
            unknown = sorted(set(values or {}) - _PALETTE_ROLES) if isinstance(values, dict) else []
            raise DesignManifestError(
                f"palette {mode} roles are not closed",
                details={"unknown": unknown, "missing": sorted(_PALETTE_ROLES - set(values or {}))},
            )
        normalized[mode] = {}
        for role, value in values.items():
            if not is_valid_hex(value):
                raise DesignManifestError(f"palette role {mode}.{role} is not a safe hex color")
            normalized[mode][role] = normalize_hex(value)
        for foreground, background, minimum in (
            ("text", "canvas", 4.5),
            ("textMuted", "canvas", 4.5),
            ("onPrimary", "primary", 4.5),
            ("link", "canvas", 4.5),
            ("focus", "canvas", 3.0),
            ("available", "canvas", 3.0),
            ("selected", "canvas", 3.0),
            ("today", "canvas", 3.0),
            ("limitedCapacity", "canvas", 3.0),
            ("waitlist", "canvas", 3.0),
            ("unavailable", "canvas", 3.0),
            ("danger", "canvas", 3.0),
            ("error", "canvas", 3.0),
            ("success", "canvas", 3.0),
            ("notice", "canvas", 3.0),
            ("authentication", "canvas", 3.0),
        ):
            ratio = contrast_ratio(normalized[mode][foreground], normalized[mode][background])
            if ratio < minimum:
                raise DesignManifestError(
                    f"palette {mode}.{foreground} fails contrast",
                    details={"ratio": round(ratio, 2), "minimum": minimum},
                )
        for left, right in (("selected", "available"), ("selected", "unavailable"), ("today", "available")):
            if color_distance(normalized[mode][left], normalized[mode][right]) < 0.08:
                raise DesignManifestError(f"palette {mode}.{left} is not distinct from {right}")
    return normalized


def _validate_typography(typography: Mapping[str, object], locales: Sequence[str]) -> dict[str, object]:
    if typography.get("kind") != "typography":
        raise DesignManifestError("typography primitive has the wrong kind")
    scripts = typography.get("supportedScripts")
    roles = typography.get("roles")
    assets = typography.get("fontAssets")
    if not isinstance(scripts, list) or not isinstance(roles, dict) or not isinstance(assets, list):
        raise DesignManifestError("typography requires scripts, roles and font assets")
    if "en" in locales and "latin" not in scripts:
        raise DesignManifestError("English requires Latin font coverage")
    if "am" in locales and "ethiopic" not in scripts:
        raise DesignManifestError("Amharic requires Ethiopic font coverage")
    if set(roles) != {"display", "body", "ui", "numeric"}:
        raise DesignManifestError("typography must define display, body, ui and numeric roles")
    asset_keys = set()
    for asset in assets:
        if not isinstance(asset, dict):
            raise DesignManifestError("font asset entries must be objects")
        if set(asset) != {"key", "family", "src", "weight", "format", "scripts", "license"}:
            raise DesignManifestError("font asset schema is closed")
        key = asset.get("key")
        src = asset.get("src")
        if not isinstance(key, str) or key in asset_keys:
            raise DesignManifestError("font asset keys must be unique strings")
        if not isinstance(src, str) or not src.startswith("/assets/") or "://" in src or ".." in src:
            raise DesignManifestError("font assets must be local application assets")
        if not asset.get("license"):
            raise DesignManifestError(f"font asset {key} requires license provenance")
        asset_keys.add(key)
    for role, definition in roles.items():
        if not isinstance(definition, dict) or definition.get("assetKey") not in asset_keys:
            raise DesignManifestError(f"typography role {role} points to an unknown font asset")
    return dict(typography)


def _validate_imagery(imagery: Mapping[str, object]) -> dict[str, dict[str, object]]:
    if imagery.get("kind") != "imagery" or not isinstance(imagery.get("assets"), dict):
        raise DesignManifestError("imagery primitive requires an asset map")
    result: dict[str, dict[str, object]] = {}
    for role, asset in imagery["assets"].items():
        if not isinstance(role, str) or not isinstance(asset, dict):
            raise DesignManifestError("imagery roles must map to objects")
        required = {"src", "mobileSrc", "alt", "focalPoint", "fit", "width", "height", "mime", "checksum", "provenance"}
        if set(asset) != required:
            raise DesignManifestError(f"imagery role {role} schema is closed")
        for key in ("src", "mobileSrc"):
            value = asset[key]
            if not isinstance(value, str) or not value.startswith("/assets/") or "://" in value or ".." in value:
                raise DesignManifestError(f"imagery {role}.{key} must be a local application asset")
        if not isinstance(asset["alt"], str) or not asset["alt"].strip():
            raise DesignManifestError(f"imagery {role} requires alt text")
        if asset["mime"] not in {"image/jpeg", "image/png", "image/webp"}:
            raise DesignManifestError(f"imagery {role} has an unsafe MIME type")
        if (
            isinstance(asset["width"], bool)
            or not isinstance(asset["width"], int)
            or isinstance(asset["height"], bool)
            or not isinstance(asset["height"], int)
            or asset["width"] < 320
            or asset["height"] < 240
        ):
            raise DesignManifestError(f"imagery {role} dimensions are invalid")
        focal = asset["focalPoint"]
        if not isinstance(focal, dict) or set(focal) != {"x", "y"} or any(
            not isinstance(value, (int, float)) or not 0 <= value <= 1 for value in focal.values()
        ):
            raise DesignManifestError(f"imagery {role} focal point is invalid")
        if asset["fit"] not in {"cover", "contain"} or not isinstance(asset["provenance"], dict):
            raise DesignManifestError(f"imagery {role} fit/provenance is invalid")
        result[role] = dict(asset)
    return result


def _validate_layout(layout: Mapping[str, object], recipe) -> dict[str, object]:
    if layout.get("kind") != "layout":
        raise DesignManifestError("layout primitive has the wrong kind")
    required = {"kind", "contract", "key", "version", "rendererKey", "contentSchemaVersion", "sections", "requiredSections", "responsive", "density"}
    if set(layout) != required:
        raise DesignManifestError("layout schema is closed")
    if layout.get("key") != recipe.primitives["layout"].key or layout.get("version") != recipe.primitives["layout"].version:
        raise DesignManifestError("layout reference does not match recipe")
    if tuple(layout["requiredSections"]) != recipe.required_sections:
        raise DesignManifestError("recipe/layout required section contracts differ")
    if not set(recipe.supported_sections).issubset(set(layout["sections"])):
        raise DesignManifestError("layout does not support every recipe section")
    if layout.get("rendererKey") != recipe.key:
        raise DesignManifestError("layout renderer must match the recipe key")
    return dict(layout)


def _validate_surface(surface: Mapping[str, object]) -> dict[str, object]:
    if surface.get("kind") != "surface":
        raise DesignManifestError("surface primitive has the wrong kind")
    for key in ("shape", "elevation", "motion", "iconStyle"):
        if key not in surface:
            raise DesignManifestError(f"surface is missing {key}")
    if not isinstance(surface["shape"], dict) or not isinstance(surface["elevation"], dict) or not isinstance(surface["motion"], dict):
        raise DesignManifestError("surface groups must be objects")
    if surface["motion"].get("reduced") != "none":
        raise DesignManifestError("surface must provide a reduced-motion mode")
    return dict(surface)


def _inputs(recipe, brand_inputs: Mapping[str, object] | None) -> dict[str, object]:
    raw = dict(brand_inputs or {})
    aliases = {
        "presentationDensity": "presentation_density",
        "heroAsset": "hero_asset",
        "detailAsset": "detail_asset",
        "accentColor": "accent_color",
        "applicationName": "application_name",
        "shortName": "short_name",
        "logoPrimary": "logo_primary",
        "logoCompact": "logo_compact",
    }
    raw = {aliases.get(key, key): value for key, value in raw.items()}
    unknown = sorted(set(raw) - _ALLOWED_INPUTS)
    if unknown:
        raise _error("brand inputs contain unknown adjustments", field="brand_inputs", observed=unknown)
    result = dict(recipe.default_inputs)
    for source, target in aliases.items():
        if source in result and target not in result:
            result[target] = result.pop(source)
    result.update(raw)
    if result.get("accent_color") is not None:
        value = result["accent_color"]
        if not is_valid_hex(value):
            raise _error("accent_color must be a six-digit hex color", field="accent_color", observed=value)
        result["accent_color"] = normalize_hex(value)
    result["motion"] = result.get("motion", "calm")
    if result["motion"] not in {"calm", "standard"}:
        raise _error("motion is not a recipe-approved adjustment", field="motion", observed=result["motion"])
    result["presentation_density"] = result.get("presentation_density", "comfortable")
    if result["presentation_density"] not in {"comfortable", "spacious"}:
        raise _error(
            "presentation_density is not a recipe-approved adjustment",
            field="presentation_density",
            observed=result["presentation_density"],
        )
    for field in ("application_name", "short_name"):
        if result.get(field) is not None:
            result[field] = _safe_text(result[field], field)
    for field in ("logo_primary", "logo_compact", "favicon"):
        value = result.get(field)
        if value is not None and (not isinstance(value, str) or not value.startswith(("/assets/appointment/", "/files/")) or ".." in value or any(character in value for character in "\\?#<>\"'") or any(ord(character) <= 32 for character in value)):
            raise _error(f"{field} must be a validated local image asset", field=field, observed=value)
    for field, adjustment in (("hero_asset", "heroAsset"), ("detail_asset", "detailAsset")):
        allowed = set(recipe.adjustments.get(adjustment, {}).get("choices") or [])
        if not allowed or result.get(field) not in allowed:
            raise _error(f"{field} is not a recipe-approved asset role", field=field, observed=result.get(field))
    return result


def _capabilities(recipe, capabilities: Mapping[str, object] | None) -> tuple[dict[str, object], tuple[str, ...], tuple[str, ...], str]:
    raw = dict(capabilities or {})
    unknown = sorted(set(raw) - _ALLOWED_CAPABILITIES)
    if unknown:
        raise _error("content capabilities contain unknown keys", field="content_capabilities", observed=unknown)
    sections = raw.get("sections", recipe.required_sections)
    locales = raw.get("locales", recipe.supported_locales)
    richness = raw.get("content_richness", recipe.content_richness.get("default", "rich"))
    if not isinstance(sections, (list, tuple, set)) or any(not isinstance(value, str) for value in sections):
        raise _error("sections must be a list of registered section identifiers", field="sections")
    if not isinstance(locales, (list, tuple, set)) or any(not isinstance(value, str) for value in locales):
        raise _error("locales must be a list of locale identifiers", field="locales")
    unsupported_sections = sorted(set(sections) - set(recipe.supported_sections))
    missing = sorted(set(recipe.required_sections) - set(sections))
    unsupported_locales = sorted(set(locales) - set(recipe.supported_locales))
    if unsupported_sections:
        raise _error("content uses sections outside the selected recipe", field="sections", observed=unsupported_sections)
    if missing:
        raise _error("content does not satisfy the selected recipe", field="sections", observed=missing)
    if unsupported_locales:
        raise _error("content requests an unsupported locale", field="locales", observed=unsupported_locales)
    richness_choices = recipe.content_richness.get("choices", [])
    if richness not in richness_choices:
        raise _error("content richness is not recipe-approved", field="content_richness", observed=richness)
    return raw, tuple(sorted(set(sections))), tuple(sorted(set(locales))), str(richness)


def _derive_tokens(palette: dict[str, dict[str, str]], accent: object) -> dict[str, dict[str, str]]:
    result = {mode: dict(values) for mode, values in palette.items()}
    if accent is None:
        return result
    accent_value = str(accent)
    for mode, values in result.items():
        candidate_on_primary = "#2b1d18" if mode == "dark" else "#fffaf3"
        if contrast_ratio(candidate_on_primary, accent_value) < 4.5:
            candidate_on_primary = "#fffaf3" if candidate_on_primary == "#2b1d18" else "#2b1d18"
        if contrast_ratio(candidate_on_primary, accent_value) < 4.5:
            raise _error("accent_color cannot produce an accessible primary action", field="accent_color", observed=accent)
        if contrast_ratio(accent_value, values["canvas"]) < 3.0:
            raise _error("accent_color cannot produce an accessible accent", field="accent_color", observed=accent)
        values["primary"] = accent_value
        values["onPrimary"] = candidate_on_primary
        values["accent"] = accent_value
        values["link"] = accent_value
    return result


def compile_design(
    recipe_key: str = "tena-clinic",
    recipe_version: int | None = None,
    brand_inputs: Mapping[str, object] | None = None,
    content_capabilities: Mapping[str, object] | None = None,
    locale_set: Sequence[str] | None = None,
) -> CompiledDesign:
    """Compile one exact recipe and return a deterministic renderer contract."""

    recipe = get_recipe(recipe_key, recipe_version)
    input_values = _inputs(recipe, brand_inputs)
    capabilities = dict(content_capabilities or {})
    if locale_set is not None:
        capabilities["locales"] = list(locale_set)
    capability_document, sections, locales, richness = _capabilities(recipe, capabilities)

    palette = _validate_palette(_load_primitive(recipe, "palette"))
    tokens = _derive_tokens(palette, input_values.get("accent_color"))
    typography = _validate_typography(_load_primitive(recipe, "typography"), locales)
    imagery = _validate_imagery(_load_primitive(recipe, "imagery"))
    layout = _validate_layout(_load_primitive(recipe, "layout"), recipe)
    surface = _validate_surface(_load_primitive(recipe, "surface"))

    for role in (input_values["hero_asset"], input_values["detail_asset"]):
        if role not in imagery:
            raise _error("selected asset role is not present in the imagery collection", field="asset_role", observed=role)
    selected_imagery = dict(imagery)
    selected_imagery["hero.primary"] = dict(imagery[input_values["hero_asset"]])
    selected_imagery["section.detail"] = dict(imagery[input_values["detail_asset"]])

    density = {
        "content": richness,
        "presentation": input_values["presentation_density"],
        "spacing": "editorial",
        "controlHeight": "comfortable",
        "cardRhythm": "relaxed" if input_values["presentation_density"] == "spacious" else "steady",
        "typeLeading": "open",
    }
    actions = tuple(recipe.action_intents)
    if not set(actions).issubset(_ACTION_INTENTS):
        raise DesignManifestError("recipe declares an unknown action intent")
    identity = {
        "applicationName": input_values.get("application_name") or "Appointment",
        "shortName": input_values.get("short_name") or "Appointment",
        "logoPrimary": input_values.get("logo_primary"),
        "logoCompact": input_values.get("logo_compact") or input_values.get("logo_primary"),
        "favicon": input_values.get("favicon"),
    }
    artifact = {
        "contract": COMPILED_DESIGN_CONTRACT,
        "compilerPolicyVersion": COMPILER_POLICY_VERSION,
        "recipeKey": recipe.key,
        "recipeVersion": recipe.version,
        "recipeHash": recipe.content_hash,
        "primitiveManifest": {key: value.as_dict() for key, value in recipe.primitives.items()},
        "tokens": tokens,
        "typography": {
            "supportedScripts": list(typography["supportedScripts"]),
            "weights": list(typography["weights"]),
            "roles": dict(typography["roles"]),
            "fontAssets": list(typography["fontAssets"]),
            "fallbacks": dict(typography["fallbacks"]),
        },
        "layout": {
            "rendererKey": layout["rendererKey"],
            "rendererVersion": layout["version"],
            "contentSchemaVersion": layout["contentSchemaVersion"],
            "sections": list(layout["sections"]),
            "requiredSections": list(layout["requiredSections"]),
            "responsive": dict(layout["responsive"]),
        },
        "surface": {
            "shape": dict(surface["shape"]),
            "elevation": dict(surface["elevation"]),
            "motion": dict(surface["motion"]),
            "iconStyle": surface["iconStyle"],
        },
        "density": density,
        "motion": input_values["motion"],
        "assets": {
            role: {
                "src": asset["src"],
                "mobileSrc": asset["mobileSrc"],
                "alt": asset["alt"],
                "focalPoint": dict(asset["focalPoint"]),
                "fit": asset["fit"],
                "width": asset["width"],
                "height": asset["height"],
                "mime": asset["mime"],
                "checksum": asset["checksum"],
                "provenance": dict(asset["provenance"]),
            }
            for role, asset in selected_imagery.items()
        },
        "actionIntents": list(actions),
        "contentCapabilities": {
            "sections": list(sections),
            "richness": richness,
        },
        "localeCapabilities": {
            "supported": list(locales),
            "scripts": list(typography["supportedScripts"]),
        },
        "identity": identity,
        "validation": {
            "ok": True,
            "issues": [],
            "protectedStateRoles": [
                "available",
                "selected",
                "today",
                "limitedCapacity",
                "waitlist",
                "unavailable",
                "focus",
                "danger",
                "error",
                "success",
                "disabled",
            ],
        },
    }
    canonical = canonicalize(artifact)
    return CompiledDesign(
        contract=COMPILED_DESIGN_CONTRACT,
        compiler_policy_version=COMPILER_POLICY_VERSION,
        recipe_key=recipe.key,
        recipe_version=recipe.version,
        recipe_hash=recipe.content_hash,
        primitive_manifest=artifact["primitiveManifest"],
        tokens=artifact["tokens"],
        typography=artifact["typography"],
        layout=artifact["layout"],
        surface=artifact["surface"],
        density=artifact["density"],
        motion=artifact["motion"],
        assets=artifact["assets"],
        action_intents=actions,
        content_capabilities={
            "sections": list(sections),
            "richness": richness,
        },
        locale_capabilities=artifact["localeCapabilities"],
        identity=artifact["identity"],
        validation=artifact["validation"],
        canonical=canonical,
        content_hash=hash_document(artifact),
    )
