"""Pure, code-owned registry for curated Brand Recipes v1.

The registry deliberately keeps palettes, typography, imagery, layout and surface
definitions separate. Recipes pin compatible defaults. The versioned appearance catalog allows
approved palette and typography alternatives through the compiler.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from importlib.resources import files

from appointment.public_experience.canonical import canonicalize, hash_document
from appointment.public_experience.errors import DesignManifestError, UnknownRecipeError

RECIPE_CONTRACT = "appointment-curated-recipe.v1"
COMPILED_DESIGN_CONTRACT = "appointment-compiled-design.v1"
COMPILER_POLICY_VERSION = "curated-brand-policy.v1"
# Every published version stays loadable: releases pin a version and fingerprint
# its primitives. New sites and the design gallery get the latest version.
RECIPE_MANIFESTS = {
    "selam-movement": {
        1: "public_experience/manifest/design/recipes/selam-movement.v1.json",
        2: "public_experience/manifest/design/recipes/selam-movement.v2.json",
        3: "public_experience/manifest/design/recipes/selam-movement.v3.json",
    },
    "bloom-hair": {
        1: "public_experience/manifest/design/recipes/bloom-hair.v1.json",
        2: "public_experience/manifest/design/recipes/bloom-hair.v2.json",
        3: "public_experience/manifest/design/recipes/bloom-hair.v3.json",
    },
    "meron-atelier": {
        1: "public_experience/manifest/design/recipes/meron-atelier.v1.json",
        2: "public_experience/manifest/design/recipes/meron-atelier.v2.json",
        3: "public_experience/manifest/design/recipes/meron-atelier.v3.json",
    },
    "abugida-language": {
        1: "public_experience/manifest/design/recipes/abugida-language.v1.json",
        2: "public_experience/manifest/design/recipes/abugida-language.v2.json",
        3: "public_experience/manifest/design/recipes/abugida-language.v3.json",
    },
    "tena-clinic": {
        1: "public_experience/manifest/design/recipes/tena-clinic.v1.json",
        2: "public_experience/manifest/design/recipes/tena-clinic.v2.json",
        3: "public_experience/manifest/design/recipes/tena-clinic.v3.json",
    },
    "ergata-therapy": {
        1: "public_experience/manifest/design/recipes/ergata-therapy.v1.json",
        2: "public_experience/manifest/design/recipes/ergata-therapy.v2.json",
    },
}
# Retired versions: no longer offered to new sites or chosen in a template switch, but kept in
# RECIPE_MANIFESTS (and in the frontend registry) so a release that pins one still renders.
# Owners upgrade by switching to the latest version and publishing again (go-live check
# "public_sites.template_versions"). Delete a retired version only when no release pins it.
RETIRED_VERSIONS = {
    "selam-movement": frozenset({1}),
    "bloom-hair": frozenset({1}),
    "meron-atelier": frozenset({1}),
    "abugida-language": frozenset({1}),
    "tena-clinic": frozenset({1}),
    "ergata-therapy": frozenset({1}),
}
PRIMITIVE_MANIFESTS = {
    "palette": "public_experience/manifest/design/palettes/{key}.v{version}.json",
    "typography": "public_experience/manifest/design/typography/{key}.v{version}.json",
    "imagery": "public_experience/manifest/design/imagery/{key}.v{version}.json",
    "layout": "public_experience/manifest/design/layouts/{key}.v{version}.json",
    "surface": "public_experience/manifest/design/surfaces/{key}.v{version}.json",
}

_RECIPE_KEYS = frozenset(
    {
        "kind",
        "contract",
        "key",
        "version",
        "label",
        "description",
        "audience",
        "mood",
        "supportedLocales",
        "accessibility",
        "primitives",
        "supportedSections",
        "requiredSections",
        "defaultInputs",
        "adjustments",
        "actionIntents",
        "contentRichness",
        "expression",
    }
)

# How a template meets the expressive qualities of the quality bar (docs/design/TEMPLATE_REIMAGINATION.md,
# section 8). The outcome is required; the form is the template's choice, declared in its recipe.
EXPRESSION_CHOICES: Mapping[str, tuple[str, ...]] = {
    "imagery": ("photographic", "illustrative", "typographic", "pattern", "mixed"),
    "motion": ("expressive", "standard", "calm"),
    "darkMode": ("night-photos", "tonal", "graded"),
    "holiday": ("decoration", "greeting"),
    "success": ("animated", "static"),
    "greeting": ("hero", "header", "tone"),
}
# A recipe without `expression` (the v1 and v2 packages, which predate the declaration) gets these
# forms. `motion` is not listed: it defaults to the highest level that the recipe offers.
EXPRESSION_DEFAULTS: Mapping[str, str] = {
    "imagery": "photographic",
    "darkMode": "tonal",
    "holiday": "greeting",
    "success": "static",
    "greeting": "tone",
}
_MOTION_ORDER = ("calm", "standard", "expressive")


@dataclass(frozen=True)
class ManifestRef:
    kind: str
    key: str
    version: int
    content_hash: str

    def as_dict(self) -> dict[str, object]:
        return {"kind": self.kind, "key": self.key, "version": self.version, "hash": self.content_hash}


@dataclass(frozen=True)
class RecipeDefinition:
    key: str
    version: int
    label: str
    description: str
    audience: str
    mood: str
    supported_locales: tuple[str, ...]
    supported_sections: tuple[str, ...]
    required_sections: tuple[str, ...]
    primitives: Mapping[str, ManifestRef]
    default_inputs: Mapping[str, object]
    adjustments: Mapping[str, Mapping[str, object]]
    action_intents: tuple[str, ...]
    content_richness: Mapping[str, object]
    accessibility: Mapping[str, object]
    document: Mapping[str, object]
    content_hash: str
    # The declared expressive forms with the defaults filled in; `expression_declared` is false for
    # a recipe without the `expression` key.
    expression: Mapping[str, str]
    expression_declared: bool

    def as_summary(self) -> dict[str, object]:
        return {
            "key": self.key,
            "version": self.version,
            "label": self.label,
            "description": self.description,
            "audience": self.audience,
            "mood": self.mood,
            "supportedLocales": list(self.supported_locales),
            "supportedSections": list(self.supported_sections),
            "requiredSections": list(self.required_sections),
            "adjustments": {
                key: {
                    name: value
                    for name, value in definition.items()
                    if name in {"type", "choices", "optional"}
                }
                for key, definition in self.adjustments.items()
            },
            "accessibility": dict(self.accessibility),
            "expression": dict(self.expression),
        }


def _read(relative_path: str) -> dict[str, object]:
    try:
        text = files("appointment").joinpath(relative_path).read_text(encoding="utf-8")
    except (FileNotFoundError, ModuleNotFoundError, OSError) as exc:
        raise DesignManifestError(
            f"design manifest is missing: {relative_path}",
            details={"resource": relative_path},
        ) from exc
    try:
        document = json.loads(text)
    except json.JSONDecodeError as exc:
        raise DesignManifestError(
            f"design manifest is not valid JSON: {relative_path}",
            details={"resource": relative_path},
        ) from exc
    if not isinstance(document, dict):
        raise DesignManifestError(f"design manifest must be an object: {relative_path}")
    return document


def _strict(document: Mapping[str, object], allowed: set[str], source: str) -> None:
    unknown = sorted(set(document) - allowed)
    if unknown:
        raise DesignManifestError(
            f"design manifest contains unknown keys: {source}",
            details={"resource": source, "unknown": unknown},
        )


def _required_string(document: Mapping[str, object], key: str, source: str) -> str:
    value = document.get(key)
    if not isinstance(value, str) or not value.strip():
        raise DesignManifestError(f"{source} requires a non-empty string '{key}'")
    return value.strip()


def _required_version(document: Mapping[str, object], source: str) -> int:
    value = document.get("version")
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise DesignManifestError(f"{source} requires a positive integer version")
    return value


def _ref(kind: str, raw: object, recipe_source: str) -> ManifestRef:
    if not isinstance(raw, dict):
        raise DesignManifestError(f"{recipe_source} primitive '{kind}' must be an object")
    _strict(raw, {"key", "version"}, f"{recipe_source}.{kind}")
    key = _required_string(raw, "key", f"{recipe_source}.{kind}")
    version = raw.get("version")
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise DesignManifestError(f"{recipe_source}.{kind} requires a positive integer version")
    path_template = PRIMITIVE_MANIFESTS.get(kind)
    if path_template is None:
        raise DesignManifestError(f"unsupported primitive kind: {kind}")
    path = path_template.format(key=key, version=version)
    primitive = _read(path)
    primitive_key = primitive.get("key")
    primitive_version = primitive.get("version")
    if primitive_key != key or primitive_version != version or primitive.get("kind") != kind:
        raise DesignManifestError(
            f"primitive reference mismatch: {recipe_source}.{kind}",
            details={"resource": path, "expected": {"key": key, "version": version}},
        )
    return ManifestRef(kind, key, version, hash_document(primitive))


def _offered_motion(default_inputs: Mapping[str, object], adjustments: Mapping[str, object]) -> str:
    """The highest motion level a site on this recipe can get."""
    choices = (adjustments.get("motion") or {}).get("choices") or [default_inputs.get("motion", "calm")]
    levels = [_MOTION_ORDER.index(value) for value in choices if value in _MOTION_ORDER]
    return _MOTION_ORDER[max(levels)] if levels else "calm"


def _expression(document: Mapping[str, object], offered_motion: str, source: str) -> dict[str, str]:
    """Validate the optional `expression` declaration and fill in the defaults."""
    raw = document.get("expression")
    if raw is None:
        return {**EXPRESSION_DEFAULTS, "motion": offered_motion}
    if not isinstance(raw, dict):
        raise DesignManifestError(f"{source}.expression must be an object")
    _strict(raw, set(EXPRESSION_CHOICES), f"{source}.expression")
    missing = sorted(set(EXPRESSION_CHOICES) - set(raw))
    if missing:
        raise DesignManifestError(
            f"{source}.expression must declare every quality", details={"resource": source, "missing": missing}
        )
    for quality, choices in EXPRESSION_CHOICES.items():
        if raw[quality] not in choices:
            raise DesignManifestError(
                f"{source}.expression.{quality} must be one of {', '.join(choices)}",
                details={"resource": source, "quality": quality, "observed": raw[quality]},
            )
    if raw["motion"] != offered_motion:
        raise DesignManifestError(
            f"{source}.expression.motion is '{raw['motion']}' but the recipe offers motion up to '{offered_motion}'",
            details={"resource": source, "declared": raw["motion"], "offered": offered_motion},
        )
    return {quality: raw[quality] for quality in EXPRESSION_CHOICES}


def _recipe(document: Mapping[str, object], source: str) -> RecipeDefinition:
    _strict(document, set(_RECIPE_KEYS), source)
    if document.get("kind") != "recipe" or document.get("contract") != RECIPE_CONTRACT:
        raise DesignManifestError(f"unsupported recipe contract: {source}")
    key = _required_string(document, "key", source)
    version = _required_version(document, source)
    locales = document.get("supportedLocales")
    sections = document.get("supportedSections")
    required = document.get("requiredSections")
    if not all(isinstance(value, list) and value for value in (locales, sections, required)):
        raise DesignManifestError(f"{source} requires non-empty locale and section lists")
    if any(not isinstance(value, str) or not value for value in (*locales, *sections, *required)):
        raise DesignManifestError(f"{source} contains an invalid locale or section identifier")
    if not set(required).issubset(set(sections)):
        raise DesignManifestError(f"{source} required sections must be supported sections")
    accessibility = document.get("accessibility")
    if not isinstance(accessibility, dict):
        raise DesignManifestError(f"{source} requires accessibility metadata")
    _strict(accessibility, {"level", "focusVisible", "reducedMotion"}, f"{source}.accessibility")
    if accessibility.get("level") != "AA" or accessibility.get("focusVisible") is not True:
        raise DesignManifestError(f"{source} is not an accepted accessibility-certified recipe")
    primitives = document.get("primitives")
    if not isinstance(primitives, dict) or set(primitives) != set(PRIMITIVE_MANIFESTS):
        raise DesignManifestError(f"{source} must pin every internal primitive kind")
    resolved_primitives = {kind: _ref(kind, value, source) for kind, value in primitives.items()}
    default_inputs = document.get("defaultInputs")
    adjustments = document.get("adjustments")
    action_intents = document.get("actionIntents")
    richness = document.get("contentRichness")
    if not isinstance(default_inputs, dict) or not isinstance(adjustments, dict) or not isinstance(richness, dict):
        raise DesignManifestError(f"{source} requires closed defaults, adjustments and richness metadata")
    if not isinstance(action_intents, list) or not action_intents or any(
        not isinstance(value, str) or not value for value in action_intents
    ):
        raise DesignManifestError(f"{source} requires a typed action-intent allowlist")
    for name, definition in adjustments.items():
        if not isinstance(name, str) or not isinstance(definition, dict):
            raise DesignManifestError(f"{source}.adjustments must contain named objects")
        _strict(definition, {"type", "choices", "optional", "protected"}, f"{source}.adjustments.{name}")
        if definition.get("type") not in {"hex-color", "enum", "asset-role"}:
            raise DesignManifestError(f"{source}.adjustments.{name} has an unsupported type")
        if definition.get("type") in {"enum", "asset-role"}:
            choices = definition.get("choices")
            if not isinstance(choices, list) or not choices:
                raise DesignManifestError(f"{source}.adjustments.{name} requires choices")
    expression = _expression(document, _offered_motion(default_inputs, adjustments), source)
    return RecipeDefinition(
        key=key,
        version=version,
        label=_required_string(document, "label", source),
        description=_required_string(document, "description", source),
        audience=_required_string(document, "audience", source),
        mood=_required_string(document, "mood", source),
        supported_locales=tuple(locales),
        supported_sections=tuple(sections),
        required_sections=tuple(required),
        primitives=resolved_primitives,
        default_inputs=default_inputs,
        adjustments=adjustments,
        action_intents=tuple(action_intents),
        content_richness=richness,
        accessibility=accessibility,
        document=document,
        content_hash=hash_document(document),
        expression=expression,
        expression_declared="expression" in document,
    )


@lru_cache(maxsize=None)
def get_recipe(recipe_key: str, recipe_version: int | None = None) -> RecipeDefinition:
    if not isinstance(recipe_key, str) or not recipe_key.strip():
        raise UnknownRecipeError("a certified recipe key is required")
    key = recipe_key.strip()
    versions = RECIPE_MANIFESTS.get(key)
    if versions is None:
        raise UnknownRecipeError(f"unknown curated recipe: {key}", details={"recipeKey": key})
    version = max(versions) if recipe_version is None else recipe_version
    path = versions.get(version)
    if path is None:
        raise UnknownRecipeError(
            f"recipe {key} has no version {recipe_version}",
            details={"recipeKey": key, "requested": recipe_version, "available": sorted(versions)},
        )
    definition = _recipe(_read(path), path)
    if definition.version != version or definition.key != key:
        raise DesignManifestError(f"recipe manifest {path} does not declare {key} v{version}")
    return definition


def recipe_versions(recipe_key: str) -> tuple[int, ...]:
    return tuple(sorted(RECIPE_MANIFESTS.get(recipe_key, {})))


def latest_version(recipe_key: str) -> int | None:
    versions = recipe_versions(recipe_key)
    return versions[-1] if versions else None


def is_retired(recipe_key: str, recipe_version: int | None) -> bool:
    """A retired version still renders the releases that pin it, but no site may start on it or move to it."""
    return int(recipe_version or 0) in RETIRED_VERSIONS.get(recipe_key, frozenset())


def require_offered(recipe_key: str, recipe_version: int | None, current: tuple[str, int] | None = None) -> None:
    """Refuse a retired version, unless the document is already on it (`current` is its stored key and version)."""
    if not is_retired(recipe_key, recipe_version):
        return
    if current and current[0] == recipe_key and int(current[1] or 0) == int(recipe_version or 0):
        return
    raise UnknownRecipeError(
        f"recipe {recipe_key} version {recipe_version} is retired; choose version {latest_version(recipe_key)}",
        details={"recipeKey": recipe_key, "requested": recipe_version, "offered": latest_version(recipe_key)},
    )


def list_recipes() -> tuple[RecipeDefinition, ...]:
    """The latest version of every certified recipe, as the gallery offers them."""
    return tuple(get_recipe(key) for key in RECIPE_MANIFESTS)


def available_recipes() -> tuple[RecipeDefinition, ...]:
    """Like `list_recipes`, but a recipe whose manifests do not load is left out and logged.

    Owner and visitor screens (the template gallery, the setup chooser) use this, so one
    broken or unfinished recipe never hides the others. Checks that must fail loudly keep
    using `list_recipes`.
    """
    recipes = []
    for key in RECIPE_MANIFESTS:
        if is_retired(key, latest_version(key)):
            continue
        try:
            recipes.append(get_recipe(key))
        except DesignManifestError:
            import frappe

            frappe.log_error(title=f"Recipe {key} is not available", message=frappe.get_traceback())
    return tuple(recipes)


def canonical_recipe_contract(recipe: RecipeDefinition) -> str:
    return canonicalize(
        {
            "contract": RECIPE_CONTRACT,
            "recipe": recipe.document,
            "primitives": {key: value.as_dict() for key, value in recipe.primitives.items()},
        }
    )
