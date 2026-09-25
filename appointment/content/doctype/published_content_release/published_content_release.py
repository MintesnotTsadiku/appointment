"""Immutable Published Content Release controller.

A release pins one sanitized content projection and one media projection for a
business and public site. Public traffic reads only an Active release. A release
is never edited in place; publishing creates a new immutable row and supersedes
the previous owner of the route.
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.content import tenancy
from appointment.content.canonical import hash_document
from appointment.content.releases import RELEASE_CONTRACT


class PublishedContentRelease(Document):
    def validate(self):
        if not self.is_new():
            # Only a governed lifecycle transition may mutate a stored release.
            if not self.flags.get("content_release_status_change"):
                frappe.throw(_("Published Content Releases are immutable."))
            if self.status not in ("Active", "Superseded", "Withdrawn"):
                frappe.throw(_("Unknown release status: {0}.").format(self.status))
            return
        self._validate_new()

    def _validate_new(self):
        if not self.flags.get("content_release_factory"):
            frappe.throw(
                _("Published Content Releases are created only by the content publisher."),
                frappe.PermissionError,
            )
        if not self.public_site:
            frappe.throw(_("A release requires a Public Site."))
        site = frappe.db.get_value(
            "Public Site",
            self.public_site,
            ["owner_type", "organization", "provider", "slug"],
            as_dict=True,
        )
        if not site:
            frappe.throw(_("Public Site {0} does not exist.").format(self.public_site))
        if (self.owner_type, self.organization, self.provider) != (
            site.owner_type,
            site.organization,
            site.provider,
        ):
            frappe.throw(_("The release owner must match its Public Site."))
        self.active_owner_key = tenancy.require_business_owner(
            self.owner_type, self.organization, self.provider
        )
        if not self.route.startswith("/"):
            frappe.throw(_("A release route must be site-relative and start with '/'."))
        if not self.content_hash:
            frappe.throw(_("A release requires a canonical content hash."))
        self.release_number = self._next_release_number()
        self.published_by = self.published_by or frappe.session.user
        from frappe.utils import now_datetime

        self.published_at = self.published_at or now_datetime()

    def _next_release_number(self) -> int:
        current = frappe.db.get_value(
            "Published Content Release",
            {"public_site": self.public_site},
            "release_number",
            order_by="release_number desc",
        )
        return int(current or 0) + 1

    def on_trash(self):
        frappe.throw(
            _("Published Content Releases cannot be deleted; withdraw or roll back instead."),
            frappe.PermissionError,
        )

    def verify_hash(self) -> bool:
        projection = self._json(self.content_json)
        expected = hash_document(
            {
                "contract": RELEASE_CONTRACT,
                "publicSite": self.public_site,
                "contentType": self.content_type,
                "route": self.route,
                "locale": self.locale,
                "projection": projection,
            }
        )
        return expected == self.content_hash

    @staticmethod
    def _json(raw):
        if isinstance(raw, dict):
            return raw
        if not raw:
            return {}
        try:
            data = json.loads(raw)
        except (TypeError, ValueError):
            return {}
        return data
