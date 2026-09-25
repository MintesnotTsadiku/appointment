"""Server-owned capability and limit enforcement for a Business.

Payment is deliberately out of scope. An entitlement is a server projection of
access, not a payment receipt. Code-owned defaults keep a business usable when
it has no explicit entitlement row; an explicit row always wins.

The server enforces every capability and limit. Hiding navigation is not access
control. Expired or suspended access stops new restricted writes and sends but
never deletes existing customer content.
"""

from __future__ import annotations

from datetime import datetime

import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime

CAPABILITIES = (
    "public_site",
    "custom_domain",
    "blog",
    "gallery",
    "newsletter",
    "managed_video",
    "advanced_brand_service",
)
CAPABILITY_SET = frozenset(CAPABILITIES)

# States that permit new restricted actions.
ACTIVE_STATES = frozenset({"Active", "Trial", "Grace"})
ALL_STATES = ("Active", "Trial", "Grace", "Suspended", "Expired")
SOURCES = ("Default", "Administrator", "Plan", "Contract", "Payment")

# Code-owned default plan. A capability with no explicit row uses this. Advanced
# and paid capabilities are not granted by default and require a trusted grant.
DEFAULT_PLAN = {
    "public_site": {"state": "Trial", "limits": {}},
    "blog": {"state": "Trial", "limits": {"articles": 25}},
    "gallery": {"state": "Trial", "limits": {"collections": 10, "items": 200, "storage_mb": 512}},
    "newsletter": {"state": "Trial", "limits": {"audience": 2000, "monthly_sends": 4}},
    "custom_domain": {"state": "Suspended", "limits": {}},
    "managed_video": {"state": "Suspended", "limits": {"videos": 0}},
    "advanced_brand_service": {"state": "Suspended", "limits": {}},
}


def _now() -> datetime:
    return now_datetime()


def normalize_capability(capability: object) -> str:
    value = str(capability or "").strip()
    if value not in CAPABILITY_SET:
        frappe.throw(_("Unknown capability: {0}.").format(value or "(empty)"), frappe.ValidationError)
    return value


def _window_active(effective_from, effective_to, now: datetime) -> bool:
    start = get_datetime(effective_from) if effective_from else None
    end = get_datetime(effective_to) if effective_to else None
    if start and now < start:
        return False
    if end and now > end:
        return False
    return True


def _limits(raw) -> dict:
    if isinstance(raw, dict):
        return dict(raw)
    if not raw:
        return {}
    import json

    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return dict(data) if isinstance(data, dict) else {}


def _explicit_row(owner_key: str, capability: str):
    return frappe.db.get_value(
        "Business Entitlement",
        {"active_owner_key": owner_key, "capability": capability},
        ["state", "effective_from", "effective_to", "limit_json", "source", "source_reference"],
        as_dict=True,
    )


def resolve_entitlement(
    owner_type: str,
    organization: str | None,
    provider: str | None,
    capability: str,
) -> dict | None:
    """Return the effective entitlement for one capability, or ``None``.

    ``None`` means the capability is unknown or the business is ambiguous. The
    caller must treat it as denied.
    """

    from appointment.content import tenancy

    owner_key = tenancy.active_owner_key(owner_type, organization, provider)
    if not owner_key:
        return None
    # Fail closed when the business does not exist: defaults never invent a tenant.
    if owner_type == "Organization":
        if not frappe.db.exists("Organization", organization):
            return None
    elif owner_type == "Provider":
        if not frappe.db.exists("Provider", provider):
            return None
    else:
        return None
    value = str(capability or "").strip()
    if value not in CAPABILITY_SET:
        return None
    row = _explicit_row(owner_key, value)
    if row:
        state = row["state"]
        limits = _limits(row["limit_json"])
        source = row["source"] or "Administrator"
        source_reference = row["source_reference"]
        effective_from = row["effective_from"]
        effective_to = row["effective_to"]
    else:
        default = DEFAULT_PLAN.get(value, {"state": "Suspended", "limits": {}})
        state = default["state"]
        limits = dict(default.get("limits") or {})
        source = "Default"
        source_reference = None
        effective_from = None
        effective_to = None
    active = state in ACTIVE_STATES and _window_active(effective_from, effective_to, _now())
    return {
        "capability": value,
        "state": state,
        "active": active,
        "limits": limits,
        "source": source,
        "sourceReference": source_reference,
        "effectiveFrom": str(effective_from) if effective_from else None,
        "effectiveTo": str(effective_to) if effective_to else None,
    }


def is_capable(owner_type: str, organization: str | None, provider: str | None, capability: str) -> bool:
    resolved = resolve_entitlement(owner_type, organization, provider, capability)
    return bool(resolved and resolved["active"])


def require_capability(owner_type: str, organization: str | None, provider: str | None, capability: str) -> dict:
    """Return the active entitlement or refuse the operation."""

    resolved = resolve_entitlement(owner_type, organization, provider, capability)
    if not resolved or not resolved["active"]:
        frappe.throw(
            _("This business is not entitled to {0}.").format(str(capability or "").strip() or "(unknown)"),
            frappe.PermissionError,
        )
    return resolved


def effective_limits(owner_type: str, organization: str | None, provider: str | None, capability: str) -> dict:
    resolved = resolve_entitlement(owner_type, organization, provider, capability)
    return dict(resolved["limits"]) if resolved else {}


def enforce_limit(
    owner_type: str,
    organization: str | None,
    provider: str | None,
    capability: str,
    limit_key: str,
    proposed_total: int,
) -> None:
    """Refuse a write that would exceed a declared numeric limit.

    A missing or ``None`` limit means the capability is unbounded for that key.
    ``proposed_total`` is the count after the proposed change.
    """

    limits = effective_limits(owner_type, organization, provider, capability)
    ceiling = limits.get(limit_key)
    if ceiling is None:
        return
    try:
        ceiling = int(ceiling)
    except (TypeError, ValueError):
        return
    if int(proposed_total) > ceiling:
        frappe.throw(
            _("This would exceed the {0} limit of {1}.").format(limit_key, ceiling),
            frappe.ValidationError,
        )


def list_entitlements(owner_type: str, organization: str | None, provider: str | None) -> dict:
    from appointment.content import tenancy

    tenancy.require_business_owner(owner_type, organization, provider)
    return {
        capability: resolve_entitlement(owner_type, organization, provider, capability)
        for capability in CAPABILITIES
    }


def set_capability(
    owner_type: str,
    organization: str | None,
    provider: str | None,
    capability: str,
    state: str,
    *,
    limits: dict | None = None,
    source: str = "Administrator",
    source_reference: str | None = None,
    effective_from=None,
    effective_to=None,
) -> str:
    """Trusted upsert of one business capability.

    This is a server workflow. Callers on a user-facing request path must first
    verify that the actor is a System Manager or an equivalent trusted worker.
    """

    import json

    from appointment.content import tenancy

    owner_key = tenancy.require_business_owner(owner_type, organization, provider)
    value = normalize_capability(capability)
    if state not in ALL_STATES:
        frappe.throw(_("Unknown entitlement state: {0}.").format(state), frappe.ValidationError)
    if source not in SOURCES:
        frappe.throw(_("Unknown entitlement source: {0}.").format(source), frappe.ValidationError)
    entitlement_key = f"{owner_key}:{value}"
    existing = frappe.db.get_value("Business Entitlement", {"entitlement_key": entitlement_key}, "name")
    doc = frappe.get_doc("Business Entitlement", existing) if existing else frappe.new_doc("Business Entitlement")
    if not existing:
        doc.owner_type = owner_type
        doc.organization = organization
        doc.provider = provider
        doc.active_owner_key = owner_key
        doc.capability = value
        doc.entitlement_key = entitlement_key
    doc.state = state
    doc.limit_json = json.dumps(limits or {}, sort_keys=True)
    doc.source = source
    doc.source_reference = source_reference
    doc.effective_from = effective_from
    doc.effective_to = effective_to
    doc.last_reconciled_at = now_datetime()
    doc.flags.ignore_permissions = True
    doc.save()
    return doc.name
