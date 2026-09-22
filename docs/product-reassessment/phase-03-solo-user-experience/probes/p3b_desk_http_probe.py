"""Phase 3 bounded follow-up — capture actual desk HTTP time strings.

Opens a server-side provider session and calls the reception desk API over HTTP
(the same endpoint the browser uses), printing the raw JSON start/end strings for
the P3B appointments. Redacted synthetic data only.
"""

import json

import frappe
import requests

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
BASE = "http://127.0.0.1:49511"
SOLO = "p3b-solo-owner@example.test"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

DATE = frappe.utils.nowdate()
print("System Settings time_zone:", repr(frappe.db.get_single_value("System Settings", "time_zone")))
from frappe.utils import get_system_timezone

print("frappe get_system_timezone():", repr(get_system_timezone()))

# Use the user's API token for an authenticated HTTP call (token values are never
# printed). This exercises the same desk endpoint the browser calls.
user_doc = frappe.get_doc("User", SOLO)
if not user_doc.api_key or not user_doc.api_secret:
    user_doc.api_key = frappe.generate_hash(length=15)
    user_doc.api_secret = frappe.generate_hash(length=15)
    user_doc.save(ignore_permissions=True)
    frappe.db.commit()
headers = {"Authorization": "token %s:%s" % (user_doc.api_key, user_doc.get_password("api_secret"))}

sid = None
print("session user:", SOLO, "token_ready:", bool(user_doc.api_key))

response = requests.get(
    f"{BASE}/api/method/appointment.scheduler.api.desk.get_desk_appointments",
    params={"date": DATE, "view": "day"},
    headers=headers,
    timeout=30,
)
print("HTTP status:", response.status_code)
print("content-type:", response.headers.get("content-type"))
payload = response.json()
message = payload.get("message", payload)
appointments = message.get("appointments", []) if isinstance(message, dict) else []
print("appointment count:", len(appointments))
for row in appointments:
    if not str(row.get("name", "")).startswith("P3B-"):
        continue
    print(
        "name=%s start_time=%r end_time=%r status=%r"
        % (row.get("name"), row.get("start_time"), row.get("end_time"), row.get("status"))
    )

print("RAW_JSON_FIRST_APPOINTMENTS=" + json.dumps(appointments[:4]))

frappe.destroy()
