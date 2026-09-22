"""Phase 5 probe: does a competing booking remove the slot from availability?

Read/verify probe only. Creates no durable product records: it uses the existing
disposable qa_fixtures and tears them down at the end. Prints observed slot
availability before and after a competing booking.
"""

from __future__ import annotations

import json

import frappe
from frappe.utils import add_days, nowdate


def main():
    import os

    site = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
    if not getattr(frappe.local, "site", None):
        os.chdir("/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench/sites")
        frappe.init(site=site, sites_path=".")
        frappe.connect()
    frappe.set_user("Administrator")
    from appointment import qa_fixtures
    from appointment.api.personal_meet import (
        book_time_slot,
        get_organization_meeting_windows,
        get_time_slots,
    )

    state = qa_fixtures.setup()
    values = qa_fixtures.fixture_values()

    def first(r):
        return r[0] if isinstance(r, tuple) else r

    windows = first(get_organization_meeting_windows(values["qa_org_slug"], values["qa_service_slug"]))
    duration_id = (windows.get("durations") or [{}])[0].get("id")
    org_id = windows.get("organization_id")
    service_id = windows.get("service_id")
    date = add_days(nowdate(), 1)

    def slots():
        s = first(get_time_slots(duration_id=duration_id, date=date, user_timezone_offset="180",
                                 organization_id=org_id, service_id=service_id))
        return s.get("all_available_slots_for_data") or []

    before = slots()
    first_slot = before[0]
    print("DATE", date)
    print("FIRST_SLOT_BEFORE", first_slot.get("start_time"), first_slot.get("end_time"),
          "booked=", first_slot.get("booked"), "available=", first_slot.get("available"))

    resp = first(book_time_slot(
        duration_id=duration_id, date=date,
        start_time=first_slot["start_time"], end_time=first_slot["end_time"],
        user_timezone_offset="180", user_name="P5 Probe Competing",
        user_email="p5-probe-competing@example.test",
        organization_id=org_id, service_id=service_id,
        provider_id=(first_slot.get("provider") or values["qa_provider_id"]), time_format="12h",
    ))
    resp = resp or {}
    print("COMPETING_BOOKING_EVENT", resp.get("event_id"))

    after = slots()
    same = [s for s in after if s.get("start_time") == first_slot.get("start_time")]
    print("SAME_SLOT_PRESENT_AFTER", bool(same))
    if same:
        s = same[0]
        print("SAME_SLOT_AFTER", "booked=", s.get("booked"), "available=", s.get("available"),
              "conflicts=", json.dumps(s.get("conflicts"))[:300])
    # Diff the booked flags to see which slot the write actually marked.
    before_map = {s.get("start_time"): bool(s.get("booked")) for s in before}
    after_map = {s.get("start_time"): bool(s.get("booked")) for s in after}
    changed = [(k, before_map.get(k), after_map.get(k)) for k in after_map
               if before_map.get(k) != after_map.get(k)]
    print("CHANGED_SLOTS", json.dumps(changed))
    # Count non-booked slots before/after
    print("AVAILABLE_BEFORE", len([s for s in before if not s.get("booked")]))
    print("AVAILABLE_AFTER", len([s for s in after if not s.get("booked")]))

    removed = qa_fixtures.teardown()
    print("CLEANUP_REMOVED", len(removed.get("removed", [])), "records")


if __name__ == "__main__":
    main()
