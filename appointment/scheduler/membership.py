"""Business membership, role resolution and staff assignment.

Global capability (a Frappe Role) is deliberately separate from a business
membership. Holding the global "Front Desk" role does not by itself grant
access to any business: the user also needs an Active ``Business Membership``
scoped to that business (and optionally to specific locations/providers).

Deterministic multi-role behaviour: when one user has several roles in the same
business the landing surface follows the highest role in this order
``Owner > Manager > Receptionist > Provider``. The same precedence decides the
default landing surface when a business is remembered or auto-selected.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

ROLE_OWNER = "Owner"
ROLE_MANAGER = "Manager"
ROLE_PROVIDER = "Provider"
ROLE_RECEPTIONIST = "Receptionist"

MEMBERSHIP_ROLES = (ROLE_OWNER, ROLE_MANAGER, ROLE_PROVIDER, ROLE_RECEPTIONIST)
ASSIGNABLE_ROLES = (ROLE_MANAGER, ROLE_PROVIDER, ROLE_RECEPTIONIST)
ROLE_PRECEDENCE = (ROLE_OWNER, ROLE_MANAGER, ROLE_RECEPTIONIST, ROLE_PROVIDER)

STAFF_ROLES = ("Provider", "Organization Manager", "Front Desk", "Assistant", "Appointment Manager")

# Global Frappe roles granted for a business membership. These are capabilities,
# not a substitute for scoped membership.
FRAPPE_ROLE_FOR_MEMBERSHIP = {
    ROLE_OWNER: ("Provider", "Organization Manager"),
    ROLE_MANAGER: ("Organization Manager", "Provider"),
    ROLE_PROVIDER: ("Provider",),
    ROLE_RECEPTIONIST: ("Front Desk",),
}

# Landing surfaces per role. Reception and calendar carry the business selector.
LANDING_ROUTES = {
    ROLE_OWNER: "/home",
    ROLE_MANAGER: "/home",
    ROLE_RECEPTIONIST: "/reception",
    ROLE_PROVIDER: "/calendar",
}

_MEMBERSHIP_FIELDS = [
    "name",
    "user",
    "full_name",
    "organization",
    "membership_role",
    "status",
    "provider",
    "assigned_by",
    "assigned_at",
    "notes",
]


def current_user(user=None):
    return user or frappe.session.user


def user_is_enabled(user):
    if user in (None, "", "Guest"):
        return False
    enabled = frappe.db.get_value("User", user, "enabled")
    return bool(enabled)


def membership_rows(user=None, roles=None, organization=None, status="Active"):
    """Active membership rows, read without DocType permissions.

    Callers must supply the user scope. This is the single place that reads the
    membership table so query and single-record checks stay consistent.
    """
    filters = {}
    if status:
        filters["status"] = status
    if user:
        filters["user"] = user
    if roles:
        filters["membership_role"] = ["in", list(roles)]
    if organization:
        filters["organization"] = organization
    return frappe.get_all(
        "Business Membership",
        filters=filters,
        fields=_MEMBERSHIP_FIELDS,
        order_by="creation asc",
        ignore_permissions=True,
    )


def manager_organizations(user=None):
    """Businesses the user can administer: owner, manager membership, or legacy
    Organization Manager row. Providers/receptionists are intentionally absent.
    """
    user = current_user(user)
    if user == "Guest" or not user_is_enabled(user):
        return []
    owned = frappe.get_all("Organization", filters={"owner_user": user, "is_active": 1}, pluck="name")
    delegated = frappe.get_all(
        "Organization Manager", filters={"user": user, "parenttype": "Organization"}, pluck="parent"
    )
    delegated = [name for name in delegated if frappe.db.get_value("Organization", name, "is_active")]
    membership = [
        row.organization for row in membership_rows(user, roles=(ROLE_OWNER, ROLE_MANAGER))
    ]
    return list(dict.fromkeys(owned + delegated + membership))


def reception_scopes(user=None):
    """Receptionist scopes as ``{organization, provider, locations}`` dicts."""
    user = current_user(user)
    if not user_is_enabled(user):
        return []
    scopes = []
    for row in membership_rows(user, roles=(ROLE_RECEPTIONIST,)):
        locations = frappe.get_all(
            "Membership Location",
            filters={"parent": row.name, "parenttype": "Business Membership"},
            pluck="location",
            ignore_permissions=True,
        )
        scopes.append({"organization": row.organization, "provider": row.provider, "locations": locations})
    return scopes


def receptionist_organizations(user=None):
    return list(dict.fromkeys(scope["organization"] for scope in reception_scopes(user)))


def active_provider_memberships(user=None):
    """Providers linked to this user with at least one active organization row."""
    user = current_user(user)
    if user == "Guest" or not user_is_enabled(user):
        return []
    result = []
    for provider in frappe.get_all("Provider", filters={"user": user, "is_active": 1}, pluck="name"):
        rows = frappe.get_all(
            "Provider Organization",
            filters={"parent": provider, "parenttype": "Provider", "status": "Active"},
            fields=["organization"],
            ignore_permissions=True,
        )
        for row in rows:
            if frappe.db.get_value("Organization", row.organization, "is_active"):
                result.append({"provider": provider, "organization": row.organization})
    return result


def provider_organizations(user=None):
    return list(dict.fromkeys(row["organization"] for row in active_provider_memberships(user)))


def has_staff_role(user=None):
    user = current_user(user)
    if user == "Guest":
        return False
    return any(role in STAFF_ROLES for role in frappe.get_roles(user))


def primary_role(roles):
    for role in ROLE_PRECEDENCE:
        if role in roles:
            return role
    return None


def _location_names(location_ids):
    if not location_ids:
        return []
    rows = frappe.get_all(
        "Location",
        filters={"name": ["in", location_ids]},
        fields=["name", "location_name"],
        ignore_permissions=True,
    )
    by_name = {row.name: row.location_name for row in rows}
    return [by_name.get(name) or name for name in location_ids]


def workspace_for(organization, user=None):
    """Resolve one business workspace for a user, or ``None`` when not a member."""
    for workspace in workspaces(user):
        if workspace["organization"] == organization:
            return workspace
    return None


def workspaces(user=None):
    """Every business the user belongs to, with merged roles and scope."""
    user = current_user(user)
    if user == "Guest" or not user_is_enabled(user):
        return []
    if user == "Administrator":
        return []

    roles_by_org: dict[str, set] = {}
    provider_by_org: dict[str, str] = {}
    locations_by_org: dict[str, list] = {}

    for organization in manager_organizations(user):
        roles_by_org.setdefault(organization, set())
        owned = frappe.db.get_value("Organization", organization, "owner_user") == user
        if owned:
            roles_by_org[organization].add(ROLE_OWNER)
        else:
            roles_by_org[organization].add(ROLE_MANAGER)

    for row in active_provider_memberships(user):
        roles_by_org.setdefault(row["organization"], set()).add(ROLE_PROVIDER)
        provider_by_org.setdefault(row["organization"], row["provider"])
        extra = frappe.get_all(
            "Provider Location",
            filters={"parent": row["provider"], "parenttype": "Provider"},
            pluck="location",
            ignore_permissions=True,
        )
        locations_by_org.setdefault(row["organization"], [])
        locations_by_org[row["organization"]] = list(dict.fromkeys(locations_by_org[row["organization"]] + extra))

    for row in membership_rows(user):
        roles_by_org.setdefault(row.organization, set()).add(row.membership_role)
        if row.provider:
            provider_by_org.setdefault(row.organization, row.provider)
        location_ids = frappe.get_all(
            "Membership Location",
            filters={"parent": row.name, "parenttype": "Business Membership"},
            pluck="location",
            ignore_permissions=True,
        )
        if location_ids:
            existing = locations_by_org.setdefault(row.organization, [])
            locations_by_org[row.organization] = list(dict.fromkeys(existing + location_ids))

    result = []
    for organization, roles in roles_by_org.items():
        org = frappe.db.get_value(
            "Organization",
            organization,
            ["organization_name", "slug", "enable_public_booking", "timezone", "is_active"],
            as_dict=True,
        )
        if not org or not org.is_active:
            continue
        role = primary_role(roles)
        provider = provider_by_org.get(organization)
        locations = locations_by_org.get(organization, [])
        route = LANDING_ROUTES.get(role, "/home")
        result.append(
            {
                "organization": organization,
                "business_name": org.organization_name,
                "slug": org.slug,
                "roles": sorted(roles, key=ROLE_PRECEDENCE.index),
                "role": role,
                "provider": provider,
                "provider_name": frappe.db.get_value("Provider", provider, "provider_name") if provider else None,
                "locations": locations,
                "location_names": _location_names(locations),
                "timezone": org.timezone,
                "published": bool(org.enable_public_booking),
                "landing": f"{route}?organization={organization}",
                "is_manager": role in (ROLE_OWNER, ROLE_MANAGER),
            }
        )
    result.sort(key=lambda item: (item["business_name"] or "").lower())
    return result


def resolve_landing(spaces, selected):
    if selected:
        return selected["landing"]
    if len(spaces) == 1:
        return spaces[0]["landing"]
    return "/workspaces"


def _is_prospective_owner(user):
    """A user who should see guided setup rather than a no-assignment screen.

    Provider accounts already onboarding are prospective; unassigned staff (a
    capability role but no membership) are not; a plain account is prospective
    only while self-service business creation is enabled.
    """
    if frappe.db.get_value("Provider", {"user": user}, "onboarding_type"):
        return True
    if has_staff_role(user):
        return False
    from appointment.scheduler import registration

    return registration.self_service_business_creation_allowed()


@frappe.whitelist(allow_guest=True)
def context():
    """Authorized context for the signed-in user. Never trusts a URL parameter.

    Guest calls are allowed so public pages can render a customer state without a
    permission error; no business data is returned for an unauthenticated user.
    """
    user = frappe.session.user
    base = {
        "authenticated": user != "Guest",
        "user": user,
        "is_administrator": user == "Administrator",
    }
    if user == "Guest":
        return {**base, "state": "customer", "roles": [], "workspaces": [], "selected": None, "landing": "/login"}
    if not user_is_enabled(user):
        return {**base, "state": "disabled", "roles": [], "workspaces": [], "selected": None, "landing": "/login"}

    roles = frappe.get_roles(user)
    base["roles"] = roles
    base["full_name"] = frappe.db.get_value("User", user, "full_name") or user
    base["has_staff_role"] = has_staff_role(user)

    if user == "Administrator":
        return {**base, "state": "administrator", "workspaces": [], "selected": None, "landing": "/home"}

    spaces = workspaces(user)
    if not spaces:
        if _is_prospective_owner(user):
            state, landing = "owner_setup", "/onboarding"
        else:
            state, landing = "no_assignment", "/no-access"
        return {**base, "state": state, "workspaces": [], "selected": None, "landing": landing}

    remembered = frappe.defaults.get_user_default("appointment_workspace", user)
    selected = next((space for space in spaces if space["organization"] == remembered), None)
    if selected is None and len(spaces) == 1:
        selected = spaces[0]
    state = "workspace" if selected else "selection"
    return {
        **base,
        "state": state,
        "workspaces": spaces,
        "selected": selected,
        "landing": resolve_landing(spaces, selected),
    }


@frappe.whitelist()
def workspace(organization):
    """One authorized workspace, revalidated on every request."""
    found = workspace_for(organization)
    if not found:
        frappe.throw(_("You are not a member of this business."), frappe.PermissionError)
    return found


@frappe.whitelist(methods=["POST"])
def select_workspace(organization):
    if not workspace_for(organization):
        frappe.throw(_("You are not a member of this business."), frappe.PermissionError)
    frappe.defaults.set_user_default("appointment_workspace", organization, frappe.session.user)
    return context()


@frappe.whitelist(methods=["POST"])
def clear_workspace():
    frappe.defaults.clear_user_default("appointment_workspace", frappe.session.user)
    return context()


# --------------------------------------------------------------------------- #
# Capability grants
# --------------------------------------------------------------------------- #


def ensure_role_doc(role):
    if not frappe.db.exists("Role", role):
        frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(ignore_permissions=True)


def grant_roles(user, roles):
    """Idempotently grant global Frappe roles. Returns the roles newly added."""
    if not roles:
        return []
    for role in roles:
        ensure_role_doc(role)
    existing = set(
        frappe.get_all("Has Role", filters={"parent": user, "parenttype": "User"}, pluck="role", ignore_permissions=True)
    )
    missing = [role for role in roles if role not in existing]
    if missing:
        previous = frappe.flags.ignore_permissions
        frappe.flags.ignore_permissions = True
        try:
            doc = frappe.get_doc("User", user)
            doc.flags.ignore_permissions = True
            for role in missing:
                doc.append("roles", {"role": role})
            doc.save(ignore_permissions=True)
        finally:
            frappe.flags.ignore_permissions = previous
    return missing


def grant_membership_roles(user, membership_role):
    return grant_roles(user, FRAPPE_ROLE_FOR_MEMBERSHIP.get(membership_role, ()))


# --------------------------------------------------------------------------- #
# Manager-facing staff assignment
# --------------------------------------------------------------------------- #


def require_manager(organization):
    user = frappe.session.user
    if user == "Administrator":
        return user
    if not user_is_enabled(user):
        frappe.throw(_("Your account is disabled."), frappe.PermissionError)
    from appointment.scheduler.booking_access import managed_organizations

    if organization not in managed_organizations(user):
        frappe.throw(_("Only a manager of this business may manage its team."), frappe.PermissionError)
    return user


def _resolve_user(email, full_name=None, password=None):
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        frappe.throw(_("Enter a valid email address."))
    if frappe.db.exists("User", email):
        return email, False
    parts = (full_name or email.split("@")[0]).strip().split(" ", 1)
    doc = frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": parts[0][:100] or email,
            "last_name": (parts[1] if len(parts) > 1 else "")[:100],
            "enabled": 1,
            "user_type": "System User",
            "send_welcome_email": 0,
        }
    )
    if password:
        doc.new_password = password
    doc.insert(ignore_permissions=True)
    return doc.name, True


def _ensure_provider(organization, user, full_name=None):
    existing = frappe.get_all(
        "Provider",
        filters={"user": user, "is_active": 1},
        pluck="name",
        ignore_permissions=True,
    )
    for provider in existing:
        if frappe.db.exists(
            "Provider Organization",
            {"parent": provider, "parenttype": "Provider", "organization": organization, "status": "Active"},
        ):
            return provider
    provider_name = (full_name or frappe.db.get_value("User", user, "full_name") or user).strip()
    if frappe.db.exists("Provider", {"user": user, "provider_name": provider_name}):
        provider_name = f"{provider_name} ({organization})"
    doc = frappe.get_doc(
        {
            "doctype": "Provider",
            "provider_name": provider_name[:140],
            "user": user,
            "is_active": 1,
            "use_default_hours": 1,
            "organizations": [{"organization": organization, "status": "Active", "accept_org_bookings": 1}],
        }
    )
    doc.insert(ignore_permissions=True)
    return doc.name


def _validate_locations(organization, locations):
    valid = set(frappe.get_all("Location", filters={"organization": organization}, pluck="name", ignore_permissions=True))
    clean = []
    for location in locations or []:
        if location not in valid:
            frappe.throw(_("Location {0} does not belong to this business.").format(location))
        if location not in clean:
            clean.append(location)
    return clean


def _validate_provider(organization, provider):
    if not provider:
        return None
    if not frappe.db.exists(
        "Provider Organization",
        {"parent": provider, "parenttype": "Provider", "organization": organization, "status": "Active"},
    ):
        frappe.throw(_("Provider {0} is not active in this business.").format(provider))
    return provider


@frappe.whitelist(methods=["POST"])
def assign_member(
    organization,
    email,
    membership_role,
    provider=None,
    locations=None,
    full_name=None,
    password=None,
):
    """Assign an existing or new staff account to a business scope.

    Local assignment only: this never sends email. When a password is supplied
    it is set locally; otherwise the created account must be given a password by
    an administrator. ``delivery`` in the response makes that distinction clear.
    """
    actor = require_manager(organization)
    from appointment.scheduler import registration

    registration.require_invite_provisioning()
    if membership_role not in ASSIGNABLE_ROLES:
        frappe.throw(_("Choose a role of Manager, Provider or Receptionist."))

    if membership_role == ROLE_PROVIDER:
        provider = _validate_provider(organization, provider) or _ensure_provider(
            organization, _resolve_user(email, full_name, password)[0], full_name
        )
    else:
        provider = _validate_provider(organization, provider)

    if isinstance(locations, str):
        import json

        locations = json.loads(locations)
    locations = _validate_locations(organization, locations)

    user, created = _resolve_user(email, full_name, password)
    if membership_role == ROLE_PROVIDER and not provider:
        provider = _ensure_provider(organization, user, full_name)

    existing = frappe.db.get_value(
        "Business Membership",
        {"user": user, "organization": organization, "membership_role": membership_role},
        "name",
    )
    payload = {
        "user": user,
        "organization": organization,
        "membership_role": membership_role,
        "status": "Active",
        "provider": provider,
        "locations": [{"location": location} for location in locations],
    }
    if existing:
        doc = frappe.get_doc("Business Membership", existing)
        doc.update({k: v for k, v in payload.items() if k != "locations"})
        doc.set("locations", [])
        for location in locations:
            doc.append("locations", {"location": location})
        doc.assigned_by = actor
        doc.assigned_at = now_datetime()
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc({"doctype": "Business Membership", **payload})
        doc.assigned_by = actor
        doc.assigned_at = now_datetime()
        doc.insert(ignore_permissions=True)

    granted = grant_membership_roles(user, membership_role)
    return {
        "membership": doc.name,
        "user": user,
        "created_user": created,
        "membership_role": membership_role,
        "provider": provider,
        "locations": locations,
        "roles_granted": granted,
        "delivery": "local_assignment",
        "email_sent": False,
        "password_set": bool(password),
    }


@frappe.whitelist(methods=["POST"])
def revoke_member(membership):
    doc = frappe.get_doc("Business Membership", membership)
    require_manager(doc.organization)
    doc.status = "Inactive"
    doc.save(ignore_permissions=True)
    return {"membership": doc.name, "status": doc.status}


@frappe.whitelist()
def members(organization):
    require_manager(organization)
    rows = []
    for row in membership_rows(organization=organization, status=None):
        rows.append(
            {
                "name": row.name,
                "user": row.user,
                "full_name": row.full_name or frappe.db.get_value("User", row.user, "full_name") or row.user,
                "enabled": bool(frappe.db.get_value("User", row.user, "enabled")),
                "membership_role": row.membership_role,
                "status": row.status,
                "provider": row.provider,
                "provider_name": frappe.db.get_value("Provider", row.provider, "provider_name") if row.provider else None,
                "locations": [
                    {"name": loc, "label": frappe.db.get_value("Location", loc, "location_name") or loc}
                    for loc in frappe.get_all(
                        "Membership Location",
                        filters={"parent": row.name, "parenttype": "Business Membership"},
                        pluck="location",
                        ignore_permissions=True,
                    )
                ],
                "assigned_at": row.assigned_at,
            }
        )
    owners = frappe.get_all(
        "Organization", filters={"name": organization}, fields=["owner_user"], ignore_permissions=True
    )
    return {"members": rows, "owner": owners[0].owner_user if owners else None}


@frappe.whitelist()
def directory(organization, query=None):
    """Enabled accounts a manager may assign, for the assignment picker."""
    require_manager(organization)
    filters = {"enabled": 1, "name": ["not in", ["Guest", "Administrator"]]}
    if query:
        filters["name"] = ["like", f"%{query}%"]
    return frappe.get_all(
        "User",
        filters=filters,
        fields=["name", "full_name", "enabled"],
        limit=25,
        order_by="full_name asc",
        ignore_permissions=True,
    )


@frappe.whitelist()
def provider_options(organization):
    require_manager(organization)
    return frappe.get_all(
        "Provider Organization",
        filters={"organization": organization, "parenttype": "Provider", "status": "Active"},
        fields=["parent as provider"],
        ignore_permissions=True,
    )


@frappe.whitelist()
def location_options(organization):
    require_manager(organization)
    return frappe.get_all(
        "Location",
        filters={"organization": organization},
        fields=["name", "location_name"],
        order_by="location_name asc",
        ignore_permissions=True,
    )
