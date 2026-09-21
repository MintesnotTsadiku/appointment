# Phase 3 — bounded evidence follow-up

Continue Phase 3 on review/phase-03-solo-user-experience. Read the revised
analysis.md and evidence-index.md in this folder before doing anything. Do not
start Phase 4, merge, reset the preserved site or implement product fixes.
No broad reassessment, redesign or repeated diagnostic loops are needed.

Keep the original edaccef source baseline and identify your documentation HEAD.
If current product source/runtime has changed, record that difference before
attributing new results. Follow the parent README, Phase 3 prompt, pre-customer
compatibility policy and browser-qa-access.md. There is no customer-data migration
requirement; retained QA access/evidence still needs preservation.

## Why this follow-up is needed

The recorded customer run BQA-2026-00074 removed Booking Event BEV00005 in its
fixture_cleanup before the provider run. The provider's later empty view cannot
prove a missing-booking product defect. The 14:00 diagnostic selected No Show,
not Completed. Time-format and availability probe outputs are missing; the
availability probe does not request slots. Several conclusions therefore exceed
the evidence, despite real onboarding/display/access problems.

## Required bounded checks

1. **Customer-to-provider handoff without intervening cleanup.** Before running,
   establish how the mandated appointment.qa_runner.run lifecycle can preserve
   the booking until both identities have inspected it. Its cleanup removes new
   Booking Events by snapshot, not only the QA-BROWSER prefix. Use supported QA
   facilities; do not silently edit product code, bypass the product entry point,
   call Playwright, recreate a deleted booking as proof of continuity, or disable
   unrelated cleanup. If current tooling cannot support this, document the exact
   blocker rather than repeat the invalid experiment.

   On a clearly labelled downstream scenario, customer books visibly. Record the
   returned record ID, saved date/time/ownership and existence before provider
   inspection. Switch to the actual provider context through a supported method,
   inspect the correct date and relevant schedule surface, and verify the same
   record still exists. If absent from the UI, this is then a valid handoff failure.
   Preserve evidence and clean up only after the observation. Backend reads are
   allowed for verification, not to replace the visible steps.

2. **One focused update diagnosis and the missing lifecycle states.** Capture
   actual desk HTTP start/end strings and form values for the failing morning
   fixture. Check native/custom validation and visible error state, not only
   whether a success toast appears. If the time-format hypothesis is confirmed,
   record the causal evidence; otherwise correct it. Do not conclude all pre-10:00
   appointments fail from one fixture. Verify stored outcomes for reschedule,
   Completed and No Show/cancellation where reachable. A demonstrated failure
   can close a step; unsupported successful coverage cannot. Stop after a decisive
   reproduction instead of retrying unchanged scripts.

3. **One availability propagation check.** Save a closed future weekday through
   the UI, reload or capture the saved configuration, select that exact future
   date as the customer and capture its actual slot response/display. Distinguish
   a calendar marker defect, stale state, timezone interpretation and server-side
   slot enforcement. Do not infer that a forbidden booking succeeds merely from
   an enabled date button. Record the response in redacted synthetic evidence.

4. **Account for the remaining first-use and mobile gaps.** The failed onboarding
   screen visibly offers Skip for now. Briefly check that recovery and whether
   service/link steps become reachable; do not claim a skipped availability step
   was successfully configured. Exercise one availability exception if reachable,
   or document the specific blocked route. Provide the requested decision/screen/
   intervention counts for the tested portion. Repeat the decisive reachable
   booking/schedule interaction at narrow width; a first-screen screenshot is not
   completion of a mobile journey. Signup and external delivery may remain clearly
   marked untested; email stays muted and the scheduler paused.

## QA protocol

Use Agent Plane/Agent Harness via appointment.qa_runner.run. Explicitly verify
least-privileged identities. Use frappe_session as required; investigate the
supported Guest/session path rather than silently substituting auth:none. If it
cannot represent the required public flow, record a protocol blocker for the
coordinator instead of claiming compliance.

Verify capture configuration before a lifecycle replay. The current wrapper/API
path defaults video/timeline arguments false, and some diagnostic manifests set
capture false themselves. Use only supported configuration. If recordings need
a code change outside this assessment's authorization, report the smallest
specific QA-tooling prerequisite; do not change application code or claim traces
are equivalent to video. Preserve existing artifacts and mark missing evidence.

Use only synthetic records on the preserved isolated site. Existing Phase 3
fixtures were cleaned up; recreate exact new fixtures where needed and record
their IDs. Preserve the four retained users and Browser Accounts/Sessions. Keep
credentials/cookies/tokens out of commits and serialize runs. New artifacts and
probe output must be clearly distinct from the original runs.

## Return and acceptance

Update the existing analysis/index into one supported report, with at most five
product findings and a separate tooling-limitations section. Preserve raw
original evidence. Return the branch/commit, new runs/artifact locations, exact
cleanup outcome, revised lifecycle table and any explicit tooling blockers.

No product fix is necessary to finish an assessment: a valid failure or a precise
execution blocker is an acceptable outcome. But the test must not delete the
record it then claims the product lost, and hypotheses must not be presented as
observed root causes. Stop for coordinator review; do not merge or begin Phase 4.
