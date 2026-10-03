"""Import the Amharic copy for the platform administrator's payments and ledger page.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
