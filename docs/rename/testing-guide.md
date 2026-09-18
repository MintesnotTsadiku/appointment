# Appointment testing guide

The rename is complete and canonical; the app has not been released, so there is
no legacy upgrade path to preserve. Test on a fresh site.

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

- `bench --site <site> list-apps` shows `appointment` (plus any dependencies),
  never `frappe_appointment`.
- The second `migrate` executes no patches and reports no errors.
- `Appointment Settings` has the three default email templates selected.
- The app switcher and Desk show **Appointment**.

## Local isolated runtime

The rig used for validation:

```bash
cd /home/minte/projects/training-apps/.worktrees/frappe-appointment-rename
frappe-worktree --runtime-root /home/minte/projects/appointment-worktree-runtimes up
```

- Site: `meet-beta-refactor-rename-to-appointment-4c34e9.localhost`
- UI: `http://127.0.0.1:<frontend_port>` and `http://127.0.0.141:<frontend_port>`
- Desk: `/app`; public booking: `/schedule/...`; reception: `/reception`

Credentials live in the runtime's `credentials.json` and are never copied into
source.

## Tests

```bash
bench --site <site> set-config allow_tests true
bench --site <site> run-tests --module appointment.tests.test_app_identity \
  --skip-before-tests
```

## Browser QA

```bash
bench --site <site> execute appointment.qa_runner.run \
  --kwargs '{"manifest_name": "<app>/qa/manifests/appointment_admin_smoke.yaml", "base_url": "http://127.0.0.141:<frontend_port>"}'
```

Runs through `agent_plane.api.run_browser_qa_manifest` with `frappe_session`
authentication. Manifests live in `qa/manifests`.

## Fresh QA site with Agent Plane

Agent Plane's fresh install currently fails on the current Frappe baseline in
two places that are outside this app: the `Runtime Settings` Link default is
saved before its Agent Version exists, and the `after_install` seed still writes
deprecated `Workspace Sidebar`/`Desktop Icon` records. `appointment.qa_bootstrap`
works around both for a disposable site:

```bash
bench new-site <qa-site>.localhost \
  --db-root-username root --db-root-password <root> \
  --admin-password <admin> --install-app appointment
bench --site <qa-site> execute appointment.qa_bootstrap.install
bench --site <qa-site> migrate
bench --site <qa-site> list-apps
```

Expected: `appointment`, `agent_harness`, `agent_plane` installed; `Agent
Version` `Public Web Research Agent-v1` present; `Runtime Settings
public_web_research_agent_version` set to it. This is dev/QA tooling, not a
supported installation path.

## Certified Agent Harness runtime

The shared training environment does not match the foundation bundle. Provision
a dedicated environment and verify it:

```bash
uv venv <dir>/venv --python 3.14 --python-preference system
uv pip install --python <dir>/venv/bin/python --require-hashes \
  -r apps/agent_plane/constraints/foundation-py314.txt
PYTHONPATH=<dir>/venv/lib/python3.14/site-packages \
  python -m agent_plane.foundation_bundle check-installed   # "matches ... 2026.07.2"

AGENT_HARNESS_NODE=~/.nvm/versions/node/v24.12.0/bin/node python - <<'PY'
from agent_harness.browser.playwright_suite import inspect_playwright_runtime
print(inspect_playwright_runtime())
PY
```

The reference provisioned runtime is
`/home/minte/projects/appointment-foundation-runtime/venv`.

## Browser QA

```bash
bench --site <site> execute appointment.qa_runner.run \
  --kwargs '{"manifest_name": "<app>/qa/manifests/appointment_admin_smoke.yaml", "base_url": "http://127.0.0.141:<frontend_port>"}'
```

Runs through `agent_plane.api.run_browser_qa_manifest` with `frappe_session`
authentication. Manifests live in `qa/manifests`.

## Known environment prerequisites

Not caused by the app:

1. Agent Plane fresh install needs the `appointment.qa_bootstrap` workaround
   above (Runtime Settings ordering and deprecated sidebar/desktop-icon seed).
2. The shared training Python environment does not match the certified Agent
   Harness foundation bundle; use the dedicated runtime above for sign-off.
3. Outbound DNS is unavailable, so the landing page's external
   `logo.clearbit.com` images fail; expect those network findings unless the
   environment is online.
4. `settings/manage` logs a pre-existing React `validateDOMNesting` warning from
   `HierarchyTree.tsx` (button inside button).
