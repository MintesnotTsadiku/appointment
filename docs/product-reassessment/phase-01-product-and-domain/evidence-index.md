# Phase 1 — Evidence index

All artifacts below come from Browser QA Run **BQA-2026-00060** (Appointment,
deterministic mode, status **Passed**, 0 console errors, 0 network errors).

## Identifiers

| Item | Value |
|---|---|
| Review branch | `review/phase-01-product-domain` |
| Baseline (reviewed) commit | `7e233e6cf240f57201a3b39b6b8279d10b0d599f` (`origin/develop`) |
| Declared runtime source | `fix/appointment-beta-readiness @ 3c57fb4c6484218c41af6ee592de0960c1c69ad6` (clean) |
| Runtime site | `meet-beta-fix-appointment-beta-readiness-01dea7.localhost` |
| Browser frontend | `http://localhost:49510` (isolated runtime) |
| Browser QA Run ID | `BQA-2026-00060` |
| Agent Harness preflight | Node 24.12.0, Playwright 1.58.2, Chromium 145.0.7632.6 — `ok: true` |
| Agent Plane / Agent Harness installed | Yes (`bench --site … list-apps`) |

### Runtime revision caveat

The preserved runtime *declares* source
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-readiness`
(`3c57fb4`, clean), and the bench `apps/appointment` symlink points there.
However, the bench Python resolves the `appointment` package from a stale
`frappe_appointment.pth` pointing at
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta`
(`develop @ 7e233e6`, clean):

```
$ bench/env/bin/python -c "import appointment, os; print(os.path.dirname(appointment.__file__))"
/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta/appointment
```

`git diff 3c57fb4..7e233e6` shows only `README.md`,
`docs/product-reassessment/README.md`, `package.json`, `pyproject.toml` — **no
product code differs**. The compared application source files match, but this alone does not verify the active frontend build or process source. Treat browser observations as evidence of this recorded runtime, with source equivalence qualified accordingly.

## Recorded checks

Preflight (read-only):

```bash
/home/minte/projects/appointment-foundation-runtime/venv/bin/python \
  apps/agent_harness/scripts/ensure_browser_runtime.py --report-only
# -> contract node 24.12.0 / playwright 1.58.2 / chromium 145.0.7632.6, ok: true
```

Runtime status and app inventory:

```bash
frappe-worktree --worktree <readiness-worktree> \
  --runtime-root /home/minte/projects/appointment-worktree-runtimes status
bench --site meet-beta-fix-appointment-beta-readiness-01dea7.localhost list-apps
# frappe, agent_harness, agent_plane, appointment
```

Browser suite (through the product-owned entry point; manifest symlinked to a
short path because the QA Run title column is capped at 140 characters):

```bash
bench --site meet-beta-fix-appointment-beta-readiness-01dea7.localhost \
  execute appointment.qa_runner.run \
  --kwargs '{"manifest_name":"/tmp/p01-manifest.yaml","base_url":"http://localhost:49510"}'
```

Read-only database probes (roles, DocTypes, counts) via `bench console`;
fixture counts were re-checked after the run and returned to zero.

## Scenario → artifact map

| Scenario ID | Role | URL | Runtime revision (declared / loaded) | Run ID | Screenshots | Video | Trace |
|---|---|---|---|---|---|---|---|
| `phase01_homepage_desktop` | Guest | `http://localhost:49510/` | `3c57fb4` / `7e233e6` | `BQA-2026-00060` | `screenshots/phase01-homepage-desktop.png` | none | site storage (below) |
| `phase01_homepage_mobile` | Guest | `http://localhost:49510/` (390×844) | `3c57fb4` / `7e233e6` | `BQA-2026-00060` | `screenshots/phase01-homepage-mobile.png` | none | site storage |
| `phase01_public_booking_terminology` | Guest | `/schedule/org/qa-browser-cca404/evt-2026-000001?type=…` | `3c57fb4` / `7e233e6` | `BQA-2026-00060` | `screenshots/phase01-public-booking-first-screen.png` | none | site storage |

Committed browser artifacts in this folder:

- `browser-manifest.yaml` — the exact manifest used.
- `screenshots/phase01-homepage-desktop.png` (1440×15040 full page)
- `screenshots/phase01-homepage-mobile.png` (390×26288 full page)
- `screenshots/phase01-public-booking-first-screen.png` (1440×1748)
- `traces/BQA-2026-00060-report.json` — machine-readable run report (scanned for
  secret-like keys: none).

## Artifacts NOT copied (large / site storage)

Agent Plane retained these in the site's private files. Report the site
`private/files` path as the authoritative location; they are **not** in this
repository and will be removed with site cleanup.

| Artifact | Exact location |
|---|---|
| Trace (all scenarios, 6.5 MB) | `bench/sites/meet-beta-fix-appointment-beta-readiness-01dea7.localhost/private/files/BQA-2026-00060-trace-462a616985-trace.zip` |
| Homepage desktop screenshot | `.../private/files/BQA-2026-00060-screenshot-a82d4df32f-phase01-homepage-desktop` |
| Homepage viewport screenshot | `.../private/files/BQA-2026-00060-screenshot-777050e084-home.png` |
| Homepage DOM snapshot | `.../private/files/BQA-2026-00060-dom_snapshot-6fe58b54b0-phase01-homepage-desktop.html` |
| Booking DOM snapshot | `/tmp/agent_browser_qa/appointment/appointment-phase01-public-booking-terminology-20260921T071614Z/schedule-org-qa-browser-cca404-evt-2026-000001.html` |

`recordings/` is empty: the run captured no video (`video_file: null`, capture
policy `video: failure`). This is reported as a gap, not as a passing artifact.

## Finding → evidence cross-reference

| Finding | Evidence |
|---|---|
| F1: delivery gaps | Homepage screenshots; promise table source references; marketing-delivery-requirements.md |
| F2: duration label | `screenshots/phase01-public-booking-first-screen.png`; fixture Service duration 30; organization appointment frontend division by 60 |
| F3: path consistency unverified | `appointment/scheduler/availability.py:21-68`; `appointment/scheduler/helpers/slot_engine.py:68-115,258`; public/reception API sources |
| F4: legacy roles/ownership | Provider metadata, role fixture, Appointment DocPerm |
| F5: duplicate metadata | Service and Location JSON field-name repetitions |

## Synthetic data cleanup

`appointment.qa_fixtures.teardown()` ran in the run's `finally` block and removed
all fixture records. Post-run counts (read-only probe) returned to zero:

```
COUNT::Appointment=0      COUNT::Organization=0   COUNT::Provider=0
COUNT::Service=0          COUNT::Location=0       COUNT::Walk In=0
COUNT::Policy=0           COUNT::EventType=0      COUNT::User Appointment Availability=0
COUNT::Booking Event=0
```

Retained on purpose: the `Browser QA Run BQA-2026-00060` record and its File
artifacts (Agent Plane audit trail). No credentials, cookies, tokens, or
passwords are recorded in this folder.


## Scope of validation

The booking screenshot and focused source references were inspected. The
manifest uses `auth.type: none`, confirmed by the report's authenticate action;
this differs from the required `frappe_session`. No video exists. These artifacts
support static page observations only. Raw trace inspection, original preflight
and original fixture cleanup are recorded results, not independently repeated
checks. Historical manifests are retained unchanged to reflect what ran.

Reusable QA identities were subsequently set up on the preserved site; see
`../browser-qa-access.md`. They are intentionally retained and are not part of
the original fixture counts above.
