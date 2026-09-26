# Content publishing, gallery and onboarding — progress and validation

**Status:** Phases 0–3 implemented and verified; Phase 4 full browser matrix pending; Phases 5–6 core owner journeys implemented, broader acceptance pending; Phase 7 core local newsletter journey in validation; Phase 8 expansion in progress; Phases 9–10 pending
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

## Direct workbook business creation — 2026-09-26

An organization owner can now choose to create a new organization directly from
the workbook. The owner service uses a normal Organization insert with a server
factory capability. Raw inserts cannot forge that capability. A protected
workbook creation key at normal field permission level binds retries to the
original owner and workbook namespace; it does not adopt existing organizations.

The first new-business regression exposed an internal commit in the legacy
booking URL sync and a retry field that normal owners could not write. Creation
now suppresses that sync for the whole transaction and uses the new protected
key. The exact failed synthetic business and its audit-mapped records were
purged; the reserved failed-fixture check returned no remaining businesses.
Nine workbook confirmation tests pass, including full rollback when a foreign
location name collides. Parser tests remain 10/10 after additional plain-text,
length, duplicate-day, and duplicate-website-field checks.

Managed run 00098 created the second business directly from its workbook.
Strict repeat 00099 passed with zero failed or flaky scenarios and zero visual
changes. Fourteen captures and the expanded cleanup audit are retained under
`qa/evidence/website-setup/`. This is still the shared normal organization owner
on the existing isolated site, not the Phase 9 fresh-install journeys.

Phase 6 still needs invitation acceptance, broader capacity handling, and full
website-text dry-run validation. The full template matrix and Phases 7–10 remain
pending.

## Local newsletter core and browser journey — 2026-09-26

The newsletter workspace now uses business-scoped consent records, opaque
confirmation and unsubscribe tokens, local sender verification, immutable
campaign snapshots, entitlement quotas, scheduling, throttles, bounded retries,
and idempotent background capture. Delivery writes only to the local email sink.
It does not invoke SMTP or the upstream Newsletter send/test-send paths.
Each certified template owns its signup form and styles; only the signup hook
is shared. Signup availability is checked against published feature snapshots.

Focused results: newsletter 12/12, upstream draft/legacy-route guards 6/6,
gallery 10/10, website setup 9/9, and entitlements 13/13. The newsletter suite
covers explicit consent, single-use and expired links, audience and monthly
quotas, sender verification, immutable content, request replay, suppression,
unsubscribe after queueing, expired access, throttle/retry, and tenant isolation.
Gallery document validation now checks website ownership for images, covers,
posters, and thumbnails; raw inserts cannot bypass the media-library boundary.
The spoofed-image regression still tests decoding with a correctly bound File.
Focused frontend lint and the direct Vite build pass. The previously recorded
repository TypeScript and npm registry failures remain separate open issues.

Managed run 00109 passed the normal-owner sender, consent, confirmation, unsent
preview, local campaign delivery, and guest unsubscribe journey. Strict repeat
00110 caught two capture races and a public design/signup loading flicker.
Those states were corrected rather than masking the changed area. Reviewed
baseline 00111 passed; strict run **00112 passed with zero visual changes, failed
scenarios, or flakes**. Eighteen captures are retained under
`qa/evidence/website-setup/`, with the exact cleanup audit in `validation.json`.

Retained failed runs document the fixes: 00106 exposed an incorrect resolver
field in the public snapshot API; 00107 followed the previous inbox message
before the new one opened; 00108 waited on a short-queue delivery while its
only worker was occupied by browser QA. The isolated stack now has a dedicated
`newsletter` short-queue worker. No external messages were sent.

This accepts the core local newsletter journey on the existing isolated site
using a normal organization owner and Tena. The full five-template matrix,
expanded website/import requirements, fresh-site journeys, and upgrade/restore
gates remain pending. See `docs/operations/content-newsletter.md` for transport,
token, queue, and retry behavior.

## Phase 8 content expansion and acceptance work in progress

The primary isolated site is now explicitly seeded. It no longer counts as a
fresh-site acceptance target. The reference runtime remains unchanged.

The version 1 content manifest creates fifteen articles, ten collections, five
newsletter drafts, and five unsent local previews across all certified templates.
Its checksum is `14ef94a251e780ca6dc4a82c8394db63d71e7f5424a2011ae4fff9e86e50a53b`.
The content inventory verifies all canonical release hashes and zero showcase
audience members or delivery campaigns. Explicit seed replay creates no duplicates.
`appointment.tests.test_rich_demo.verify` passes relationships, booking capacity,
tenant scopes, and byte-identical inventory and private journal replay.

Managed run `BQA-2026-00113` failed before browser execution because the new
read-only fixture used `release_hash` instead of `content_hash`. The corrected
full matrix `BQA-2026-00114` passed eighteen scenarios and exposed mobile overflow
in the Tena landing headline. Both corrected mobile cases pass in
`BQA-2026-00121`. The full matrix and strict repeat remain pending.

Seedless site A, `meet-beta-content-fresh-a.localhost`, installs exactly Frappe,
Blog, Newsletter, Appointment, Agent Harness, and Agent Plane. Before the first
normal owner journey, all eight checked business/content table counts were zero.
Managed profile `BACCT-1001` and session `BSESS-1002` use a separate private
credential file. Disjoint harness counters prevent cross-site storage collisions.
Fresh-site acceptance is still in progress. Do not treat failed or partial runs
as acceptance evidence.

New workbook tests pass eleven cases, including validated contact text, retained
starter text before Website setup, and transactional rollback. Private template
previews now include article and gallery surfaces. Fresh-site browser validation
found missing upstream role grants. Install and migration hooks now reconcile
Custom DocPerm so upstream metadata sync cannot remove the content grants.
These expanded setup and installation changes await a passing strict journey.

## Continued fresh-site and recovery work — 2026-09-26

These changes are in progress after checkpoint `467b40b`. Phases 5–10 are not
complete. No reference-runtime data was changed.

- Added private template comparisons and six owner preview surfaces. The
  ranking catalog explains audience, industry, feeling, density, and font
  choices. Website drafts retain these preferences and the main visitor action.
- Added owner logo and favicon upload controls. Images require public-display
  consent, decoded image validation, and exact Public Site ownership. Favicon
  uploads generate a square 256-pixel PNG. Re-selecting the same file works.
- Fresh-site installation exposed missing upstream draft permissions. The
  install and migration hooks now maintain tenant-governed Custom DocPerm rows;
  normal owners no longer require Administrator to create an article.
- Workbook website starter text survives import before website creation. Invalid
  contact cells fail dry-run before writes. The workbook still links enabled
  accounts after staff accept their invitations.
- Added a local staff invitation inbox and explicit acceptance page. Acceptance
  creates an account with its own password and no business membership. Existing
  accounts must accept while signed in with the invited email. Tokens expire,
  can be revoked, and are one-use. No external email is sent.
- Article hero and inline images now use the same exact-site decoded-image gate
  as gallery media. Private previews and newsletter actions return no-store and
  noindex headers.

Focused results: website setup 11 tests; staff invitations 4 tests plus 9
entitlement regression tests; gallery and article media 11 tests; immutable
releases 13 tests; public contracts and response privacy 9 tests. All passed.
The focused frontend lint and installed Vite build passed. The previously
recorded unrelated TypeScript failures remain separate.

Fresh site A began without business or content data. Managed run
`BQA-2026-01023` passed the expanded normal-owner journey, including local staff
acceptance, with 27 captures. Run `01024` passed all functional steps but failed
one screenshot comparison. Run `01025` passed after the comparison capture moved
the pointer away from native controls and removed focus. These runs establish
baselines; they are not strict final acceptance. A strict repeat of the final
wizard remains required. No authentication trace or invitation token is exported.

The full five-template matrix is running as `BQA-2026-00134`. The previous
Tena mobile overflow fix remains in its own template package. An accessibility
and local navigation-budget suite uses pinned axe-core 4.11.0. Its results are
pending; automated checks do not replace manual accessibility review.

A fresh second acceptance site, `meet-beta-content-fresh-b.localhost`, was
provisioned without seeding. Browser validation on this site remains pending.

### Recovery data-integrity result

Backup `20260926_163236` restored only into the new isolated site
`meet-beta-content-restore.localhost`. The recovery target retained the source
credential encryption key privately, with muted email and paused scheduling.
The source and restored inventory hashes match:
`a396c5d73c81673fe8844ccd33bc54852db5b89483fc6ca244d7f576c9e471be`.

Verification covered 35 publication releases, 15 actual media files, upstream
record counts, two consent records, encrypted unsubscribe tokens, consent audit,
and confirmed/suppressed states. Only the two explicit recovery consent fixtures
and their captured messages were removed from the source after verification.
The recovery target retains them. See `qa/evidence/content-recovery/validation.json`.
Public-route browser recovery, code upgrade/rollback, remaining owner/staff and
isolation journeys, monitoring/runbooks, and final accessibility/performance
qualification are still pending.


### Continued acceptance and operational checks

Managed accessibility run `BQA-2026-00137` passed nine scenarios and rejected the
Abugida mobile home link without an accessible name. Its own template now names
the link. Repeat `00138` passed all ten scenarios across 70 public surfaces, with
zero automated WCAG A/AA violations, no external resource requests, and the
local 15-second navigation budget. Public reports and ten captures are retained
under `qa/evidence/content-accessibility`. Incomplete contrast and link checks
remain for manual review; this does not certify complete accessibility or
production performance.

Template baseline `00139` passed all twenty scenarios. Strict comparison `00140`
is in progress. These captures include each template's own content-header logo.

Website setup passed 12 tests, entitlement isolation 13, immutable publication
14 (including foreign category/author rejection), newsletter 12, and monitoring
5. The upstream global Blogger restriction initially blocked new site-owned
authors. A proposed global property setter was rejected by automatic approval
review and was not applied. The scoped fix retains user-permission enforcement
and grants only the managed website's own author link for Blog Post.

The explicit journal-owned support upgrade created ten category/author ownership
mappings. A repeat created zero. All 35 release hashes remain valid and the five
showcases retain zero audiences and campaigns. The journal owns 160 records.
Exact repair removed the known interrupted synthetic independent-provider and
diagnostic fixtures. The seven synthetic record counters returned zero.

The organization browser journey now includes a separate managed receptionist
profile configured only after guest invitation acceptance and normal-owner Team
assignment. Its final browser run is pending. The second fresh-site independent
owner run, full isolation/entitlement journeys, restored public-route checks,
code upgrade/rollback, and manual accessibility qualification also remain pending.
Monitoring and the operations runbook are implemented; their focused regression
checks are recorded above. The final focused batch also passed staff invitations
14, gallery/media 11, workbook import 11, response privacy 9, and upstream draft
protection 6. Frontend lint passed with the two existing session fast-refresh
warnings and no errors. No external email or reference-runtime changes occurred.

### Independent operational onboarding and continued browser qualification

The new independent setup creates an explicit provider-owned Service and Location.
Their `independent_provider` links cannot coexist with organization ownership or
change after creation. The EventType must resolve to those same owners. Public
booking remains disabled until the normal owner publishes it. Guest bookings
reuse the canonical transaction, hours, shared-user capacity lock, retry identity,
and appointment lifecycle. Appointments retain their provider owner with an empty
organization; no organization proxy is created. Scheduling is available before
Website setup, and the owner can return through visible navigation.

Fresh B received the additive schema migration. Four focused independent booking
tests passed, including normal-user list filtering, foreign-owner denial, private
publication, guest booking, retry, occupied-slot refusal, and unpublication.
Website setup repeated with 12 passing tests. The focused frontend lint and Vite
build passed. Managed independent UI validation is still pending.

The existing organization booking HTTP suite could not start because it targeted
its historical runtime port. No tests ran. Its interrupted synthetic fixture was
removed through exact guarded cleanup; Fresh B again reports zero businesses,
providers, sites, drafts, releases, audiences, and campaigns. The suite now uses
the designated content runtime for these two explicitly allowed isolated sites,
and registers cleanup before attempting HTTP login. Its regression repeat remains
pending until the backend and frontend target Fresh B together.

Template baseline `00141` passed 20 scenarios. Strict `00142` passed every
functional scenario, with two screenshot differences limited to nine pixels each
at rounded scheduler theme-button edges. The redundant nested backdrop filter was
removed, and capture waits now require completed header and card opacity.
Focused baseline `00143` passed both affected scenarios. Full baseline `00144` is
running. No strict final template acceptance is claimed yet.

The expanded owner suite includes a managed receptionist, a second business owner,
saved article previews in the selected template, publish and rollback, suppression
retention, tenant denial, expired capabilities, and server-enforced limits. These
new browser checks remain pending. Recovery code-drill tooling archives the
committed `facd02d` candidate without resetting the working checkout. The actual
rollback and upgrade browser drill has not run yet.

### Production shell and cache qualification in progress

The production entry now includes the current Vite build instead of a stale list
of hashed bundles. Both website and scheduler entry points pass a request nonce
to the inline boot scripts and the response CSP. Guest pages skip private
workspace and realtime connections. The custom-domain adapter exposes exact
published-content, consent, and canonical booking endpoints while denying owner
APIs and previews. PWA navigation and API requests use NetworkOnly; the raw Jinja
entry is excluded from precaching and has no cached navigation fallback.

The production build passed with existing installed dependencies. Eleven focused
response/compiler tests passed. The PWA policy regression checks sensitive
navigation, consent links, draft/audience APIs, slot reads, and static asset
caching. Frontend DOM checks passed; focused lint has zero errors and the two
existing session fast-refresh warnings. Production browser qualification remains
pending. Strict template run `00145` is still executing; no final acceptance is
claimed from an in-progress run.

Run `00145` ended with 17 passing and three failed template scenarios. The failures
were development-server connection refusal/reset and a detached element during
Vite configuration restarts. Its 31 screenshot differences are not accepted.
A final stable matrix will follow the owner workflow fixes. Fresh B is the next
normal-owner acceptance target; the reference runtime remains untouched.

### Independent owner managed-browser baseline

Fresh B began with zero records in the eight business/content counters. Runs
`02015` and `02016` exposed inaccessible exact labels on native selectors; the
selectors now keep names independent of their option text. The calendar assertion
was corrected to include its existing PRO badge. Run `02017` reached guest booking
confirmation, the owner schedule, and published gallery delivery, then failed
because the article assertion also matched the gallery status message. Status
assertions now select the operation they verify.

Run `02018` passed the complete independent-owner journey with fourteen authored
captures: private operational setup, explicit booking publication, scheduling
before Website setup, website publication, public article and collection, guest
booking, saved template preview, public update, and publication rollback. Cleanup
returned all eight counters to zero. Its strict repeat is pending. The original
three backend suites also repeated successfully: entitlements 13, releases 14,
and gallery 11, with zero marker records after cleanup.

Independent strict run `02021` passed with zero screenshot changes across all
fourteen authored captures. Its exact audit reports zero remaining operational,
publication, sender, audience, campaign, and media ownership records. Evidence is
retained in `qa/evidence/fresh-site/independent-owner`. The file metadata regression
now has twelve passing gallery/media tests: public image bytes remain available,
while File list and document metadata require management of the attached website.

The existing organization booking HTTP and realtime suite repeated on Fresh B:
17 tests passed; 21 exact synthetic records were removed and no exact parent or
child records remained. Independent and organization regression both passed;
expanded organization/staff/workbook/newsletter browser acceptance is pending.

The expanded organization run `02022` verified managed receptionist login,
newsletter capture/unsubscribe/suppression, article history, and workbook review
and application before stopping at an inaccessible draft text label. That label
now remains stable when the textarea contains imported text. The repeat is
running. The private preview also fails closed for missing template packages;
there are no TypeScript diagnostics in the touched content/setup/independent
surfaces. The full application still reports 272 unrelated existing diagnostics.

### Owner access and production privacy qualification checkpoint

The independent journey remains accepted at strict run `02021`. The expanded
organization journey now reaches workbook-created businesses and staff publication
denial. Runs `02038` and `02042` exposed assumptions that creating a second
business immediately selects it. The browser now uses the visible business
chooser for each owner. Run `02046` stopped at staff assignment with a generic
request error; it is not acceptance evidence. A repeat with stable source and
services is required.

Owner website routes now follow the selected business scope. A global manager
role cannot grant a receptionist publishing controls in another workspace.
Article fields remain disabled while a draft loads or saves, preventing typed
changes from being overwritten by the load response. Textarea names remain
stable after loading content.

Production boot data escapes all HTML parser delimiters, including mixed-case
closing script tags. The worker upgrade deletes four exact legacy private caches
and preserves public assets and other applications. The root worker scope is
explicit; generated edge configuration serves the worker with no-cache and
Service-Worker-Allowed headers. These changes passed focused response, frontend
DOM, and privacy regressions. The offline production build passed. Managed
production browser qualification remains pending.

The final focused regressions passed: entitlements 13, releases 14, gallery/media
12, website setup 12, monitoring 5, staff invitations 14, upstream protection 6,
newsletter 12, workbook application 11, workbook parser 10, and response contracts
12. Focused lint has zero errors and two existing session fast-refresh warnings.
The full application TypeScript baseline remains separately recorded above.

Fresh C, `meet-beta-content-fresh-c.localhost`, was installed without seeding in
the existing isolated Bench. It has the six required apps and zero records in all
eight business/content counters. Its disjoint managed profile is BACCT-4001 with
BSESS-4002. The first normal user has only Provider among application roles; no
business was created by the operator. Credentials remain in private runtime files.
Final fresh-site journeys, the stable template matrix, accessibility review, and
production recovery/code rollback remain pending.
