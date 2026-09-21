"""Phase 3 check: what time strings does the reception desk API return?"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("p3-solo-owner@example.test")

from appointment.scheduler.api.desk import get_desk_appointments

result = get_desk_appointments(date="2026-09-21", view="day")
message = result.get("message", result) if isinstance(result, dict) else result
print("message type:", type(message))
if isinstance(message, dict):
    print("message keys:", sorted(message.keys()))
    rows = message.get("appointments") or message.get("data") or []
else:
    rows = message
for row in rows:
    if isinstance(row, dict):
        print(repr(row.get("name")), "start=", repr(row.get("start_time")), "end=", repr(row.get("end_time")), "status=", row.get("status"))
    else:
        print("row:", repr(row)[:200])

frappe.destroy()
