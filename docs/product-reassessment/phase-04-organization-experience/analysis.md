# Phase 4 — Organization, administrator, reception and provider experience

Baseline: `edaccef62bb082b3ef02833eaca00f2505f5ed00`.
Branch: `review/phase-04-organization-experience`.
Evidence: [evidence-index.md](evidence-index.md).

**Recommendation: accept the bounded assessment with the qualifications below;
do not approve organization beta.** Existing appointment updates work, but the
calendar date-range query and email-less walk-in assignment have verified
failures. Setup guidance and staff management are incomplete. Reception creation
failed in automation; its exact interaction failure remains an inference.
No evidence establishes that a rewrite would cost less than repair.

No real customers or customer data exist. Do not preserve legacy formats or
prescribe migrations/backfills for disposable records. Marketing aspirations
remain; delivery must satisfy Phase 1's launch requirements. No product source,
schema or runtime configuration was changed during this review.

## Baseline and evaluation boundaries

Phase 4 started before Phase 3 was merged, contrary to its explicit prerequisite.
The agent read the reviewed Phase 3 documentation at `e8a39c8`, but reading it is
not the same as satisfying the gate. This is a sequencing deviation. The source
baseline did not change, so it does not invalidate these observations. Accept and
merge reviewed Phase 3 first, then reviewed Phase 4; do not start Phase 5 merely
because its prompt is available.

The bench symlink targets readiness at `3c57fb4`, but coordinator inspection of
`appointment.__file__` loads the beta worktree at `edaccef`. The symlink alone
was insufficient to identify the Python source. The `appointment/` and `frontend/`
source trees have no differences between those commits; docs/configuration
history differs. This qualification replaces the claim that the symlink proved
the loaded package. The preserved site was not reset or migrated.

Browser runs used the retained Organization Manager, Front-Desk and Provider
identities via `appointment.qa_runner.run` → Agent Plane → Agent Harness.
Administrator prepared downstream fixtures; those are not successful manager
setup or reception-to-provider handoffs. Coordinator verification inspected saved
screenshots, response traces and source, reproduced the date-filter exception
with a read-only query, and completed exact orphan cleanup. It did not rerun a
broad browser assessment.

## Lifecycle coverage

| Step | Supported result | Limit |
|---|---|---|
| Manager creates organization | UI submission succeeds and returns dashboard | Dashboard shows an incomplete setup checklist |
| Two services/providers/locations, rules and staff | Manage offers service/location controls; downstream records supplied by fixture | Complete manager setup not demonstrated; visible controls alone are not successful saves |
| Correct configuration; reload/new login | Organization persists across runs | No actual configuration correction was demonstrated |
| Reception creates appointment | Automated form loses text input and submits with required-field errors | No create request; typing/human reproduction not established |
| Reception queues/assigns walk-in | Queue creation succeeds; email-less assignment returns 500 and page becomes blank | Assignment not completed |
| Reception reschedules/cancels/completes | All three mutations succeed; later reads return the saved time/status | Existing seeded Appointment records, not new reception bookings |
| Provider finds assigned work | Calendar date-range request returns empty after a query exception | Customer detail view blocked; not proof all query modes fail |
| Provider changes availability | Settings surface renders | Save/reload verification not completed |
| Provider completes work | Provider completes its own fixture through reception surface | Awkward navigation; not by itself unauthorized access |
| Manager workload/audit/staff removal | Team controls are placeholders; dashboard activity exists | No complete staff disable/revocation or historical audit journey |
| Organization switching | Source contains a selector in Manage for multiple organizations | Only one organization used; switching untested |
| Role boundary checks | All three roles receive 403 from `admin_stats` | One site-admin boundary; does not certify tenant or staff permissions |
| Mobile | Reception shows appointments/queue; provider calendar renders empty | Screenshots show cramped/overflowing header; no complete mobile lifecycle |

## Five prioritized findings

### F1. Organization setup switches journeys before the promised next step

- **Finding:** Clicking “Next: Add Providers” creates the organization and exits
  the wizard. The dashboard shows an incomplete checklist, but its action-link
  contract does not match the API response.
- **Why it matters:** The next screen contradicts the button's promise. The
  alternative setup guidance cannot reliably lead the manager to missing steps.
- **Evidence:** BQA-2026-00096 screenshot `p4-mgr-04-after-org-save.png` shows
  “Setup Checklist — 3/7 complete”, not an absent checklist. `onboarding.py:189-214`
  marks organization owners onboarding-complete. The saved
  `get_detailed_checklist` response has `action_url`; `SetupChecklist.tsx:22,305-314`
  expects `actionUrl` and conditionally renders its button. `route.tsx` also does
  not define the returned `/settings/providers` or `/settings/locations` paths
  (the location route is singular). See `probes/outputs/p4c-trace-summary.json`.
- **Action:** improve now. Choose a coherent resumable wizard or checklist,
  align progress and button wording, and make each remaining task reachable and
  verifiably savable. A dashboard-based setup is valid; preserving the wizard is
  not mandatory. Do not claim all configuration is impossible: Manage and
  service/location settings exist, and provider-creation code also exists.
- **Timing:** before organization beta.

### F2. Calendar date-range queries return an empty success after failing

- **Finding:** Supplying both start and end dates builds an invalid four-element
  filter; the exception handler returns an empty appointment list.
- **Why it matters:** A provider sees an apparently empty schedule instead of
  work or an actionable error.
- **Evidence:** BQA-2026-00103/00105 screenshots and saved calendar response;
  `dashboard.py:424-429,515-519`. Coordinator read-only reproduction in
  `probes/outputs/p4c-filter-result.json` raises `ValueError: too many values to
  unpack (expected 2, got 4)` for the current filter; the supported `between`
  control succeeds on the empty site. Source plus this reproduction establish
  the mechanism without relying on an uncopied Error Log/probe output.
- **Action:** improve now. Correct the range query and distinguish an error from
  a genuinely empty schedule. Verify assigned records through the calendar.
  This is distinct from Phase 3's Booking Event versus Appointment split;
  correcting this query does not by itself connect public bookings to the list.
- **Timing:** before beta for calendar users.

### F3. Reception booking creation failed to retain text in the tested interaction

- **Finding:** The automated New Appointment flow ends with empty name/phone
  fields, “Required” errors and no creation request despite successful fill actions.
- **Why it matters:** Booking creation is not validated as a usable reception
  workflow. A passing fill action does not establish that the form retained input.
- **Evidence:** BQA-2026-00099/00100; `p4-rec-02-create-filled.png` and
  `p4-rec-03-created.png`. `CreateAppointmentModal.tsx:140-179` defines an input
  component inside the parent; focus/blur and input changes update parent state,
  changing the nested component's identity. This supports a remount/focus-loss
  mechanism but does not prove why every automated fill was lost. Selects also
  use a nested component, so their success does not isolate the mechanism.
- **Action:** improve now: resolve this observed interaction failure and verify
  persisted creation with normal keyboard input. Stabilizing field identity is
  a justified candidate repair, not a proven complete fix. Do not conclude no
  receptionist can ever book from this automated outcome alone.
- **Timing:** before reception beta; successful creation remains an acceptance gap.

### F4. Email-less walk-in assignment fails and the error display crashes

- **Finding:** The optional-email queue form accepts a walk-in, but assignment
  copies an empty email into a mandatory Appointment field, returns 500, and
  leaves a blank page with a toast-layer React error.
- **Why it matters:** The accepted walk-in cannot advance, and reception loses
  the working screen. No evidence is needed about how common this case is to
  establish the inconsistency.
- **Evidence:** BQA-2026-00102, `p4-rec-06-walkin-assigned.png`, its network and
  console reports, and the saved response in `p4c-trace-summary.json` naming
  `client_email`. `desk.py:854` copies `walk_in.client_email or ""`;
  `scheduler/doctype/appointment/appointment.json` requires the field.
- **Action:** improve now. Make contact requirements consistent across queue and
  assignment. Prefer allowing an honest missing-email state where walk-ins do
  not need email; if email is a genuine business requirement, explain and validate
  it before acceptance. Do not invent placeholder customer email addresses.
  Render a safe textual error while preserving the queue and operator context.
- **Timing:** before walk-in beta.

### F5. The organization staff lifecycle is not available in the tested product UI

- **Finding:** Team Management advertises future invitation/role capabilities;
  no complete add, disable, revoke and verify staff-access journey was shown.
  Workload and historical change review were not established.
- **Why it matters:** A manager needs to operate a team and remove access safely,
  not rely on console setup or assumed permission boundaries.
- **Evidence:** BQA-2026-00098 team screenshot and `settings/team.tsx:315-324`;
  disabled invitation controls. Provider completion trace records its own
  `P4-APT-WORKLOAD` appointment as Completed, with `modified_by` attribution.
  Standard attribution therefore exists; absent `track_changes` does not mean
  there is no accountability anywhere in Frappe. Provider-creation API
  `onboarding.add_organization_provider` and its wizard component also exist.
  Manage includes a multi-organization selector at `index.tsx:378`; switching
  was not exercised. The tested provider's use of reception does not prove an
  authorization violation, though Phase 2's actual access failures still apply.
- **Action:** improve now for multi-staff launch: provide a usable staff-access
  workflow and verify revocation, scoped work lists and sufficient history of
  material changes. Preserve permitted shared staff actions rather than requiring
  different pages merely because roles have different names. This feature may
  be deferred only if the owner explicitly chooses a solo-only beta; Phase 4
  does not silently narrow beta scope.
- **Timing:** before organization beta; no blanket single-staff release approval.

## Strengths and clean-start recommendation

Keep the working profile save, service/location management entry points, reception
work list, and verified reschedule/cancel/complete behavior. Keep the tested
server-side site-admin refusal while repairing the broader Phase 2 boundaries.
Mobile content is present, but header overflow and incomplete interaction testing
prevent calling the mobile reception experience ready.

A clean organization experience should get one service, provider and location
bookable, then add staff and additional business structure as needed. Either a
resumable wizard or a dashboard checklist can support this. Work lists must show
real assigned work, contact requirements must agree across entry points, and
operators must recover from errors without losing their screen. A separate
provider-only completion page is not a requirement if a shared, correctly scoped
work surface is understandable.

Correct the confirmed query, setup-contract and walk-in inconsistencies; resolve
reception input handling; then establish the staff lifecycle and verify the
whole workflow. These are bounded repair directions, not cost estimates. Staff
ownership, authorization and audit changes may span the application. No
comparative evidence justifies discarding the foundation, and no compatibility
requirement forces preserving its current internal model.

## Limits, cleanup and disposition

Video/timeline capture remains unavailable through the current wrapper invocation;
Phase 4 manifests request it, but reports have null video artifacts. Screenshots
and saved network data support this assessment without satisfying the recording
requirement. BQA-00097 remains a killed/stale run, not a pass. Reused screenshot
names can represent retries; use the timestamped reports to identify the attempt.

The agent's cleanup directly deleted parent records using prefixes; its normal
delete helper was never called. Zero parent counts concealed 38 orphan children
and one default for the deleted disposable user. Coordinator cleanup removed
only those exact audited rows after checking parent absence. The post-audit has
zero targeted orphans/defaults, no disposable-user auth/sessions, ten empty
business tables, and all four retained QA users/Browser Accounts/Sessions.
Email remains muted and the scheduler paused. Raw evidence is preserved.

The remaining unexecuted journeys are explicit: full manager configuration and
correction, staff revocation, organization switching, provider availability save,
and complete mobile operation. These cannot be labelled passes. The documented
failures and precise coverage limits are enough to accept a bounded Phase 4
assessment without another broad agent loop. Merge Phase 3 before Phase 4 and
obtain acceptance before Phase 5. Neither assessment acceptance nor the partial
working strengths authorize customer launch.
