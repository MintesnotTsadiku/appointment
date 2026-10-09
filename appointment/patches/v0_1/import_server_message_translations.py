"""Import the Amharic copy for develop's server messages: errors and status text
from content, website setup, organization import and scheduler modules.

The importer only adds or updates records.
"""

from appointment.patches.v0_1.import_frontend_translations import execute as import_frontend_translations


def execute():
    import_frontend_translations()
