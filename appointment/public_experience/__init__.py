"""Brand and Public Experience package.

The public product has one renderer authority: a certified Brand Recipe is
compiled into a CompiledDesign, pinned in a Brand Revision, and projected by an
immutable Experience Release.
"""

from appointment.public_experience.actions import ACTION_INTENTS, project_action, resolve_action_target, validate_action
from appointment.public_experience.canonical import canonicalize, hash_document
from appointment.public_experience.design_compiler import CompiledDesign, compile_design
from appointment.public_experience.errors import (
    BrandCompilationError,
    BrandExperienceError,
    DesignCompilationError,
    DesignManifestError,
    ExperiencePublishError,
    PublicResolutionError,
    StaleDraftError,
    UnsafeActionIntentError,
    UnknownRecipeError,
)
from appointment.public_experience.interfaces import (
    compile_brand,
    preview_experience,
    publish_brand,
    publish_experience,
    resolve_public_experience,
    rollback_brand,
    rollback_experience,
)
from appointment.public_experience.recipes import (
    COMPILED_DESIGN_CONTRACT,
    COMPILER_POLICY_VERSION,
    RECIPE_CONTRACT,
    get_recipe,
    list_recipes,
)
from appointment.public_experience.section_schemas import CONTENT_SCHEMA_VERSION, validate_typed_section
from appointment.public_experience.validation import ValidationIssue, ValidationReport

__all__ = [
    "ACTION_INTENTS",
    "BrandCompilationError",
    "BrandExperienceError",
    "CompiledDesign",
    "COMPILED_DESIGN_CONTRACT",
    "COMPILER_POLICY_VERSION",
    "CONTENT_SCHEMA_VERSION",
    "DesignCompilationError",
    "DesignManifestError",
    "ExperiencePublishError",
    "PublicResolutionError",
    "RECIPE_CONTRACT",
    "StaleDraftError",
    "UnsafeActionIntentError",
    "UnknownRecipeError",
    "ValidationIssue",
    "ValidationReport",
    "canonicalize",
    "compile_brand",
    "compile_design",
    "get_recipe",
    "hash_document",
    "list_recipes",
    "preview_experience",
    "project_action",
    "publish_brand",
    "publish_experience",
    "resolve_action_target",
    "resolve_public_experience",
    "rollback_brand",
    "rollback_experience",
    "validate_action",
    "validate_typed_section",
]
