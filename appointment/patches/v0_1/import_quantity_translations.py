"""Import the Amharic copy for booking quantity, room and equipment use, and the reception room filter.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
