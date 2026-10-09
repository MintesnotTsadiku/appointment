"""Import the Amharic copy for the customers of independent providers: the booking
confirmation note, the default message settings and the new server messages.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
