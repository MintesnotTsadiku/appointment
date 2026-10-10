"""Import the Amharic copy for walk-ins within open hours and the policy templates:
the new walk-in assignment messages and the template names and descriptions.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
