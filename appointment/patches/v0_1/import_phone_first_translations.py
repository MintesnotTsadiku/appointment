"""Import the Amharic copy for phone-first booking: the shared phone hint, the
phone tag control, the booking form and confirmation copy, and the server
messages for phone numbers.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
