# Content publishing, gallery and onboarding — progress and validation

**Status:** Phases 0–3 implemented and verified; Phases 4–10 not started
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

No frontend surface is wired to the new owner or public APIs yet, so the feature
is not usable end to end by a normal owner. No browser acceptance evidence
exists for the new content surfaces. There is no payment integration, by design.
