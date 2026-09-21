"""Phase 3 follow-up — persisted location hours and slot response for a closed day."""

import frappe
from frappe.utils import add_days, nowdate

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

loc = frappe.get_doc("Location", "P3B Studio")
print("System Settings time_zone:", repr(frappe.db.get_single_value("System Settings", "time_zone")))
for row in loc.opening_hours:
    print("opening_hours:", row.day_of_week, row.start_time, row.end_time, "is_open=", row.is_open)

from appointment.api.personal_meet import get_organization_meeting_windows, get_time_slots

windows = get_organization_meeting_windows("p3b-org", "evt-2026-000001")
duration_id = (windows.get("durations") or [{}])[0].get("id")

for offset in range(1, 9):
    date = add_days(nowdate(), offset)
    slots = get_time_slots(
        duration_id=duration_id,
        date=date,
        user_timezone_offset="3",
        organization_id="P3B Org",
        service_id="SRV-2026-0006",
    )
    if isinstance(slots, tuple):
        slots = slots[0]
    all_slots = (slots or {}).get("all_available_slots_for_data") or []
    print(
        "date=%s available_days=%s slot_count=%s first=%s"
        % (date, (slots or {}).get("available_days"), len(all_slots), all_slots[0]["start_time"] if all_slots else None)
    )

frappe.destroy()
