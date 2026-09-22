# Appointment — owned booking implementation runtime

Created/updated 2026-09-22. Branch `implement/owned-booking-slice`.
Worktree: `/home/minte/projects/training-apps/.worktrees/frappe-appointment-implementation`.
Source Bench: `/home/minte/projects/training-apps` (source code only).
Fresh seedless site; no template reuse or assessment data import. Initial setup
about 88 seconds. Exact synthetic acceptance fixtures are now cleaned.

- Runtime: `/home/minte/projects/appointment-worktree-runtimes/implement-owned-booking-slice-a95902`
- Bench: runtime directory plus `/bench`
- Site: `meet-beta-implement-owned-booking-slice-a95902.localhost`
- Database: `_b39b640ef74ca9ad`
- React/Vite: `http://127.0.0.20:25310`
- Frappe Desk: `http://127.0.0.20:25310/app`
- Internal backend: `http://127.0.0.1:25311` (requires site header)
- Socket.IO: 25312; Redis cache 25313; Redis queue 25314; watcher 25315.
- Credentials file: runtime directory plus `/credentials.json`. Open privately
  in a local editor; do not print or paste its contents.
- Email muted, scheduler paused, development/test target only.

Full-stack start (status and stop use the same command with the last verb changed):

```bash
frappe-worktree --worktree /home/minte/projects/training-apps/.worktrees/frappe-appointment-implementation --source-bench /home/minte/projects/training-apps --runtime-root /home/minte/projects/appointment-worktree-runtimes up
```

For restart, run `stop` then `up`; ordinary startup must not migrate. Initial
creation and the Appointment schema update were applied only to this target.
Python/hook changes required restart here; do not assume hot reload loaded them.
React uses Vite hot reload on the frontend origin. API and realtime traffic are
proxied same-origin to the target backend/socket ports; Socket.IO namespace is
the exact site name. Node uses this runtime's config and Redis services.

```bash
tmux attach -t fw-meet-beta-implement-owned-booking-slice-a95902
tmux capture-pane -p -S -100 -t fw-meet-beta-implement-owned-booking-slice-a95902:backend
tmux capture-pane -p -S -100 -t fw-meet-beta-implement-owned-booking-slice-a95902:socketio
```

Windows: `info`, `redis-cache`, `redis-queue`, `backend`, `socketio`, `worker`,
`frontend`. All service panes were alive. React and Desk HTTP, authenticated API
and authenticated WebSocket passed on the unique WSL loopback host. Browser QA
used that exact origin. Source import resolves to the implementation worktree;
Appointment, Agent Plane and Agent Harness are installed in this site.

## Provisioning fixes and Windows access

The source app was renamed and was not available as `apps/appointment`; the
launcher was pointed at this worktree, with private frontend dependencies.
Runtime common_site_config requires `webserver_host=http://127.0.0.1` alongside
`webserver_port=25311`: the backend binds 127.0.0.1, so Socket.IO's default
callback through 127.0.0.20 failed. Set with site-scoped Bench `set-config -g
webserver_host http://127.0.0.1` in this isolated Bench, then restart. Do not apply
the value to another runtime. The corrected namespace handshake passed. Site `host_name` is now
`http://127.0.0.20:25310`; the long internal site hostname exceeded Frappe
Connected App redirect-URI field length in legacy test setup. This frontend
URL also matches the verified Windows/browser entry point.

Agent Plane's allowed domains on this site are `localhost`, `127.0.0.20` and the
exact site hostname. Test users are least-privileged synthetic providers;
no Administrator Browser Account was created for these checks.

Windows forwarding installed on 2026-09-22 for the exact `127.0.0.20:25310`
endpoint. `windows-status` confirms unique-host reachability; Windows PowerShell
HTTP checks returned 200 for React `/` and Frappe Desk `/app`. The initial WSL
interop/UAC attempt timed out; after verifying PowerShell interop, the retry
succeeded. The launcher records ownership of the rule in this runtime's manifest.
Re-run `windows-forward` after the WSL VM address changes and verify with
`windows-status`. Windows PowerShell also authenticated the retained synthetic Provider, verified
its identity, and loaded setup and Desk with HTTP200. Verification sessions were
cleared server-side after GET logout was rejected by the method guard. WebSocket
acceptance was exercised by the Linux HTTP/browser suites.
Windows opening commands:

```powershell
Start-Process 'http://127.0.0.20:25310'
Start-Process 'http://127.0.0.20:25310/app'
```

The running site/database are retained for follow-up. Acceptance fixtures and
known legacy test seeds were removed. A separate synthetic review demo is retained
intentionally. No site, database, worktree or assessment resource was deleted.


## Retained owner walkthrough

Open `http://127.0.0.20:25310/login`. The synthetic Provider username is
`review-aad7aa1a@example.test`. Its random password and exact cleanup manifest are
in this private mode-600 file (never copy it into committed evidence):

`/home/minte/projects/appointment-worktree-runtimes/implement-owned-booking-slice-a95902/bench/sites/meet-beta-implement-owned-booking-slice-a95902.localhost/private/review-demo.json`

Visit `/settings/business` to inspect the published synthetic business. Open
`/reception` on September 23, 2026 to inspect the 10:00 Africa/Addis_Ababa booking
`APT-125ce3b1a4be8002a754`, reschedule it, inspect history or cancel it. Public page:
`http://127.0.0.20:25310/schedule/org/business-d96788ef03698ba03c9aa65e/EVT-2026-000001`.
The demo remains for review and is separate from cleaned acceptance fixtures.
Remove it only when no longer needed, using its exact cleanup state.


## Entry-page regression fix (2026-09-22)

Direct `/login` must stay on Vite's React router. Proxying it to Frappe served an
old HTML entry referencing missing built JavaScript (returned as text/html).
`/app`, APIs and backend assets retain their backend proxy. During Vite serve,
the server-only boot script is replaced with a minimal namespace; production
builds retain the Frappe template. Let vite-plugin-pwa inject the manifest only
when available, instead of requesting a disabled development manifest.

Realtime cleanup now waits one microtask so StrictMode's immediate remount keeps
the same connection; actual unmount still disconnects. The behavior regression
test and existing DOM checks pass, focused ESLint passes, production build passes.
Fresh Guest browser visits passed login-form and home visibility assertions with
no reported console/network errors. Home's raw trace has no HTTP failures or
page errors; Socket.IO polling returned200 and upgraded with101. Login capture
was redacted by Harness's sensitive-screen policy, so its overall report is
false for capture actions despite passing page assertions. Raw login artifacts
are not committed. See `evidence/entry-pages/browser-summary.json`.

Windows HTTP verification also confirms both entry pages serve Vite without
unrendered templates or a missing manifest link; `/src/main.tsx` returns200
with JavaScript MIME type. Regression fixtures were cleaned; the owner demo remains.


## Role-aware onboarding increment (2026-09-22)

See [roles, membership, onboarding, theme and time](roles-and-onboarding.md) for
the full record. Summary:

- `bench --site meet-beta-implement-owned-booking-slice-a95902.localhost migrate`
  added `Business Membership` + `Membership Location` and synced the DocPerm
  role rename `Front-Desk` -> `Front Desk`. Applied only to this isolated site.
- Runtime was restarted (`frappe-worktree stop` then `up`) because Python/hook
  changes required it; ordinary startup must not migrate. `common_site_config`
  and the site hostname are unchanged.
- New endpoints: `appointment.scheduler.membership.context`,
  `select_workspace`, `assign_member`, `revoke_member`, `members`, `directory`,
  `provider_options`, `location_options`. `get_desk_appointments` now accepts
  `organization` and returns scope/timezone/next-date metadata.
- Retained acceptance demo: businesses **Bole Bloom Studio** and **Kazanchis
  Dental Care** with new-owner, owner, provider, receptionist, second-business,
  multi-business and unassigned accounts. Credentials and the exact cleanup
  manifest are in the mode-600 private file `private/acceptance-demo.json`;
  clean with `bench --site <site> execute appointment.tests.acceptance_demo.reset`.
  The owner's `Minte cafe` / `CMC` / `Best Cafe` data is preserved.
- Browser QA: `appointment.qa_runner.run` with `fixture_scope='acceptance_demo'`
  and `qa/manifests/owned-booking/role-*.yaml`; BQA-2026-00066/67/68/69 passed
  with zero console/network errors. Evidence under `docs/implementation/evidence/roles`.
- Automated: `bench --site <site> execute appointment.tests.test_membership.run`
  (7/7 pass, exact cleanup).

