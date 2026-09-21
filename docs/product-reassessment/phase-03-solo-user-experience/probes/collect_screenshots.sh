#!/usr/bin/env bash
# Copy Phase 3 evidence screenshots from Agent Plane's artifact store into the
# committed phase folder with descriptive names. Safe to re-run.
set -euo pipefail
S=/tmp/agent_browser_qa/appointment
D=/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-03/docs/product-reassessment/phase-03-solo-user-experience/screenshots

cp "$S/appointment-p3-provider-day-view-20260921T101759Z/p3-reception-01-today.png" "$D/14-provider-reception-today.png"
cp "$S/appointment-p3-provider-day-view-20260921T101759Z/p3-reception-02-tomorrow.png" "$D/15-provider-reception-tomorrow-empty.png"
cp "$S/appointment-p3-provider-reschedule-complete-noshow-20260921T101812Z/p3-reception-03-edit-modal.png" "$D/16-provider-edit-modal.png"
cp "$S/appointment-p3-provider-reschedule-complete-noshow-20260921T101812Z/p3-reception-04-reschedule-time.png" "$D/17-provider-reschedule-time.png"
cp "$S/appointment-p3-provider-reschedule-complete-noshow-20260921T101812Z/p3-reception-05-after-reschedule.png" "$D/18-provider-reschedule-silent-noop.png"
cp "$S/appointment-p3-provider-complete-appointment-20260921T102529Z/p3-status-01-completed.png" "$D/19-provider-complete-silent-noop.png"
cp "$S/appointment-p3-provider-cancel-appointment-20260921T102414Z/p3-status-02-cancelled.png" "$D/20-provider-cancelled-ok.png"
cp "$S/appointment-p3-provider-availability-change-20260921T102428Z/p3-availability-01-before.png" "$D/21-availability-before.png"
cp "$S/appointment-p3-provider-availability-change-20260921T102428Z/p3-availability-02-location-selected.png" "$D/22-availability-location.png"
cp "$S/appointment-p3-provider-availability-change-20260921T102428Z/p3-availability-03-monday-closed.png" "$D/23-availability-monday-closed.png"
cp "$S/appointment-p3-provider-availability-change-20260921T102428Z/p3-availability-04-saved.png" "$D/24-availability-saved.png"
cp "$S/appointment-p3-customer-slots-after-availability-change-20260921T102952Z/p3-slots-01-after-change.png" "$D/25-customer-slots-after-availability.png"
cp "$S/appointment-p3-customer-booking-mobile-20260921T103128Z/p3-mobile-booking.png" "$D/26-mobile-customer-booking.png"
cp "$S/appointment-p3-provider-reception-mobile-20260921T103200Z/p3-mobile-reception.png" "$D/27-mobile-provider-reception.png"
echo "screenshots collected:"
ls -1 "$D" | sort
