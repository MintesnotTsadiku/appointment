"""Focused persistence and current-user isolation checks with exact rollback."""
import json
import frappe
from appointment.scheduler import appearance, account, dashboard_config


def run():
    original = frappe.session.user
    users = ["bloom.owner@example.test", "bloom.provider1@example.test"]
    frappe.db.savepoint("internal_appearance_checks")
    try:
        for user in users:
            assert frappe.db.exists("User", user), "Use the existing isolated demo users"
        frappe.set_user(users[0])
        original_profile = account.load()
        profile_choice = {key: original_profile[key] for key in ('first_name', 'last_name', 'mobile_no')}
        profile_choice['mobile_no'] = '+251911000000'
        assert account.save(json.dumps(profile_choice))['mobile_no'] == profile_choice['mobile_no']
        assert account.load()['email'] == users[0]
        for extra in ('user', 'roles', 'enabled', 'email', 'user_image'):
            try:
                account.save(json.dumps({**profile_choice, extra: users[1]}))
            except frappe.ValidationError:
                pass
            else:
                raise AssertionError('Unsafe profile update accepted')
        account.save(json.dumps({key: original_profile[key] for key in ('first_name', 'last_name', 'mobile_no')}))
        navigation = frappe.defaults.get_user_default("appointment:navigation:v1")
        frappe.defaults.clear_default(key="appointment:navigation:v1", parent=users[0])
        assert dashboard_config.navigation() == dict(placement="sidebar", collapsed=False)
        if navigation is not None:
            frappe.defaults.set_user_default("appointment:navigation:v1", navigation)
        assert appearance.DEFAULTS["palette"] == "codex"
        choice = {**appearance.DEFAULTS, "palette": "ocean", "typography": "serif", "density": "compact"}
        assert appearance.save(json.dumps(choice)) == choice
        assert appearance.load() == choice
        assert frappe.defaults.get_user_default("appointment:navigation:v1") == navigation
        for invalid in [None, [], {**choice, "palette": "custom"}, {**choice, "css": "body{}"}, {**choice, "user": users[1]}, {**choice, "version": True}, {**choice, "mode": "unknown"}]:
            try:
                appearance.save(json.dumps(invalid))
            except frappe.ValidationError:
                pass
            else:
                raise AssertionError("Unsafe appearance accepted")
        assert appearance.load() == choice
        frappe.set_user(users[1])
        other_before = appearance.load()
        assert appearance.save(json.dumps({**appearance.DEFAULTS, "palette": "forest"}))["palette"] == "forest"
        frappe.set_user(users[0])
        assert appearance.load() == choice
        assert appearance.save(json.dumps(appearance.DEFAULTS)) == appearance.DEFAULTS
        frappe.set_user("Guest")
        for call in [account.load, lambda: account.save(json.dumps(profile_choice)), appearance.load, lambda: appearance.save(json.dumps(choice))]:
            try:
                call()
            except frappe.PermissionError:
                pass
            else:
                raise AssertionError("Guest preferences accepted")
        return dict(passed=True, checks=["validated enums", "no arbitrary fields", "user isolation", "navigation preserved", "reset", "guest rejected", "current-user profile and strict fields"])
    finally:
        frappe.db.rollback(save_point="internal_appearance_checks")
        for user in users:
            frappe.clear_cache(user=user)
        frappe.set_user(original)
