#!/usr/bin/env bash
# Copy Phase 3 follow-up (P3B) evidence into the committed phase folder.
set -euo pipefail
S=/tmp/agent_browser_qa/appointment
D=/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-03/docs/product-reassessment/phase-03-solo-user-experience

# screenshots
cp "$S/appointment-p3b-handoff-booking-20260921T201938Z/p3b-handoff-01-booking-confirmed.png" "$D/screenshots/p3b-01-handoff-booking-confirmed.png"
cp "$S/appointment-p3b-handoff-provider-reception-20260921T202005Z/p3b-handoff-03-reception-booked-date.png" "$D/screenshots/p3b-02-handoff-reception-booked-date.png"
cp "$S/appointment-p3b-handoff-provider-calendar-20260921T202016Z/p3b-handoff-04-calendar.png" "$D/screenshots/p3b-03-handoff-calendar.png"
cp "$S/appointment-p3b-update-morning-status-20260921T200159Z/p3b-upd-01-morning-modal.png" "$D/screenshots/p3b-04-update-morning-modal.png"
cp "$S/appointment-p3b-update-morning-status-20260921T200159Z/p3b-upd-02-morning-after-submit.png" "$D/screenshots/p3b-05-update-morning-after-submit.png"
cp "$S/appointment-p3b-update-afternoon-reschedule-20260921T200222Z/p3b-upd-03-afternoon-reschedule.png" "$D/screenshots/p3b-06-update-afternoon-reschedule.png"
cp "$S/appointment-p3b-update-afternoon-noshow-20260921T200659Z/p3b-upd-05-afternoon-noshow.png" "$D/screenshots/p3b-07-update-afternoon-noshow.png"
cp "$S/appointment-p3b-availability-close-wednesday-20260921T202225Z/p3b-avail-02-wednesday-closed.png" "$D/screenshots/p3b-08-availability-wednesday-closed.png"
cp "$S/appointment-p3b-availability-close-wednesday-20260921T202225Z/p3b-avail-04-after-reload.png" "$D/screenshots/p3b-09-availability-after-reload.png"
cp "$S/appointment-p3b-customer-closed-day-20260921T202404Z/p3b-closed-01-slot-panel.png" "$D/screenshots/p3b-10-customer-closed-day-slots.png"
cp "$S/appointment-p3b-customer-closed-day-20260921T202404Z/p3b-closed-02-booking-confirmed.png" "$D/screenshots/p3b-11-customer-closed-day-booked.png"
cp "$S/appointment-p3b-onboarding-skip-recovery-20260921T202602Z/p3b-onb-01-step3-availability.png" "$D/screenshots/p3b-12-onboarding-step3.png"
cp "$S/appointment-p3b-onboarding-skip-recovery-20260921T202602Z/p3b-onb-02-after-skip.png" "$D/screenshots/p3b-13-onboarding-after-skip.png"
cp "$S/appointment-p3b-onboarding-skip-recovery-20260921T202602Z/p3b-onb-03-success.png" "$D/screenshots/p3b-14-onboarding-create-service-error.png"
cp "$S/appointment-p3b-mobile-booking-20260921T202656Z/p3b-mobile-01-slots.png" "$D/screenshots/p3b-15-mobile-slots.png"
cp "$S/appointment-p3b-mobile-booking-20260921T202656Z/p3b-mobile-03-confirmed.png" "$D/screenshots/p3b-16-mobile-confirmed.png"

# compact reports
cp "$S/appointment-p3b-handoff-booking-20260921T201938Z/report.json" "$D/traces/p3b-handoff-booking-report.json"
cp "$S/appointment-p3b-handoff-exists-before-inspection-20260921T201959Z/report.json" "$D/traces/p3b-handoff-exists-report.json"
cp "$S/appointment-p3b-handoff-provider-reception-20260921T202005Z/report.json" "$D/traces/p3b-handoff-reception-report.json"
cp "$S/appointment-p3b-handoff-provider-calendar-20260921T202016Z/report.json" "$D/traces/p3b-handoff-calendar-report.json"
cp "$S/appointment-p3b-update-morning-status-20260921T200159Z/report.json" "$D/traces/p3b-update-morning-report.json"
cp "$S/appointment-p3b-update-afternoon-reschedule-20260921T200222Z/report.json" "$D/traces/p3b-update-afternoon-report.json"
cp "$S/appointment-p3b-update-afternoon-noshow-20260921T200659Z/report.json" "$D/traces/p3b-update-noshow-report.json"
cp "$S/appointment-p3b-availability-close-wednesday-20260921T202225Z/report.json" "$D/traces/p3b-availability-report.json"
cp "$S/appointment-p3b-customer-closed-day-20260921T202404Z/report.json" "$D/traces/p3b-customer-closed-report.json"
cp "$S/appointment-p3b-onboarding-skip-recovery-20260921T202602Z/report.json" "$D/traces/p3b-onboarding-skip-report.json"
cp "$S/appointment-p3b-mobile-booking-20260921T202656Z/report.json" "$D/traces/p3b-mobile-report.json"
cp "$S/appointment-p3b-guest-session-check-20260921T194520Z/report.json" "$D/traces/p3b-guest-session-report.json"

echo "screenshots with p3b prefix:"
ls -1 "$D/screenshots" | grep '^p3b-' | sort
echo "traces with p3b prefix:"
ls -1 "$D/traces" | grep '^p3b-' | sort
