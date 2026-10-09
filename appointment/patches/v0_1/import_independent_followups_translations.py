"""Import the Amharic copy for the independent provider follow-ups:
the new server message for walk-in ownership.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
