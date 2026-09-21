# Phase 4 — Organization, administrator, reception and provider experience

Source baseline: `edaccef62bb082b3ef02833eaca00f2505f5ed00` (`origin/develop`).
Branch: `review/phase-04-organization-experience`.

Runtime: preserved isolated site
`meet-beta-fix-appointment-beta-readiness-01dea7.localhost`, frontend
`http://localhost:49510`. The bench `appointment` symlink resolves to
`.../.worktrees/frappe-appointment-readiness` @ `3c57fb4` (unchanged); no
migration or reset was performed. Email muted, scheduler paused. Evidence is in
[evidence-index.md](evidence-index.md).

**Recommendation: accept this bounded assessment; the organization workflow is
not ready for beta and is further from a solo-complete workflow than the solo
experience.** The manager can create an organization, but the guided setup
silently ends after the first step; the provider's schedule does not show their
assigned work; reception cannot create a booking, and assigning a walk-in
without an email fails with HTTP 500 and a blank screen. Rescheduling,
cancelling and completing existing appointments through the reception surface
do work. The evidence supports repairing the existing foundation, not a rewrite.

No real customers or customer data exist. Recommendations carry no legacy-data
migration or backward-compatibility obligation; seed/test records need not be
preserved. This phase changes documentation and QA evidence only.

## Precondition status (observed)

The Phase 4 prompt says to start only after Phase 3's reviewed documentation is
merged into `origin/develop`. At the baseline commit Phase 1 and Phase 2
documentation are on `origin/develop`; the reviewed Phase 3 folder
(`phase-03-solo-user-experience/`) is **not** in `origin/develop` and exists on
`origin/review/phase-03-solo-user-experience` (`e8a39c8`). This phase therefore
branched from `origin/develop` as instructed, read the reviewed Phase 1–3
documents from the Phase 3 branch, and treated the missing merge as an
unresolved coordination item rather than silently fabricating a merged state.

## What was tested and what is a fixture

Accounts were the retained least-privileged QA identities
(`browser-qa-access.md`): manager (`Organization Manager`), reception
(`Front-Desk`), provider (`Provider`). Administrator was used only to prepare
downstream fixtures and read back records, never as proof that staff can do
their work. All browser runs used `appointment.qa_runner.run` → Agent Plane →
Agent Harness; no direct Playwright and no API substitution for user steps.

The manager's real onboarding run created `P4 Organization`
(`owner_user = appointment-review-manager@…`) through the visible wizard
(BQA-2026-00096, `save_organization_profile` HTTP 200). It could not continue
(see F1), so the downstream provider/service/location/appointment records were
prepared by an Administrator **fixture** (`probes/p4_fixture_probe.py`) and are
explicitly labelled a downstream fixture scenario, **not** successful UI
onboarding.

| Lifecycle step | Supported outcome | Limit |
|---|---|---|
| Manager creates/selects organization | Created via visible wizard | — |
| Add 2 services, 2 providers, 2 locations, schedules, booking rules, staff access | **Blocked in the wizard**; services/locations manageable via Settings → Manage | Wizard unreachable after Step 1 (F1); provider/staff creation has no UI |
| Correct a setup mistake; reload and re-login | Reload after org creation returns the dashboard, not Step 2 | Saved state is "onboarding complete" (F1) |
| Reception books a booking | **Not created** through New Appointment modal (F3) | Client Name reported "Required" despite entry |
| Reception handles/assigns a walk-in | Walk-in queues, **assignment HTTP 500 + blank screen** (F4) | Assignment blocked |
| Reception reschedules | Saved (11:00 → 15:00), `update_appointment` 200 | — |
| Reception cancels | Saved, `update_appointment` 200 | — |
| Reception completes/closes visit | Saved, `update_appointment` 200 | — |
| Provider finds assigned work | `get_appointments` 200 but returns empty (F2) | Calendar shows no appointments |
| Provider inspects customer context | Fixture appointment context reachable only after fixing F2; detail modal is read-only | Not reached in the failing run |
| Provider changes availability | `/settings/availability` renders (provider tab); service-provider load logs an access error | Full save not exercised |
| Provider completes appointment | **No provider action exists**; provider used the reception surface and it succeeded (F5) | Role separation gap |
| Manager reviews activity/workload/audit | Dashboard Recent Activity renders; no staff workload or audit page | Derived feed only, fabricates when empty |
| Manager removes/disables staff | **No control or API** (F5) | Team page is a placeholder |
| Organization switching | No global switcher; appears only when a user has >1 organization | Single-organization manager sees none |
| Out-of-authority action (per role) | `/admin/dashboard` → HTTP 403 for manager, reception and provider | Correct soft/hard refusal |

Mobile (390×844): the reception day view renders real appointments and the
walk-in queue (`p4-rec-mobile-01-today.png`) but the `reception-heading` is
hidden and filter/header controls overflow horizontally. The provider mobile
calendar renders but is empty for the same F2 reason.

## Five prioritized findings

### F1. The guided organization setup silently completes after Step 1

- **Finding:** `get_progress` returns `onboarding_complete: True` as soon as the
  session user owns an organization, so reloading after creating the
  organization shows the Dashboard and the remaining wizard steps (providers,
  hours, services, booking links) become unreachable.
- **Why it matters:** A business cannot finish configuring its organization
  through the journey the product presents. The advertised "guided onboarding"
  stops exactly where the organization's providers, services and hours begin.
- **Evidence:** BQA-2026-00096 (`p4-mgr-04-after-org-save.png`;
  `save_organization_profile` 200) followed by BQA-2026-00098
  `p4_mgr_home`/`p4-mgr-13-home-dashboard.png`, which is the dashboard, not
  Step 2. Code: `appointment/onboarding.py:189-214` returns
  `onboarding_complete: True` for any organization owner; the inline comment
  says "Mark onboarding as complete so they see dashboard instead of wizard."
- **Action:** improve now — gate auto-complete on the organization's required
  setup (at least one provider/service/location) or keep the wizard reachable
  after creation, and expose a resume path.
- **Timing:** before beta.

### F2. The provider's schedule never shows assigned appointments

- **Finding:** `dashboard.get_appointments` builds `filters["appointment_date"]`
  as a four-element list (`[">=", start, "<=", end]`), which raises
  "too many values to unpack (expected 2, got 4)"; the exception is swallowed
  and the API returns an empty list, so both desktop and mobile provider
  calendars are blank for 4 appointments linked to that provider.
- **Why it matters:** Providers cannot find, open or act on their work, so the
  provider half of every booking is lost regardless of who created it.
- **Evidence:** BQA-2026-00103 `p4_prov_calendar` — `dashboard.get_appointments`
  returned 200 with a 31-byte body; `p4-prov-01-calendar.png` and
  `p4-prov-mobile-01-calendar.png` show no appointments. Error Log
  `Calendar: Get Appointments Error` = "too many values to unpack (expected 2,
  got 4)". Backend reproduction (`probes/p4_provider_check_probe.py`): 4
  appointments linked to `P4 Provider One`, yet the provider session returns
  `{"appointments": []}`. Code: `appointment/dashboard.py:424-429` and
  `:515-519`.
- **Action:** improve now — use a supported date-range filter, do not swallow
  the exception into an empty success, and return an explicit error. This is the
  Phase 3 F2 booking-visibility defect reproduced from the provider side.
- **Timing:** before beta.

### F3. Reception cannot create a booking through the New Appointment modal

- **Finding:** Filling the "New Appointment" modal and submitting produced
  Client Name "Required" and no `create_desk_appointment` request; the modal
  stayed open.
- **Why it matters:** The primary reception task — booking a customer — is not
  completable, so walk-ins and phone bookings cannot be entered.
- **Evidence:** BQA-2026-00100 — all actions reported ok, but the post-submit
  DOM (`p4-rec-03-created.png` / report) shows Client Name empty `value=""`
  with "Required" and no create request. `p4-rec-02-create-filled.png` shows the
  selects retained values while the three text fields are empty.
  **Supported inference (root cause, not proven):**
  `CreateAppointmentModal.tsx:140-179` declares `InputField` inside the
  component and `onFocus`/`onBlur` call `setActiveField`, remounting the input
  during interaction; the selects (`SelectField`) retained values.
  **Unresolved:** a human-user reproduction was not separately observed.
- **Action:** improve now — hoist the field components out of render, keep
  field state stable, and add a booking-creation test. Treat the blank
  client-name retention as a defect regardless of automation.
- **Timing:** before beta.

### F4. Assigning a walk-in without an email fails with HTTP 500 and crashes the UI

- **Finding:** A walk-in created through the visible form with no email queues
  correctly, but "Assign to Slot" returns HTTP 500; the SPA throws a React
  error in the toast layer and renders a near-blank page.
- **Why it matters:** Walk-in handling — a headline organization capability —
  dies in the most common case (a walk-in who did not give an email), and the
  operator is left with a blank screen rather than an explanation.
- **Evidence:** BQA-2026-00101/00102 (`p4-rec-05-walkin-queued.png`,
  `p4-rec-06-walkin-assigned.png` is ~6.7 KB/blank). Network
  `assign_walk_in_to_slot` → 500; console React error in `Toaster`. Error Log
  "Desk API: Assign Walk-In Error" = `[Appointment, APT-…]: client_email`.
  Code: `appointment/scheduler/api/desk.py:854` sets
  `appointment.client_email = walk_in.client_email or ""`, while
  `Appointment.client_email` is `reqd: 1`; `Walk In.client_email` is optional in
  the form (`AddWalkInModal.tsx:174-190`).
- **Action:** improve now — make email optional on the created Appointment or
  enforce/derive a placeholder at the walk-in step, surface the validation
  error, and stop the UI crash. Add a walk-in→appointment test.
- **Timing:** before beta.

### F5. No staff-access, audit or role-separation surface for organizations

- **Finding:** Managers cannot add, disable or remove staff and cannot assign
  roles; there is no workload or audit-history page; and a Provider can open the
  reception surface and complete appointments, which is the only completion
  path available.
- **Why it matters:** The organization model promises reception/provider/admin
  separation that does not exist in the product, and there is no accountable
  history of who changed what — a precondition for real multi-staff beta use.
- **Evidence:** BQA-2026-00098 `p4_mgr_team` DOM shows "Team Management … Coming
  Soon" and no invite/remove/disable control (`p4-mgr-15-settings-team.png`).
  BQA-2026-00103 `p4_prov_reception_complete` passed: the Provider completed
  `P4 Workload Client` through `/reception` (`p4-prov-04-completed-via-reception.png`).
  Code: no staff/role API in `onboarding.py`/`api/`; `appointment/hooks.py`
  permission_query_conditions commented out; `track_changes` absent on
  Organization/Provider/Service/Location/Appointment/Walk In.
- **Action:** accept temporarily for a single-staff beta; improve now before any
  multi-staff organization is onboarded — a minimal staff/role step plus basic
  attribution on booking changes.
- **Timing:** before organizational customer launch.

## Working strengths to preserve

- The organization profile step creates a valid organization and reuses existing
  ownership correctly (`save_organization_profile` 200; slug generated).
- Settings → Manage is a real organization surface: it shows the organization's
  providers, services and locations and offers Add Service / Add Location
  controls (`p4-mgr-14-settings-manage.png`).
- Settings → Location lists and offers to add locations.
- The reception day view (desktop and — content-wise — mobile) renders real
  appointments with time, client and status (`p4-rec-01-today.png`,
  `p4-rec-mobile-01-today.png`).
- Reschedule, cancel and complete through the reception edit modal all saved
  successfully with correct request payloads (BQA-2026-00099).
- System-Manager-only surfaces are refused server-side (HTTP 403) for every
  tested least-privileged role.

## Clean-start comparison and least expensive safe path

A clean organization flow asks for the organization, then reveals one
provider, then the services that provider offers, then the location(s), and
keeps staff/permissions as an explicit later step; the organization is not
declared "set up" until at least one bookable service exists. Every confirmed
booking appears in one work list, and the person who delivers the work owns the
completion action. The current product instead completes onboarding after the
first field, hides the provider's list, and routes completion through reception.

Least expensive safe path (no rewrite): (1) fix the two small query/state bugs
(F1 completion gate, F2 date-range filter) — low implementation and verification
cost, high recovered behavior; (2) make reception booking and walk-in assignment
work (F3, F4) — moderate, localized to two modals and one API; (3) add a minimal
staff/role step and basic attribution (F5) — larger, but the least costly step
that makes an organization truthful. Preserve the wizard, the Manage surface,
the reception lifecycle and the status model; nothing found here shows that
discarding the current foundation would be cheaper than these repairs.

## What required internal product knowledge

- Knowing that the wizard silently self-completes and that services/locations
  must be added from Settings → Manage.
- Knowing that staff/provider linkage is stored on the legacy
  `Provider.organization` field while other readers expect the hidden
  `Provider Organization` child table.
- Knowing that provider completion only exists on the reception surface.

## Tooling, capture and cleanup

- **Capture blocker (confirmed):** `appointment.qa_runner.run` does not forward
  video/timeline flags, and `run_browser_qa_manifest`'s defaults
  (`capture_video=0`, `capture_instruction_timeline=0`) override the manifest.
  Every run reports `capture {screenshots: on, trace: failure, video: failure}`
  and `video_file: None`. Recordings were requested in the manifests but are not
  producible through the mandated entry point without a source change; evidence
  uses screenshots, DOM snapshots, report JSON and traces. No product code was
  changed.
- **Identity:** each manifest carried `auth.username`; the authenticated user is
  recorded in each report's `authenticate` action. One identity per manifest
  means the customer→provider handoff cannot be exercised in a single run; the
  reception→provider visibility check used a labelled Administrator fixture (see
  "What was tested").
- **Cleanup:** `probes/p4_cleanup_probe.py` removed exactly the P4 records
  (3 providers, 1 organization, 2 services, 2 locations, 2 event types, 1
  availability, 4 appointments, 3 walk-ins, 1 disposable user + 4 Has Role + 1
  social login) and the `Organization Manager` child row. No broad prefix sweep
  and no queue/scheduler change were used. Post-cleanup, all business tables are
  0 and the four retained users and four Browser Accounts/Sessions remain
  (`probes/outputs/p4-cleanup.txt`).
- BQA-2026-00097 is a stale `Running` run from an early attempt that timed out
  and was killed; its captured first screenshot is retained as raw evidence and
  it is not counted as a passed run.

## Evidence limits and unresolved decisions

- No authenticated human observed the F3 modal failure; the blank client-name
  retention is an observed automated-run outcome with a code-supported
  inference, not a proven real-user reproduction.
- The provider's availability save was not completed end-to-end; the
  service-provider load logged an access error for the Provider role.
- The provider "requires knowledge" links depend on fixtures; the provider
  customer-context modal could not be opened while F2 returned no appointments.
- Open decisions: the beta's first complete workflow; whether staff/roles are in
  beta scope; and whether organization setup should be resumable or gated on a
  minimum viable configuration.
- This is not release approval, and Phase 2's shared-site security findings
  remain in force.
