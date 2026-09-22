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
