"""Operator-only managed profile for an account created and assigned through browser UI."""

import json
import stat
from pathlib import Path

import frappe

from appointment.tests.content_browser_bootstrap import ALLOWED_SITES, USER, account_label


def login(credential_file):
    if frappe.local.site not in ALLOWED_SITES or not frappe.conf.get("worktree_development"):
        raise RuntimeError("Staff browser profiles require the isolated acceptance runtime")
    if frappe.session.user != "Administrator":
        raise RuntimeError("Only the browser operator may configure a managed profile")
    path = Path(credential_file)
    if path.is_symlink() or path.parent.parent != Path("/tmp") or not path.parent.name.startswith("appointment-workbook-qa-"):
        raise RuntimeError("Credentials must remain in the exact private fixture directory")
    if stat.S_IMODE(path.stat().st_mode) != 0o600:
        raise RuntimeError("Staff credentials must be private")
    credential = json.loads(path.read_text())
    user = "wqa-websiteacceptance-staff@example.test"
    if credential.get("username") != user or not credential.get("password"):
        raise RuntimeError("Unexpected staff acceptance identity")
    memberships = frappe.get_all("Business Membership", filters={"user": user, "status": "Active"}, fields=["organization", "membership_role"])
    if len(memberships) != 1 or memberships[0].membership_role != "Receptionist":
        raise RuntimeError("Assign the accepted account through Team before browser login")
    organization = memberships[0].organization
    if organization != "WQA-websiteacceptance" or frappe.db.get_value("Organization", organization, "owner_user") != USER:
        raise RuntimeError("The staff scope must belong to the exact browser-created business")
    roles = set(frappe.get_roles(user))
    if roles & {"System Manager", "Organization Manager", "Provider", "Platform Admin", "Framework Builder"}:
        raise RuntimeError("The staff browser identity has elevated roles")
    from agent_plane.managed_browser.service import create_browser_profile, start_browser_stored_credential_login
    from agent_harness.browser.governed_runtime import create_storage_state_ref, storage_state_path_for_ref

    profile = create_browser_profile(account_label="Acceptance receptionist — " + frappe.local.site,
                                    owner_user=user, base_domains=[frappe.local.site, "127.0.0.11"], runtime_provider_key="")
    account = frappe.get_doc("Browser Account", profile["browser_account"])
    account.update({"allow_stored_login_credentials": 1, "credential_username": user,
                    "credential_password": credential["password"], "login_strategy": "Direct HTTP Credential Login"})
    account.save(ignore_permissions=True)
    session = frappe.get_doc("Browser Session", {"browser_account": account.name, "session_label": "primary"})
    reference = create_storage_state_ref(account.name + ":" + session.name)
    session.update({"storage_mode": "Storage State", "encrypted_profile_ref": reference})
    session.save(ignore_permissions=True)
    account.profile_storage_ref = reference
    account.save(ignore_permissions=True)
    frappe.db.commit()
    result = start_browser_stored_credential_login(browser_account=account.name, base_url="http://127.0.0.11:34340",
                                                 target_url="http://127.0.0.11:34340/reception")
    if not result.get("ok"):
        raise RuntimeError("Managed receptionist login failed; retain private operator logs")
    state = storage_state_path_for_ref(reference)
    if not state.is_file():
        raise RuntimeError("Managed receptionist login did not retain session state")
    state.chmod(0o600)
    return {"browser_account": account.name, "browser_session": session.name, "roles": sorted(roles),
            "user": user, "storage_state": str(state)}


def set_test_entitlement(capability, state, limits=None):
    """Platform-owned plan changes for the exact UI-created acceptance business."""
    if frappe.session.user != "Administrator" or frappe.local.site not in ALLOWED_SITES or not frappe.conf.get("worktree_development"):
        raise RuntimeError("Only the isolated browser operator may change test entitlements")
    organization = "WQA-websiteacceptance"
    if frappe.db.get_value("Organization", organization, "owner_user") != USER:
        raise RuntimeError("The exact normal-owner acceptance business is absent")
    if capability not in {"blog", "gallery", "newsletter"} or state not in {"Active", "Expired"}:
        raise RuntimeError("Unsupported acceptance plan change")
    allowed = {"blog": {"articles"}, "gallery": {"collections"}, "newsletter": {"monthly_sends"}}
    if limits is not None and (not isinstance(limits, dict) or set(limits) - allowed[capability] or any(value != 1 for value in limits.values())):
        raise RuntimeError("Only a one-record ceiling may be used in limit acceptance")
    from appointment.content import entitlements

    name = entitlements.set_capability("Organization", organization, None, capability, state,
                                       limits=limits, source_reference="Exact managed browser acceptance")
    frappe.db.commit()
    return {"capability": capability, "state": state, "entitlement": name}
