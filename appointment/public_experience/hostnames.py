"""Pure hostname normalization and validation for public site domains.

Only normalized ASCII hostnames are stored. Ports, schemes, paths, wildcards,
addresses and localhost are rejected before any routing decision is made.
"""

from __future__ import annotations

import ipaddress
import re

_LABEL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
_MAX_HOSTNAME_LENGTH = 253


def normalize_hostname(value: object) -> str:
    """Lowercase, strip a trailing dot and IDNA-encode to ASCII."""

    if not isinstance(value, str):
        raise ValueError("hostname must be text")
    host = value.strip().lower()
    if not host:
        raise ValueError("hostname is empty")
    if "://" in host or "/" in host or ":" in host or "@" in host:
        raise ValueError("hostname must be a bare host without scheme, port or path")
    if host.startswith("*.") or "*" in host:
        raise ValueError("wildcard hostnames are not allowed")
    host = host.rstrip(".")
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError as exc:  # pragma: no cover - depends on input
        raise ValueError("hostname is not a valid internationalized name") from exc
    return host


def hostname_error(value: object) -> str | None:
    """Return a human-readable reason the hostname is unusable, or ``None``."""

    try:
        host = normalize_hostname(value)
    except ValueError as exc:
        return str(exc)
    if len(host) > _MAX_HOSTNAME_LENGTH:
        return f"Hostnames must be at most {_MAX_HOSTNAME_LENGTH} characters."
    if "." not in host:
        return "A custom domain needs at least two labels."
    if host == "localhost" or host.endswith(".localhost"):
        return "The platform hostname is reserved."
    try:
        ipaddress.ip_address(host)
        return "IP addresses cannot be used as a public domain."
    except ValueError:
        pass
    for label in host.split("."):
        if not _LABEL_RE.match(label):
            return "Each hostname label must use letters, numbers and hyphens."
    return None
