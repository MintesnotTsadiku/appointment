"""Privacy-conscious counters for the public experience.

Only aggregate counts with non-identifying labels are recorded - never tokens,
cookies, drafts, customer data or private URLs. Cache failures never affect the
request.
"""

from __future__ import annotations

import frappe

_PREFIX = "public_experience:metrics:"
_TTL_SECONDS = 86400


def _key(metric: str, labels: dict) -> str:
    key = _PREFIX + str(metric)
    parts = [f"{name}={value}" for name, value in sorted(labels.items()) if value is not None]
    if parts:
        key += ":" + ".".join(parts)
    return key


def record(metric: str, value: float = 1, **labels) -> None:
    key = _key(metric, labels)
    try:
        current = float(frappe.cache.get_value(key) or 0)
        frappe.cache.set_value(key, current + float(value), expires_in_sec=_TTL_SECONDS)
    except Exception:
        pass


def snapshot(metrics: list[str]) -> dict:
    """Read the current totals for the named metrics."""

    out: dict[str, dict] = {}
    for metric in metrics:
        try:
            value = frappe.cache.get_value(_PREFIX + metric)
        except Exception:
            value = None
        out[metric] = {"total": float(value or 0)}
    return out
