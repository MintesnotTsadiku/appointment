"""Deterministic canonicalization and hashing of brand artifacts.

The canonical form is sorted-key, whitespace-free, ASCII JSON. It is byte for
byte reproducible in Python and JavaScript so the packaged default hash is
identical on the backend and in the generated frontend fallback. Only strings
and integers appear in the hashed document, which keeps both JSON encoders in
agreement.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonicalize(document: Any) -> str:
    """Return the canonical JSON string for ``document``."""

    return json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def hash_document(document: Any) -> str:
    """Return the SHA-256 hex digest of the canonical JSON of ``document``."""

    return hashlib.sha256(canonicalize(document).encode("utf-8")).hexdigest()
