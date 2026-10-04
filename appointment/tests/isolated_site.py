"""Opt-in for suites that are locked to named implementation sites.

Some suites create and remove their own records, so they refuse to run except on
the sites they were written on. Another isolated worktree site can opt in
explicitly with `bench --site <site> set-config -p isolated_test_suites 1`.
Production sites are never worktree development sites, so the flag alone is not enough.
"""

import frappe


def opted_in():
    return bool(frappe.conf.get("worktree_development") and frappe.conf.get("isolated_test_suites") == 1)
