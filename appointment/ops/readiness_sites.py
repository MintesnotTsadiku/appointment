"""Readiness of published websites: each one should run on the latest version of its template.

An older template version keeps rendering the releases that pin it (a redesign never changes a
live site until the owner publishes again), so an old version is a warning, never a failure.
Retired versions (`recipes.RETIRED_VERSIONS`) are no longer offered to new sites.
"""

import frappe

from appointment.ops.checks import PASS, WARN, check
from appointment.public_experience.recipes import is_retired, latest_version

UPGRADE = ("Republish to upgrade: in Website setup, choose \"Upgrade the design\" (or switch to the same template), "
           "review the draft, then publish. Delete a retired version only when no release pins it.")


class PublicSites:
    area = "Public sites"

    def run(self):
        return [self.template_versions()]

    def template_versions(self):
        rows = frappe.get_all("Public Site", filters={"status": "Published", "current_release": ["is", "set"]},
                              fields=["name", "slug", "current_release"], order_by="slug asc", limit_page_length=0)
        pins = {row.name: row for row in frappe.get_all(
            "Experience Release", filters={"name": ["in", [site.current_release for site in rows] or [""]]},
            fields=["name", "recipe_key", "recipe_version"], limit_page_length=0)}
        behind = []
        for site in rows:
            release = pins.get(site.current_release)
            latest = latest_version(release.recipe_key) if release else None
            if release and latest and int(release.recipe_version or 0) < latest:
                retired = " (retired)" if is_retired(release.recipe_key, release.recipe_version) else ""
                behind.append(f"/{site.slug}: {release.recipe_key} v{release.recipe_version}{retired}, latest v{latest}")
        if not behind:
            return check(self.area, "template_versions", PASS,
                         f"All {len(rows)} published website(s) use the latest version of their template.")
        return check(self.area, "template_versions", WARN,
                     f"{len(behind)} of {len(rows)} published website(s) use an older template version: " + "; ".join(behind) + ".",
                     UPGRADE)
