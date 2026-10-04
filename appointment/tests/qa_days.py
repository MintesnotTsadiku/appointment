"""Fixture values for manifests that need an open booking day instead of "tomorrow".

Bloom is closed on Mondays, so "tomorrow" fails one day a week. `qa_open_day` is
the first day from tomorrow on where Bloom's first offering has an open time.
"""

from frappe.utils import add_days, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking

FIRST_OFFERING = "EVT-2026-000105"  # Wash and finish, Hanna: the first card on Bloom's page


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    for offset in range(1, 14):
        day = add_days(nowdate(), offset)
        if any(slot["available"] for slot in booking.slots(FIRST_OFFERING, day)["all_available_slots_for_data"]):
            values["qa_open_day"] = str(day)
            break
    return values
