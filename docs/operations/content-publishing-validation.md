# Content publishing, gallery and onboarding — progress and validation

**Status:** Phases 0–3 implemented and verified; Phase 4 code checkpoint, browser acceptance pending; Phases 5–10 not started
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
