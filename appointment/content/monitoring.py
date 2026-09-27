"""Content operation counters and private, payload-free operational logs."""

import inspect
import json
from functools import wraps

import frappe
from frappe.utils import now_datetime

from appointment.content import tenancy

RETENTION_SECONDS = 90 * 24 * 60 * 60


def observed(action, scope="site"):
    def decorate(function):
        signature = inspect.signature(function)

        @wraps(function)
        def invoke(*args, **kwargs):
            arguments = signature.bind_partial(*args, **kwargs).arguments
            try:
                site = _authorized_site(arguments, scope)
            except Exception:
                site = None
            try:
                result = function(*args, **kwargs)
            except Exception as error:
                record(action, "failure", site, type(error).__name__)
                raise
            outcome = "success"
            if isinstance(result, dict) and result.get("status") in {"Delivered", "Held", "Error", "Scheduled"}:
                outcome = "state." + result["status"]
            record(action, outcome, site)
            return result

        return invoke

    return decorate


def record(action, outcome, site=None, error_kind=None):
    event = {"action": action, "outcome": outcome, "public_site": site, "error_kind": error_kind}
    try:
        frappe.logger("content_operations", allow_site=True).info(json.dumps(event))
        key = frappe.cache.make_key(_key(site))
        frappe.cache.execute_command("HINCRBY", key, action + "." + outcome, 1)
        frappe.cache.execute_command("HSET", key, action + ".last_at", now_datetime().isoformat())
        if error_kind:
            frappe.cache.execute_command("HINCRBY", key, action + ".error." + error_kind, 1)
        frappe.cache.expire(key, RETENTION_SECONDS)
    except Exception:
        # An unavailable monitor must not change publication or delivery results.
        pass


def site_counters(site):
    rows = frappe.cache.execute_command("HGETALL", frappe.cache.make_key(_key(site)))
    return {key.decode(): value.decode() if key.endswith(b".last_at") else int(value)
            for key, value in rows.items()}


def _key(site):
    return "content-operation-health:" + (site or "unscoped")


def _authorized_site(arguments, scope):
    if scope == "organization":
        organization = arguments.get("organization")
        if organization and tenancy.can_manage_business("Organization", organization):
            return "organization:" + organization
        return None
    site = arguments.get("site") or arguments.get("public_site")
    if scope == "ownership" and arguments.get("ownership"):
        site = frappe.db.get_value("Content Ownership", arguments.get("ownership"), "public_site")
    elif scope == "release" and arguments.get("release"):
        site = frappe.db.get_value("Published Content Release", arguments.get("release"), "public_site")
    elif scope == "campaign" and (arguments.get("campaign") or arguments.get("name")):
        site = frappe.db.get_value("Business Newsletter Campaign", arguments.get("campaign") or arguments.get("name"), "public_site")
    if not site:
        return None
    owner = frappe.db.get_value("Public Site", site, ["owner_type", "organization", "provider"], as_dict=True)
    if owner and tenancy.can_manage_business(owner.owner_type, owner.organization, owner.provider):
        return site
    return None
