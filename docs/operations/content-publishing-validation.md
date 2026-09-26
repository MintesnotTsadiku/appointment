# Content publishing, gallery and onboarding — progress and validation

**Status:** Phases 0–3 implemented and verified; Phase 4 full browser acceptance pending; Phase 5 core owner journey implemented, broader acceptance pending; Phase 6 core import in progress; Phases 7–10 pending
**Date:** 2026-09-26
**Branch:** `feat/content-publishing-gallery-onboarding`
**Head at recording:** `6e450cbeb639828db53841f39ae09d66092e35fa`
**Plan:** `docs/features/CONTENT_PUBLISHING_GALLERY_AND_GUIDED_WEBSITE_SETUP_IMPLEMENTATION_PLAN.md`

This file records the isolated runtime and the tests that were run. It is not a
release approval. The plan's completion criteria are not yet met.

## Isolated runtime

- Worktree: `/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta`
- Source Bench: `/home/minte/projects/training-apps`
- Runtime state: `~/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4`
- Site: `meet-beta-feat-content-publishing-galler-5839d4.localhost`
- Frontend: `http://127.0.0.11:34340`
- Backend (internal): `http://127.0.0.1:34341`
- Socket.IO: 34342; Redis cache 34343; Redis queue 34344; watcher 34345
- tmux session: `fw-meet-beta-feat-content-publishing-galler-5839d4`
- Installed apps: `frappe`, `blog`, `newsletter`, `appointment`, `agent_harness`, `agent_plane`
- Site config: `developer_mode=1`, `mute_emails=1`, `pause_scheduler=1`, fresh no-seed site
- Credentials live only in the runtime's private `credentials.json`; nothing is
  printed or committed.

Verified at provisioning: all seven tmux panes alive, backend health 200,
frontend health 200, `bench --site list-apps` matches the list above, worktree
import path resolved, authenticated API returned `Administrator`, and the
Socket.IO handshake through the frontend origin returned 200.

Windows unique-address forwarding (`frappe-worktree windows-forward`) was **not**
run; browser acceptance through the unique `127.0.0.11` address remains pending.

## Dependency lock

See `docs/operations/content-dependencies.md`. Blog is pinned to
`ed1ed4019c7f167c41b80f8ea92da60680c2112d` (MIT) and Newsletter to
`e5ed3645199104818c354617cb495cbdf90b94fe` (AGPL-3.0) on Frappe 17.0.0-dev.

## What is implemented

### Phase 0 — dependency qualification

Blog and Newsletter are present on the source Bench, declared through
Appointment `required_apps`, and installed on the isolated site. The dependency
lock records commits, licenses, compatibility, install, upgrade and rollback.

### Phase 1 — entitlements and tenant ownership

- `Business Entitlement` projection per business and capability with states,
  effective window, limits, source and reconciliation timestamp.
- `appointment/content/entitlements.py`: closed capability registry, code-owned
  defaults, `resolve` / `require_capability` / `enforce_limit` / `set_capability`.
- `Content Ownership` mapping from one upstream authoring record (Blog Post,
  Newsletter) or gallery collection to exactly one business and public site.
- `appointment/content/tenancy.py` and `access.py`: shared list and
  document-level permission rules for the content DocTypes plus Blog Post and
  Newsletter. A global role alone never grants another business.
- Patch `grant_content_doctype_permissions` adds scoped role DocPerms for Blog
  Post and Newsletter; Appointment hooks then deny foreign records.
- Fail-closed: unknown capability, ambiguous owner and missing business all
  deny.

### Phase 2 — immutable publication releases

- `Published Content Release`: business, public site, content type, source,
  route, locale, canonical hash, template compatibility, source timestamp,
  sanitized content, media and SEO projections, supersedes / superseded-by,
  withdrawal state and audit actor.
- `appointment/content/sanitize.py`: strict parser that rebuilds a closed set of
  structured blocks, rejects scripts, styles, event attributes, unknown tags,
  frames, unsafe schemes and protocol-relative URLs, and a safe Markdown subset.
- `appointment/content/releases.py`: publish, route takeover refusal, limit
  enforcement, supersession, withdraw, rollback, session-bound preview and
  guest-safe index/detail reads. Public reads never touch a mutable authoring
  record.
- `appointment/content/api.py` (owner) and `public_api.py` (guest).

### Phase 3 — gallery

- `Gallery Collection` and `Gallery Item` with grouping, ordering, focal points,
  aspect hints, consent review, tags and SEO.
- `appointment/content/gallery.py`: typed video providers (YouTube/Vimeo) with
  identifier normalization and host allowlisting; site-local public media only;
  images validated from decoded content (Pillow) with checksum, width and
  height; alt text required; pending consent blocks publication.
- `appointment/content/media_limits.py`: entitlement-backed collection, item and
  storage limits.
- Collection publication reuses the release path with content type
  `gallery_collection`.

## Test evidence

All suites run with `bench --site <site> execute <module>.run` on the isolated
site. Three suites, 35 tests, all passing, with exact cleanup (zero marker
records remain):

| Suite | Tests | Result |
| --- | --- | --- |
| `appointment.tests.test_content_entitlements.run` | 13 | OK |
| `appointment.tests.test_content_releases.run` | 13 | OK |
| `appointment.tests.test_content_gallery.run` | 9 | OK |

Coverage includes capability defaults and overrides, fail-closed resolution,
two-business isolation for lists and direct reads, upstream Blog Post isolation,
guest denial, limit enforcement, sanitizer safety, publish / supersede / route
conflict / withdraw / rollback, public read of active releases only,
session-bound previews, typed video allowlisting, content-based image
validation, spoofed upload rejection and consent gating.

Backup drill: `bench --site <site> backup --with-files` completed successfully
with database, public and private file archives.

## Not implemented (Phases 4–10)

- **Phase 4** independent blog and gallery surfaces inside every certified
  template package, with browser evidence.
- **Phase 5** guided Website Setup, catalog metadata, deterministic
  recommendations and live preview workspace.
- **Phase 6** organization workbook import (schema, dry-run, audit, retry,
  invitations).
- **Phase 7** newsletter audience, consent, suppression, unsubscribe tokens,
  background sends and the local email sink.
- **Phase 8** showcase expansion and repository-owned reproduced media.
- **Phase 9** clean-site normal-user Agent Plane browser acceptance.
- **Phase 10** release readiness: upgrade/rollback, restore drills, monitoring
  runbooks and security/accessibility/performance gates.

Phase 4 now wires public content surfaces to the public APIs. Owner content
authoring and Website Setup remain pending. No browser acceptance evidence
exists for the new content surfaces. There is no payment integration, by design.


## Phase 4 implementation checkpoint — 2026-09-26

**Status:** Code exists. Phase 4 is not accepted or complete.

- Each certified template owns a content component and its styles. Packages do
  not import visual components from another package.
- Blog indexes, articles, gallery indexes, and collections use the guest content
  APIs. Public reads still use Active immutable releases.
- Public responses now include `templateCompatVersion`. Detail rendering rejects
  incompatible versions, mismatched routes, and mismatched locales.
- The public resolver and React routes accept site-scoped blog and gallery paths.
  Resolver cache identity now includes the path.
- Each package includes loading, empty, unavailable, and newsletter-unavailable
  treatments. Newsletter subscription stays unavailable until Phase 7.
- Article blocks become native elements from a closed parser contract. No
  template inserts raw HTML. Video items link to validated provider URLs.
- Content pages include pagination, canonical metadata, a skip link, focus
  styles, responsive layouts, and light/dark tokens.

Validation:

- Before edits: existing isolated-site suites passed 35/35 tests.
- After edits: those suites and `test_public_content_routes.run` passed 40/40.
- `npm run test:dom` passed, including the new public-content contract checks.
- Focused ESLint checks passed for new content files.
- `npx vite build` passed. Existing font asset resolution and bundle-size
  warnings remain.
- Full-project TypeScript checking fails outside the changed public content
  files. Errors include availability templates, task components, missing PWA
  declarations, and API types. This checkpoint does not repair those failures.
- `git diff --check` passed.

Managed browser preflight on this isolated site returned no Browser QA worker
and no Browser Accounts. The referenced
`docs/dev/agent-plane-browser-validation.md` is absent from this checkout.
Installed Agent Plane instructions are available in its browser operations
runbook. The user authorized browser bootstrap after this checkpoint. See the
bootstrap record below.

Remaining Phase 4 gates:

1. Establish least-privileged managed Browser Accounts and Browser QA workers.
2. Create and approve each template's blog and gallery design references.
3. Validate real releases, pagination, typed rich text, images, video fallbacks,
   empty/error states, keyboard behavior, accessibility, and performance.
4. Capture landing, booking, scheduler, blog, article, gallery, collection, and
   newsletter treatment for every template at desktop/mobile and light/dark.
5. Store browser captures and source comparisons under `qa/evidence/`.

No showcase data was seeded. No reference-runtime state was changed. No schema
migration was needed. Phases 5–10 remain pending.


## Authorized managed browser bootstrap — 2026-09-26

The user authorized development Browser Account and worker bootstrap.

- Created `content-browser-owner@example.test` with Provider and Organization
  Manager roles. It has no platform administrator roles.
- Created Browser Account `BACCT-0057` and primary session `BSESS-0058`.
  Agent Plane stores the login credential encrypted. The runtime also holds a
  private `browser-credentials.json` file with mode 0600.
- Split the original combined worker into `short,default` and `long` workers.
  Both use the pinned Harness environment. Topology reports one browser worker
  and one agent worker.
- Reused Node 24.12.0, Playwright 1.58.2, and Chromium 145.0.7632.6.
- Added an app-owned, development-only managed browser smoke suite and guide.
  It checks normal-user React and Desk access at desktop/mobile sizes.
- The stricter smoke also checks an authenticated Socket.IO namespace over
  WebSocket, through the frontend origin.

Two runtime details needed correction:

1. Export `FRAPPE_BENCH_ROOT` as well as `PYTHONPATH`. The earlier preflight
   checked the source Bench queue namespace, which explains its missing-worker
   result. The actual isolated worker initially consumed all three queues.
2. Set isolated common config `webserver_host=127.0.0.1`, with port 34341.
   Socket.IO otherwise calls the browser loopback host, where the backend does
   not listen. Restart only the isolated Socket.IO service after this change.

Browser run history:

- `BQA-2026-00059`: all four browser assertions passed. The durable result failed
  because the new suite had eight new screenshot baselines.
- `BQA-2026-00060`: all four scenarios passed and established the reviewed
  initial runtime-smoke baseline.
- `BQA-2026-00061` and `BQA-2026-00062`: React and Desk authentication worked.
  The added WebSocket checks exposed the callback-host problem. Run 62 also
  overlapped the Socket.IO restart. These failed runs remain recorded.
- `BQA-2026-00063`: strict repeat passed 4/4, with zero failures, flakes, or
  screenshot baseline changes. Authenticated WebSocket checks passed. Captures
  and their hashes are under `qa/evidence/content-runtime/`.

Windows unique-host forwarding was attempted. Windows reported canceled
administrative elevation. No forwarding success is claimed. The managed WSL
browser can reach the isolated frontend directly.

No business or showcase data was seeded during bootstrap. No schema migration
was needed. These smoke captures do not approve Phase 4 public content surfaces.
The public template, content, mode, and viewport acceptance matrix remains open.

## Phase 5 core owner journey checkpoint — 2026-09-26

Phase 5 is in progress. The new owner service ranks certified recipes, creates
or resumes one business website, saves typed drafts with optimistic version
checks, compiles private previews, and publishes through the existing brand and
experience publishers. The Settings website workspace creates and edits article
drafts, uploads validated consented images, publishes gallery collections, and
shows release history. Owner requests use business permissions and entitlement
checks. Public article bylines and editorial labels are captured in immutable
releases; generated category identifiers are not public labels.

Validation performed on the isolated site:

- Existing entitlement, release, and gallery suites passed 35/35 before edits.
- The normal-owner website suite passed 8/8, including foreign-owner denial,
  stale writes, entitlement denial, unpublished previews, immutable article
  labels, and tenant-bound image uploads.
- Release tests passed 13/13; public route tests passed 5/5.
- Frontend DOM guards, focused ESLint, and direct Vite production build passed.
- The package build wrapper failed while contacting the package registry
  (`EAI_AGAIN`). The direct Vite build used the installed dependencies.
- App TypeScript checking still reports 273 existing errors outside the new
  website files. This checkpoint does not claim a green full-project typecheck.

The runtime's platform-host allowlist now contains the isolated site hostname
and `127.0.0.11`; otherwise public requests through Vite could not resolve a
published website. This setting must be part of fresh-runtime provisioning.
The shared HTML entry no longer requests Google Fonts. Certified template fonts
are packaged locally; the remote font request caused a browser capture timeout.

Managed Browser QA uses the normal Provider / Organization Manager account and
creates its business through the onboarding UI. Its fixture refuses preexisting
marker records and removes only records created by that journey. The shared
browser account predates the journey; this is not Phase 9 fresh-site evidence.
Runs 00070–00078 retained their failures, including selector, host routing,
font timeout, and visual drift. Run 00079 passed the owner journey and updated
one reviewed blog capture after removing an internal category identifier.
Strict repeat `BQA-2026-00080` passed 1/1 with zero failed or flaky scenarios,
zero baseline changes, and zero remaining fixture records. Its eleven captures
and validation metadata are retained under `qa/evidence/website-setup/`.
This accepts the recorded Tena owner journey only.

Remaining work includes the full five-template browser matrix, broader brand
and content editing, complete media management and previews, and all Phase
6–10 exit gates. The existing readiness endpoint requires a published brand;
the guided flow needs readiness checks for the draft that Publish will compile.
Newsletter signup remains unavailable until Phase 7.

## Draft readiness and workbook import checkpoint — 2026-09-26

The guided readiness service compiles the draft without creating published brand
or experience records. It checks booking availability and selected entitlements.
The save-and-return action saves progress and returns to Home. Backend tests
passed 9/9. Managed browser run 00081 passed the expanded journey. Run 00082
caught a new package shadowing the existing `appointment.onboarding` module.
The package was renamed to `appointment.organization_import`, the isolated
backend was restarted, and strict repeat 00083 passed with zero visual changes.
That failure was retained rather than accepted or hidden.

Phase 6 now has the versioned workbook template at
`docs/import-templates/organization.v1.xlsx`, a bounded parser, authenticated
review and confirmation APIs, and a Settings import screen. Parsing does not
write records. It reports sheet and cell errors, validates stable references,
and rejects formulas, unsupported columns, passwords, macros, external links,
unsafe XML, duplicate entries, excessive archive expansion, and oversized row
ranges. XML preflight permits UTF-8 only so alternate encodings cannot hide a
DTD or entity declaration. `openpyxl~=3.1.5` matches the installed Frappe pin.

Confirmed imports use normal document insert/save permissions and one controlled
transaction. An immutable Organization Workbook Import audit stores the checksum,
actor, summary, and stable-key mapping. Exact retries return the prior audit;
corrected workbooks update mapped records. Missing rows never delete records.
Location, provider, service, offering, and team records remain business scoped.
Scoped Organization Manager membership DocPerms and controller validation allow
normal owner assignment without granting access to another business. Role
assignment still uses the existing trusted membership service.

Validation:

- Workbook parser: 10/10 tests passed, including alternate-encoding entities.
- Normal-owner confirmation: 6/6 tests passed for two locations, retry,
  correction, explicit confirmation, hash binding, isolation, audit protection,
  and rollback after a failed application.
- Entitlement regressions: 13/13; website setup: 9/9.
- Focused frontend lint and direct production Vite build passed.
- Full app TypeScript checking still reports 273 existing errors, with no errors
  in the new website or workbook screens.
- A site-scoped migrate applied the new audit DocType and membership DocPerms.
- Managed browser run 00090 passed the owner journey plus workbook cell
  correction, confirmation, and duplicate-free retry. Two new workbook captures
  were reviewed. Strict repeat 00091 passed with zero failed or flaky scenarios,
  zero visual changes, and zero remaining fixture records. Its thirteen captures
  and audit are retained under `qa/evidence/website-setup/`.

Phase 6 is not complete: the UI currently imports into an existing owned
organization, staff must already have enabled accounts, and capacity is limited
to individual appointments. Invitation acceptance, direct new-organization
creation from a workbook, full website-text dry-run validation, and broader
large-file/performance acceptance remain. Phases 7–10 are still pending.
