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

The rig used for validation:

```bash
frappe-worktree \
  --worktree /home/minte/projects/training-apps/.worktrees/frappe-appointment-fix \
  --source-bench /home/minte/projects/training-apps \
  --runtime-root /home/minte/projects/appointment-worktree-runtimes up
```

Always read the ports and browser host from that runtime's `manifest.json`;
do not assume another worktree's ports.

- Site: `meet-beta-fix-appointment-beta-review-fi-35bb7b.localhost`
- UI: `http://localhost:<frontend_port>` and `http://<browser_host>:<frontend_port>`
- Frappe Desk: `/app` (301 → `/desk/<workspace>`); public booking:
  `/schedule/org/...`; reception: `/reception`

Credentials live in the runtime's `credentials.json` and are never copied into
source.

`frappe-worktree up` copies the primary checkout's `frontend/node_modules` into
the worktree (or runs the adapter `install_command`). `appointment.qa_bootstrap`
is the supported way to install Agent Plane on a brand-new site because
`bench install-app agent_plane` alone still fails on the current Frappe
baseline.

### Vite proxy / Desk routing

`frontend/vite.config.ts` must proxy `/app`, `/apps`, `/desk`, `/api`,
`/assets`, `/files`, `/private`, `/login` and `/logout` to the Frappe web server,
and `/socket.io` to the Socket.IO server with `changeOrigin: false`. Without the
`/desk` (and `/apps`) rules, `/app` → `/desk` is served by the SPA, which renders
its own 404 page. A nonblank 404 must never count as Desk validation.

## Tests

```bash
bench --site <site> set-config allow_tests true
for module in \
  appointment.tests.test_app_identity \
  appointment.tests.test_qa_bootstrap \
  appointment.tests.test_scheduling_workflows \
  appointment.tests.test_data_preservation; do
  bench --site <site> run-tests --module "$module" --skip-before-tests
done
```

- `test_app_identity` — canonical app/module/package identity; skips the
  business-data comparison on a fresh site.
- `test_qa_bootstrap` — disposable-site bootstrap status, failure and
  monkey-patch-restoration behaviour.
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
npm run test:dom     # static DOM-nesting guard for settings/manage
npx vite build --base=/assets/appointment/frontend/
```

## Fresh QA site with Agent Plane

```bash
bench new-site <qa-site>.localhost \
  --db-root-username root --db-root-password <root> \
  --admin-password <admin> --install-app appointment
bench --site <qa-site> execute appointment.qa_bootstrap.install
bench --site <qa-site> migrate
bench --site <qa-site> list-apps
```

`qa_bootstrap.install` returns `requested`, `already_installed`, `installed`,
`failed`, `errors`, `ok` and `installed_apps`, verifies every installed app is
registered, and raises (non-zero exit) on any failure. It only accepts
`agent_harness` and `agent_plane`. This is dev/QA tooling, not a supported
installation path.

## Browser QA and baseline policy

```bash
bench --site <site> execute appointment.qa_runner.run \
  --kwargs '{"manifest_name": "<worktree>/qa/manifests/appointment_scheduling_smoke.yaml", "base_url": "http://localhost:<frontend_port>"}'
```

Runs through `agent_plane.api.run_browser_qa_manifest` with `frappe_session`
authentication and never calls Playwright directly.

**Screenshot baseline policy:** the committed manifests are **functional smoke
suites, not visual-regression suites.** They set
`options: {ignore_baseline_drift: true}` so screenshot drift is recorded as a
review finding but does not gate the run; screenshots and traces are retained as
evidence. There is no committed visual baseline set. If a visual-regression
suite is added later it must commit managed baselines under a controlled
`baseline_root`, review every initial image, and rerun without `update_baseline`.

**Console/network policy:** product SPA scenarios enforce `no_console_errors`
and `no_failed_network_requests`. The Frappe **Desk** frame runs its own bundled
socket client and, in this isolated Vite-proxied dev stack, logs
`Error connecting to socket.io: Invalid origin`; the authenticated engine.io
handshake and namespace connect both return 200 through the proxy. The Desk
scenario therefore gates on semantic assertions (URL `/desk`, `#body`, expected
workspace title, nonblank screenshot) and not on the upstream desk-frame
console. Unknown console/network errors, missing assets, renamed paths and
application API failures remain failures.

Manifests:

- `qa/manifests/appointment_admin_smoke.yaml` — Desk workspace + public landing.
- `qa/manifests/appointment_scheduling_smoke.yaml` — app shell, provider/service
  configuration, availability, reception walk-in, public booking calendar,
  language toggle. Deterministic fixtures are created and cleaned by
  `appointment.qa_runner.run` via `appointment.qa_fixtures`.

## Certified Agent Harness runtime

The shared training environment does not match the foundation bundle. Verify the
dedicated environment:

```bash
PYTHONPATH=/home/minte/projects/appointment-foundation-runtime/venv/lib/python3.14/site-packages \
  /home/minte/projects/appointment-foundation-runtime/venv/bin/python \
  -m agent_plane.foundation_bundle check-installed

AGENT_HARNESS_NODE=~/.nvm/versions/node/v24.12.0/bin/node \
  /home/minte/projects/appointment-foundation-runtime/venv/bin/python - <<'PY'
from agent_harness.browser.playwright_suite import inspect_playwright_runtime
print(inspect_playwright_runtime())
PY
```

## Known environment prerequisites

Not caused by the app:

1. Agent Plane fresh install needs the `appointment.qa_bootstrap` workaround
   (Runtime Settings ordering and deprecated sidebar/desktop-icon seed).
2. The shared training Python environment does not match the certified Agent
   Harness foundation bundle; use the dedicated runtime above for sign-off.
3. The Frappe Desk frame logs one upstream socket console error in the isolated
   Vite proxy; see the console/network policy above.
