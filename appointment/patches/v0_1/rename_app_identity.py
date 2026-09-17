"""Pre-model-sync patch that rewrites a legacy site's stored app identity."""

from appointment.migrate.rename_app_identity import rename_site_identity


def execute():
    rename_site_identity()
