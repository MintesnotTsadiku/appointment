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

## Known environment prerequisites

Not caused by the app and not fixable in this repository:

1. `bench install-app agent_plane` on a brand-new site fails in `init_singles`
   because the `Runtime Settings` Link default (`Public Web Research Agent-v1`)
   precedes its Agent Version seed. Install the dependency apps for QA by
   restoring a prepared backup, or seed the Agent Version first.
2. The shared training Python environment does not match the certified Agent
   Harness foundation bundle; browser QA sign-off needs a dedicated certified
   runtime.
3. This environment has no outbound DNS, so the landing page's external
   `logo.clearbit.com` images fail; expect those network findings unless the
   environment is online.
4. `settings/manage` logs a pre-existing React `validateDOMNesting` warning from
   `HierarchyTree.tsx` (button inside button).
