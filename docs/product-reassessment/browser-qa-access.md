# Reusable browser QA access

These persistent synthetic identities belong only to the isolated Appointment
reassessment site. They are retained across phases; never include them in normal
fixture cleanup. Do not reuse them outside this site or grant System Manager to
make a product scenario pass.

| Persona | User / explicit auth.username | Browser Account | Primary Browser Session | Assigned product role |
|---|---|---|---|---|
| Organization manager | appointment-review-manager@example.test | BACCT-0061 | BSESS-0062 | Organization Manager |
| Provider | appointment-review-provider@example.test | BACCT-0063 | BSESS-0064 | Provider |
| Reception | appointment-review-reception@example.test | BACCT-0065 | BSESS-0066 | Front-Desk |
| Customer | appointment-review-customer@example.test | BACCT-0067 | BSESS-0068 | No product/staff role; Website User |

Staff also have framework All, Guest and Desk User roles. The customer has All
and Guest. Do not add the alternate Front Desk spelling without demonstrating
why it is required; the two spellings are a Phase 2 permission question.

Each Browser Account is active, uses the Custom SaaS platform, has an encrypted
credential_password, and a primary session. Domain scope is restricted to
localhost, 127.0.0.118 and the named isolated site. Account ownership is
Administrator for credential administration; the credential usernames and tested
personas are the users above, not Administrator.

## Verification and limitations

On 2026-09-21 all four stored credentials successfully logged in through the
frontend proxy, and `frappe.auth.get_logged_user` returned the exact expected
user. Verification sessions were logged out. No password, cookie or token was
printed or committed. Browser Account health reflects this HTTP authentication
check; no claim is made that a persistent graphical browser session is open.

Business records were not created for these identities. A phase must attach
synthetic organization/provider/staff fixtures appropriate to its scenario and
verify those permissions. Use fresh dedicated users for fresh-signup tests or
additional independent tenants when needed. These identities must not be used
to represent multiple independent people simultaneously.

## Runtime

- Runtime root: `/home/minte/projects/appointment-worktree-runtimes`
- Runtime: `fix-appointment-beta-readiness-01dea7`
- Bench: `/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench`
- Source: `/home/minte/projects/training-apps/.worktrees/frappe-appointment-readiness`
- Site: `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`
- Browser frontend: `http://localhost:49510`
- Desk: `http://localhost:49510/app`
- Internal frontend/backend: `http://127.0.0.118:49510` / `http://127.0.0.118:49511`
- Certified Python environment: `/home/minte/projects/appointment-foundation-runtime/venv`
- Certified foundation bundle: `2026.07.2`

The existing runtime was restarted with `frappe-worktree up`, without migration.
Frontend/backend readiness returned 200; muted email and paused scheduler were
confirmed. Restart verification now reports the Appointment import under the
readiness worktree. The historical Phase 1 import-path caveat remains part of
that run's evidence, not a statement of current runtime state. Recheck runtime
revision and import/build provenance before attributing future results.

For status:

```bash
frappe-worktree --worktree /home/minte/projects/training-apps/.worktrees/frappe-appointment-readiness \
  --runtime-root /home/minte/projects/appointment-worktree-runtimes status
```

Restart only if stopped, from the preserved source directory:

```bash
frappe-worktree --runtime-root /home/minte/projects/appointment-worktree-runtimes up
```

## Authentication and execution

Use Agent Plane and Agent Harness through `appointment.qa_runner.run`; never
invoke Playwright directly. Read current runner/manifests before executing.
For a provider manifest, set:

```yaml
app: appointment
base_url: http://localhost:49510
default_role: Provider
auth:
  type: frappe_session
  username: appointment-review-provider@example.test
  verify_path: /api/method/frappe.auth.get_logged_user
capture_trace: true
capture_video: true
capture_instruction_timeline: true
```

**Always specify auth.username.** A role label is not a user. The runner calls
`frappe.set_user("Administrator")` to orchestrate QA; explicit auth.username
ensures the browser tests the intended persona. Use separate manifests per
identity unless the installed runner explicitly supports per-scenario auth.

`frappe_session` creates the session server-side and does not need a password
in the manifest. Stored Browser Account credentials remain available to Agent
Plane's supported managed-login paths; do not assume the product runner accepts
a browser_account argument or resolves one automatically. Do not export or
manually paste decrypted credentials. Use the record IDs for safe discovery.
Guest journeys must actually run as Guest, not the customer/staff identity;
verify the installed frappe_session Guest behavior before claiming anonymity.

From the selected Bench:

```bash
bench --site meet-beta-fix-appointment-beta-readiness-01dea7.localhost \
  execute appointment.qa_runner.run \
  --kwargs '{"manifest_name":"<absolute-phase-manifest-path>","base_url":"http://localhost:49510"}'
```

Run certified preflight before browser execution. Check effective capture policy
and resulting artifacts: capture_video true alone did not produce video in the
historical Phase 1 run. Preserve failures and report missing artifacts honestly.

## Fixture and credential preservation

The existing runner invokes qa_fixtures.setup/teardown. Its fixtures are initially
Administrator-owned, so they are not sufficient evidence of least-privileged
access. Inspect and explicitly arrange scenario ownership/membership.

The cleanup implementation includes a QA-BROWSER prefix sweep and removes new
Booking Event/Appointment Group records relative to a snapshot. Serialize runs;
inspect existing records and cleanup scope before use. Do not run it when it
would remove another phase's records. Preserve the users/accounts/sessions above;
their names deliberately do not match its disposable-user prefix. Use exact
manifests for additional synthetic fixtures. If existing runner cleanup cannot
meet preservation requirements, report the blocker rather than modify product
code during an assessment or silently bypass the prescribed entry point.

Existing runtime credentials file, for local operator access only:
`/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/credentials.json`.
Reusable persona passwords live in encrypted Browser Account fields, not that file.
