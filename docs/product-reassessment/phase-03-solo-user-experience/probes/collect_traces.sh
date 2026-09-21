#!/usr/bin/env bash
# Copy compact Agent Harness report.json and DOM snapshots into the committed
# phase traces/ folder. Video and raw trace.zip stay in the Agent Plane store
# because they are large; see evidence-index.md for their locations.
set -euo pipefail
S=/tmp/agent_browser_qa/appointment
R=/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-03/docs/product-reassessment/phase-03-solo-user-experience/traces

cp "$S/appointment-p3-solo-identity-check-20260921T094929Z/report.json" "$R/a-trial-report.json"
cp "$S/appointment-p3-solo-onboarding-individual-20260921T095156Z/report.json" "$R/b-onboarding-report.json"
cp "$S/appointment-p3-solo-onboarding-individual-20260921T095156Z/p3-onb-07-after-step3-submit.html" "$R/b-onboarding-after-step3-dom.html"
cp "$S/appointment-p3-customer-public-booking-20260921T095814Z/report.json" "$R/c-booking-report.json"
cp "$S/appointment-p3-customer-public-booking-20260921T095814Z/p3-book-04-confirmation.html" "$R/c-booking-confirmation-dom.html"
cp "$S/appointment-p3-provider-day-view-20260921T101759Z/report.json" "$R/d-day-view-report.json"
cp "$S/appointment-p3-provider-reschedule-complete-noshow-20260921T101812Z/report.json" "$R/d-reschedule-report.json"
cp "$S/appointment-p3-provider-status-submit-diagnostic-20260921T100532Z/report.json" "$R/d2-status-submit-report.json"
cp "$S/appointment-p3-provider-noshow-on-assefa-20260921T102721Z/report.json" "$R/d3-noshow-assefa-report.json"
cp "$S/appointment-p3-provider-complete-appointment-20260921T102529Z/report.json" "$R/e-complete-report.json"
cp "$S/appointment-p3-provider-cancel-appointment-20260921T102414Z/report.json" "$R/e-cancel-report.json"
cp "$S/appointment-p3-provider-availability-change-20260921T102428Z/report.json" "$R/e-availability-report.json"
cp "$S/appointment-p3-customer-slots-after-availability-change-20260921T102952Z/report.json" "$R/f-slots-report.json"
cp "$S/appointment-p3-customer-slots-after-availability-change-20260921T102952Z/p3-slots-01-after-change.html" "$R/f-slots-dom.html"
cp "$S/appointment-p3-customer-booking-mobile-20260921T103128Z/report.json" "$R/g-mobile-customer-report.json"
cp "$S/appointment-p3-provider-reception-mobile-20260921T103200Z/report.json" "$R/h-mobile-provider-report.json"
echo "traces collected:"
ls -1 "$R" | sort
