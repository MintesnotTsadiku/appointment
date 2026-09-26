"""Reserved platform slugs and root paths.

A Public Site slug occupies the platform root, so it must never collide with an
application, API, asset, file, or framework route. The list is maintained here
and tested centrally rather than duplicated in validators.
"""

from __future__ import annotations

import re

#: Infrastructure and application paths that may never become a site slug.
RESERVED_ROOT_PATHS = frozenset(
    {
        "api",
        "app",
        "apps",
        "assets",
        "files",
        "private",
        "login",
        "logout",
        "signup",
        "desk",
        "home",
        "calendar",
        "analytics",
        "settings",
        "admin",
        "reception",
        "schedule",
        "preview",
        "tasks",
        "assistants",
        "workspaces",
        "onboarding",
        "no-access",
        "book",
        "blog",
        "blog-category",
        "newsletter",
        "team",
        "rss",
        "rss.xml",
        ".well-known",
        "robots.txt",
        "sitemap.xml",
        "favicon.ico",
    }
)

#: Root paths plus common infrastructure names that must stay platform-owned.
RESERVED_SLUGS = RESERVED_ROOT_PATHS | frozenset(
    {
        "www",
        "mail",
        "smtp",
        "static",
        "public",
        "health",
        "status",
        "root",
        "system",
        "appointment",
    }
)

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_MAX_SLUG_LENGTH = 60


def normalize_slug(value: object) -> str:
    """Normalize free text into a candidate slug (no validation of length/reserved)."""

    if not isinstance(value, str):
        return ""
    lowered = value.strip().lower()
    lowered = re.sub(r"[\s_.]+", "-", lowered)
    lowered = re.sub(r"[^a-z0-9-]+", "", lowered)
    lowered = re.sub(r"-{2,}", "-", lowered)
    return lowered.strip("-")


def slug_error(value: object) -> str | None:
    """Return a human-readable reason the slug is unusable, or ``None``."""

    if not isinstance(value, str) or not value:
        return "A site address is required."
    if value != normalize_slug(value):
        return "Use lowercase letters, numbers and single hyphens only."
    if len(value) > _MAX_SLUG_LENGTH:
        return f"Site addresses must be at most {_MAX_SLUG_LENGTH} characters."
    if not _SLUG_RE.match(value):
        return "Use lowercase letters, numbers and single hyphens only."
    if value in RESERVED_SLUGS:
        return "That site address is reserved by the platform."
    return None


def is_reserved_slug(value: object) -> bool:
    return isinstance(value, str) and value in RESERVED_SLUGS
