"""Redacted data-preservation evidence for the Appointment product.

Builds a machine-readable, privacy-safe snapshot of scheduling-domain records on
a cloned-data site. It records counts, link integrity and stable checksums only;
it never emits customer names, emails, phone numbers or file contents.

This is used by ``appointment.tests.test_data_preservation`` and can also be
invoked directly on a disposable cloned site::

    bench --site <cloned-site> execute appointment.qa_runner.preservation_snapshot
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import frappe

#: Exact pre-existing business counts on the cloned-data site.
BUSINESS_BASELINE = {
    "Appointment": 70,
    "Organization": 3,
    "Provider": 5,
    "Service": 79,
}

#: Doctypes whose files belong to the scheduling product.
PRODUCT_FILE_DOCTYPES = frozenset({"Appointment", "Organization", "Provider", "Service", "Location", "User"})

#: Attached-to-doctype prefixes owned by Agent Plane / Agent Harness / QA runs.
AGENT_FILE_DOCTYPE_PREFIXES = ("Browser QA", "Deep Agent", "Agent ")

#: Role-name prefixes owned by Agent Plane / Agent Harness.
AGENT_ROLE_PREFIXES = ("Agent ",)


def _sha256(values: list[str]) -> str:
    digest = hashlib.sha256()
    for value in sorted(values):
        digest.update(value.encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def _link_integrity(records: list[dict[str, Any]], field: str, doctype: str) -> int:
    return sum(1 for record in records if record.get(field) and frappe.db.exists(doctype, record[field]))


def _file_category(attached_to_doctype: str | None) -> str:
    value = attached_to_doctype or ""
    if any(value.startswith(prefix) for prefix in AGENT_FILE_DOCTYPE_PREFIXES):
        return "agent_qa"
    if value in PRODUCT_FILE_DOCTYPES or not value:
        return "product_owned"
    return "other"


def build_snapshot() -> dict[str, Any]:
    """Return a redacted, machine-readable preservation snapshot."""
    counts = {doctype: frappe.db.count(doctype) for doctype in BUSINESS_BASELINE}

    appointments = frappe.get_all(
        "Appointment", fields=["name", "provider", "service", "location"], limit_page_length=0
    )
    organizations = frappe.get_all("Organization", fields=["name", "owner_user"], limit_page_length=0)
    provider_organization_links = frappe.get_all(
        "Provider Organization",
        fields=["parent", "organization"],
        limit_page_length=0,
    )

    relationship_checks = {
        "appointments": len(appointments),
        "appointments_with_valid_provider": _link_integrity(appointments, "provider", "Provider"),
        "appointments_with_valid_service": _link_integrity(appointments, "service", "Service"),
        "appointments_with_valid_location": _link_integrity(appointments, "location", "Location"),
        "organizations": len(organizations),
        "organizations_with_valid_owner_user": _link_integrity(organizations, "owner_user", "User"),
        "provider_organization_links": len(provider_organization_links),
        "provider_organization_links_with_valid_provider": _link_integrity(
            provider_organization_links, "parent", "Provider"
        ),
        "provider_organization_links_with_valid_organization": _link_integrity(
            provider_organization_links, "organization", "Organization"
        ),
    }

    files = frappe.get_all(
        "File",
        fields=["name", "attached_to_doctype", "is_private"],
        limit_page_length=0,
    )
    file_groups: dict[str, list[str]] = {"product_owned": [], "agent_qa": [], "other": []}
    for row in files:
        file_groups[_file_category(row.attached_to_doctype)].append(row.name)

    agent_roles = [
        role.name
        for role in frappe.get_all("Role", fields=["name"], limit_page_length=0)
        if any(role.name.startswith(prefix) for prefix in AGENT_ROLE_PREFIXES)
    ]
    agent_users: set[str] = set()
    if agent_roles:
        agent_users = {
            row[0]
            for row in frappe.db.sql(
                "select distinct parent from `tabHas Role` where role in %(roles)s",
                {"roles": agent_roles},
            )
        }
    total_users = frappe.db.count("User")

    return {
        "schema_version": 1,
        "business_counts": counts,
        "relationship_checks": relationship_checks,
        "relationships_ok": all(
            relationship_checks[f"{many}"] == relationship_checks[f"{many}_with_valid_{one}"]
            for many, one in (
                ("appointments", "provider"),
                ("appointments", "service"),
                ("appointments", "location"),
                ("organizations", "owner_user"),
                ("provider_organization_links", "provider"),
                ("provider_organization_links", "organization"),
            )
        ),
        "organization_manager_rows": frappe.db.count("Organization Manager"),
        "organization_manager_role_exists": bool(frappe.db.exists("Role", "Organization Manager")),
        "organization_manager_docperm_count": frappe.db.count("DocPerm", {"role": "Organization Manager"}),
        "files": {
            "total": len(files),
            "product_owned": len(file_groups["product_owned"]),
            "agent_qa": len(file_groups["agent_qa"]),
            "other": len(file_groups["other"]),
            "product_owned_checksum": _sha256(file_groups["product_owned"]),
            "agent_qa_checksum": _sha256(file_groups["agent_qa"]),
        },
        "users": {
            "total": total_users,
            "agent_qa": len(agent_users),
            "product_owned_or_preexisting": total_users - len(agent_users),
        },
        "record_checksums": {
            "appointment_identifiers": _sha256([row.name for row in appointments]),
        },
    }


def snapshot_to_file(path: str | None = None) -> tuple[dict[str, Any], str]:
    """Write the redacted snapshot as JSON and return it with the output path."""
    snapshot = build_snapshot()
    target = Path(path or "/tmp/appointment_qa/preservation-snapshot.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(snapshot, indent=2, sort_keys=True), encoding="utf-8")
    return snapshot, str(target)
