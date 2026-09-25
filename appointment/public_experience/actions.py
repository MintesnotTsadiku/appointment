"""Typed, intent-based CTA contracts for curated public experiences.

Authoring stores intent, localized label and placement only. The publisher resolves
those intents to safe, site-scoped targets; editors never supply arbitrary hrefs.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from urllib.parse import quote

from appointment.public_experience.errors import UnsafeActionIntentError
from appointment.public_experience.validation import ValidationIssue

ACTION_INTENTS = (
    "booking_start",
    "service_selection",
    "provider_selection",
    "call",
    "directions",
    "contact",
    "faq_jump",
    "back_to_site",
)
ACTION_PLACEMENTS = ("primary", "secondary", "inline", "tertiary")
_ACTION_KEYS = frozenset({"intent", "label", "placement"})
_PHONE_RE = re.compile(r"^[+0-9().\-\s]{6,32}$")


def _localized_label(value: object) -> list[ValidationIssue]:
    if not isinstance(value, dict):
        return [
            ValidationIssue(
                "label",
                "localized_object",
                value,
                "an object with an English label",
                "Provide the label in the enabled locales.",
            )
        ]
    issues: list[ValidationIssue] = []
    for locale, text in value.items():
        if locale not in {"en", "am"}:
            issues.append(
                ValidationIssue(
                    f"label.{locale}",
                    "unknown_locale",
                    locale,
                    "en or am",
                    "Remove the unsupported locale.",
                )
            )
        elif not isinstance(text, str) or not text.strip() or len(text) > 120 or any(
            character in text for character in "<>\x00\x01\x02\x03"
        ):
            issues.append(
                ValidationIssue(
                    f"label.{locale}",
                    "safe_text",
                    text,
                    "short plain text",
                    "Remove markup and keep the label short.",
                )
            )
    if not str(value.get("en") or "").strip():
        issues.append(
            ValidationIssue(
                "label.en",
                "required",
                value.get("en"),
                "an English label",
                "Provide an English label.",
            )
        )
    return issues


def validate_action(
    value: object,
    *,
    allowed_intents: Iterable[str] = ACTION_INTENTS,
    field: str = "action",
) -> list[ValidationIssue]:
    if not isinstance(value, dict):
        return [
            ValidationIssue(
                field,
                "object",
                value,
                "an intent, localized label and placement",
                "Choose a certified action.",
            )
        ]
    issues: list[ValidationIssue] = []
    unknown = sorted(set(value) - _ACTION_KEYS)
    for key in unknown:
        issues.append(
            ValidationIssue(
                f"{field}.{key}",
                "unknown_key",
                key,
                "intent, label or placement",
                "Remove the unsupported action field.",
            )
        )
    intent = value.get("intent")
    accepted = set(allowed_intents)
    if intent not in accepted:
        issues.append(
            ValidationIssue(
                f"{field}.intent",
                "allowed_choice",
                intent,
                "one of " + ", ".join(sorted(accepted)),
                "Choose an action offered by the selected recipe.",
            )
        )
    issues.extend(
        ValidationIssue(
            f"{field}.{issue.field}",
            issue.rule,
            issue.observed,
            issue.requirement,
            issue.remediation,
        )
        for issue in _localized_label(value.get("label"))
    )
    placement = value.get("placement")
    if placement not in ACTION_PLACEMENTS:
        issues.append(
            ValidationIssue(
                f"{field}.placement",
                "allowed_choice",
                placement,
                "one of " + ", ".join(ACTION_PLACEMENTS),
                "Choose a supported action placement.",
            )
        )
    return issues


def validate_actions(
    values: object,
    *,
    allowed_intents: Iterable[str] = ACTION_INTENTS,
    field: str = "actions",
) -> list[ValidationIssue]:
    if not isinstance(values, list):
        return [
            ValidationIssue(
                field,
                "array",
                values,
                "an array of typed actions",
                "Provide actions as a list.",
            )
        ]
    issues: list[ValidationIssue] = []
    for index, value in enumerate(values):
        issues.extend(validate_action(value, allowed_intents=allowed_intents, field=f"{field}[{index}]"))
    return issues


def _safe_public_path(public_path: str) -> str:
    if not isinstance(public_path, str) or not public_path.startswith("/") or "://" in public_path:
        raise UnsafeActionIntentError("public action resolution requires a site-relative path")
    return "/" + public_path.strip("/")


def resolve_action_target(
    action: Mapping[str, object],
    *,
    public_path: str,
    phone: str | None = None,
    location_query: str | None = None,
) -> str:
    """Resolve one validated intent to a deterministic safe target."""

    intent = action.get("intent")
    if intent not in ACTION_INTENTS:
        raise UnsafeActionIntentError("cannot resolve an unknown action intent", details={"intent": intent})
    base = _safe_public_path(public_path)
    if intent in {"booking_start", "service_selection", "provider_selection"}:
        return f"{base}/book"
    if intent == "back_to_site":
        return base
    if intent == "call":
        if not isinstance(phone, str) or _PHONE_RE.fullmatch(phone.strip()) is None:
            raise UnsafeActionIntentError("call action requires a verified public phone number")
        return "tel:" + re.sub(r"[^\d+]", "", phone)
    if intent == "directions":
        if not isinstance(location_query, str) or not location_query.strip():
            raise UnsafeActionIntentError("directions action requires a verified location")
        return f"https://www.google.com/maps/search/?api=1&query={quote(location_query.strip())}"
    if intent == "faq_jump":
        return f"{base}#faq"
    if intent == "contact":
        return f"{base}#contact"
    raise UnsafeActionIntentError("action intent is not implemented", details={"intent": intent})


def project_action(
    action: Mapping[str, object],
    *,
    public_path: str,
    phone: str | None = None,
    location_query: str | None = None,
) -> dict[str, object]:
    """Return the release-only action projection with a server-resolved href."""

    target = resolve_action_target(
        action,
        public_path=public_path,
        phone=phone,
        location_query=location_query,
    )
    return {
        "intent": action["intent"],
        "label": dict(action["label"]),
        "placement": action["placement"],
        "href": target,
    }
