"""Import the Amharic copy for the redesigned platform landing page.

The first translation import already ran on existing sites, so new catalog
entries need their own patch. The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
