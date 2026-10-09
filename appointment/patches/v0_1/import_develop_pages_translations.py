"""Import the Amharic copy for develop's website, appearance, organization import,
independent provider, newsletter, staff invitation and analytics dashboard pages.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
