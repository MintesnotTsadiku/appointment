"""Content publishing, gallery, entitlements and audience boundaries.

This package owns the appointment-side tenancy and capability layer that sits
in front of the upstream Blog and Newsletter apps. Upstream authoring records
are never public; they are projected into immutable Published Content Releases.
"""
