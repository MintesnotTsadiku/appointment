"""Import the Amharic copy for customer notification emails and settings.

The email job translates with `_(text, lang=...)`, which reads the same
`Translation` records. The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
