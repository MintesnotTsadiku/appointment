# Appointment testing guide

The rename is complete and canonical; the app was never released, so there is no
legacy upgrade path to preserve and no compatibility shim. Test on a fresh site.
The cloned-data site is used only for preservation checks.

## Fresh install

```bash
bench new-site <site>.localhost \
  --db-root-username root --db-root-password <root> \
  --admin-password <admin> \
  --install-app appointment
bench --site <site> migrate
bench --site <site> migrate
```

Expected:

- `bench --site <site> list-apps` shows `frappe, appointment`, never
  `frappe_appointment`.
- The second `migrate` executes no new patches and reports no errors.
- `Module Def Appointment` is owned by `appointment`; `Module Def "Frappe
  Appointment"` does not exist.
- The ten module-owned DocTypes use module `Appointment`.
- `Appointment Settings` has the three default email templates selected.
- The app switcher and Desk show **Appointment**.

## Local isolated runtime

The rig used for browser QA:

```bash
frappe-worktree \
  --worktree /home/minte/projects/training-apps/.worktrees/frappe-appointment-readiness \
  --source-bench /home/minte/projects/training-apps \
  --runtime-root /home/minte/projects/appointment-worktree-runtimes up
```

Always read the ports and browser host from that runtime's `manifest.json`;
do not assume another worktree's ports.

- Site: `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`
- UI: `http://localhost:<frontend_port>` and `http://<browser_host>:<frontend_port>`
- Frappe Desk: `/app` (301 → `/desk/<workspace>`); public booking:
  `/schedule/org/...`; reception: `/reception`

Credentials live in the runtime's `credentials.json` and are never copied into
source.

`frappe-worktree create/up` installs the dependency apps (`agent_harness`,
`agent_plane`) normally. This requires the Agent Plane fix in
`agent_plane/setup/seed.py` that skips the deprecated `Workspace Sidebar` /
`Desktop Icon` seeds. No Appointment-owned installation workaround exists.

### Vite proxy / Desk routing

`frontend/vite.config.ts` must proxy `/app`, `/apps`, `/desk`, `/api`,
`/assets`, `/files`, `/private`, `/login` and `/logout` to the Frappe web server,
and `/socket.io` to the Socket.IO server with `changeOrigin: false`. Without the
`/desk` (and `/apps`) rules, `/app` → `/desk` is served by the SPA, which renders
its own 404 page. A nonblank 404 must never count as Desk validation.

### Realtime lifecycle

The app owns exactly one Socket.IO connection in
`frontend/src/components/realtime/RealtimeProvider.tsx`. `FrappeProvider` is
rendered with `enableSocket={false}` because `frappe-react-sdk@1.11.0` creates
its socket during render with no cleanup, which leaks a second engine.io
connection under React StrictMode. StrictMode stays enabled; the app-owned
socket uses a module-level singleton plus a consumer count so a StrictMode
remount keeps a single live connection. `npm run test:realtime` guards these
invariants.

## Tests

```bash
bench --site <site> set-config allow_tests true
for module in \
  appointment.tests.test_app_identity \
  appointment.tests.test_scheduling_workflows \
  appointment.tests.test_data_preservation; do
  bench --site <site> run-tests --module "$module" --skip-before-tests
done
```

- `test_app_identity` — canonical app/module/package identity; skips the
  business-data comparison on a fresh site.
- `test_scheduling_workflows` — provider/service configuration, availability
  persistence, reception booking, reschedule, cancel, walk-in queue, public
  booking catalog, EN/AM translations. Creates and removes marker-prefixed QA
  records.
- `test_data_preservation` — exact cloned-data counts, appointment/provider/
  service/location link integrity, organization ownership, provider-organization
  membership, Role/DocPerm configuration and product-owned file checksums. Writes
  a redacted snapshot to `/tmp/appointment_qa/preservation-snapshot.json`.

Frontend checks:

```bash
cd frontend
npm run test:dom       # DOM-nesting guard + realtime lifecycle guard
npm run test:realtime  # realtime lifecycle guard only
npx vite build --base=/assets/appointment/frontend/
```

## Fresh QA site with Agent Plane

```bash
bench new-site <qa-site>.localhost \
  --db-root-username root --db-root-password <root> \
  --admin-password <admin> --install-app appointment
bench --site <qa-site> install-app agent_harness
bench --site <qa-site> install-app agent_plane
bench --site <qa-site> migrate
bench --site <qa-site> list-apps
```

Expected: `appointment`, `agent_harness`, `agent_plane` installed; `Agent Version`
`Public Web Research Agent-v1` present; `Runtime Settings
public_web_research_agent_version` set to it; no `Workspace Sidebar` / `Desktop
Icon` records (deprecated in current Frappe metadata). This is the normal
upstream installation path; there is no Appointment-owned bootstrap shim.

## Browser QA and baseline policy

```bash
bench --site <site> execute appointment.qa_runner.run \
  --kwargs '{"manifest_name": "<worktree>/qa/manifests/appointment_scheduling_smoke.yaml", "base_url": "http://localhost:<frontend_port>"}'
```

Runs through `agent_plane.api.run_browser_qa_manifest` with `frappe_session`
authentication and never calls Playwright directly. Deterministic fixtures are
created and cleaned by `appointment.qa_runner.run` through
`appointment.qa_fixtures`; the run result includes a `fixture_cleanup` report.

**Screenshot baseline policy:** the committed manifests are **functional smoke
suites, not visual-regression suites.** They set
`options: {ignore_baseline_drift: true}` so screenshot drift is recorded as a
review finding but does not gate the run; screenshots and traces are retained as
evidence. There is no committed visual baseline set. If a visual-regression
suite is added later it must commit managed baselines under a controlled
`baseline_root`, review every initial image, and rerun without `update_baseline`.

**Console/network policy:** scenarios gate on semantic and action assertions plus
a positive realtime handshake assertion (`network_request` on `/socket.io/` with
a 2xx status). The product SPA owns a single socket, so it no longer produces
overlapping engine.io polling `400`s. The Frappe **Desk** frame runs its own
bundled socket client and, in this isolated Vite-proxied dev stack, logs
`Error connecting to socket.io: Invalid origin`; the Desk scenario therefore
gates on semantic assertions (URL `/desk`, `#body`, expected workspace title,
nonblank screenshot) and not on the upstream desk-frame console. Unknown
console/network errors, missing assets, renamed paths and application API
failures remain failures.

Manifests:

- `qa/manifests/appointment_admin_smoke.yaml` — Desk workspace + public landing.
- `qa/manifests/appointment_scheduling_smoke.yaml` — app shell; created service
  survives reload; saved availability survives reload; public booking creates a
  confirmed appointment; reschedule persists after reload; cancel persists after
  reload; walk-in is queued then assigned to a slot; Amharic language selection
  survives reload.

## Certified Agent Harness runtime

The shared training environment does not match the foundation bundle. Verify the
dedicated environment:

```bash
AGENT_PLANE=/home/minte/projects/training-apps/apps/agent_plane/agent_plane
FRAPPE_APP=/home/minte/projects/training-apps/apps/frappe
VENV=/home/minte/projects/appointment-foundation-runtime/venv
PYTHONPATH="$AGENT_PLANE:$FRAPPE_APP:$VENV/lib/python3.14/site-packages" \
  "$VENV/bin/python" "$AGENT_PLANE/foundation_bundle.py" check-installed

AGENT_HARNESS_NODE=~/.nvm/versions/node/v24.12.0/bin/node \
  PYTHONPATH="/home/minte/projects/training-apps/apps/agent_harness:$VENV/lib/python3.14/site-packages" \
  "$VENV/bin/python" - <<'PY'
from agent_harness.browser.playwright_suite import inspect_playwright_runtime
print(inspect_playwright_runtime())
PY
```

## Known environment prerequisites

Not caused by the app:

1. The shared training Python environment does not match the certified Agent
   Harness foundation bundle; use the dedicated runtime above for sign-off.
2. The Frappe Desk frame logs one upstream socket console error in the isolated
   Vite proxy; see the console/network policy above.
