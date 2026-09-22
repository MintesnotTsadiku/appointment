"""Phase 3 follow-up — inspect the public slot response for the P3B scenario."""

import frappe
from frappe.utils import add_days, nowdate

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

from appointment.api.personal_meet import get_organization_meeting_windows, get_time_slots

windows = get_organization_meeting_windows("p3b-org", "evt-2026-000001")
duration_id = (windows.get("durations") or [{}])[0].get("id")
print("duration_id:", duration_id)
print("server nowdate():", nowdate())

for offset in range(-1, 8):
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
    first = all_slots[0]["start_time"] if all_slots else None
    print(
        "date=%s available_days=%s slot_count=%s first=%s"
        % (date, (slots or {}).get("available_days"), len(all_slots), first)
    )

frappe.destroy()
