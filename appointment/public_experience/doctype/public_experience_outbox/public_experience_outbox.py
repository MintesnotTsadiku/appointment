"""Immutable-ish outbox record for published public-experience work.

Written inside the publication transaction; consumed idempotently by workers.
"""

from __future__ import annotations

from frappe.model.document import Document


class PublicExperienceOutbox(Document):
    pass
