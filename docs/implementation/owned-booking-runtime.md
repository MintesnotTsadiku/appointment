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
the value to another runtime. The corrected namespace handshake passed.

Agent Plane's allowed domains on this site are `localhost`, `127.0.0.20` and the
exact site hostname. Test users are least-privileged synthetic providers;
no Administrator Browser Account was created for these checks.

Windows status found localhost:25310 reachable, but the unique 127.0.0.20 host
unreachable from Windows. No forwarding rule was installed. Thus Windows unique
host access remains unverified; Linux browser acceptance is complete. If Windows
access is needed, run the same launcher command with `windows-forward` after
explaining its UAC prompt, then `windows-status`. Do not expose 0.0.0.0 or replace
an unowned rule. After successful forwarding, Windows opening commands are:

```powershell
Start-Process 'http://127.0.0.20:25310'
Start-Process 'http://127.0.0.20:25310/app'
```

The running site/database are retained for follow-up; fixture records and sessions
were removed. No site, database, worktree or assessment resource was deleted.
