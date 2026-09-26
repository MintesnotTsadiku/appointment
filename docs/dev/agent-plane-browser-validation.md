# Appointment managed browser validation

Use Agent Plane Browser QA or managed Browser Sessions for browser acceptance.
Do not run Playwright directly as acceptance evidence.

## Isolated content runtime

The authorized development bootstrap creates one normal-user Browser Account.
It grants Provider and Organization Manager roles. It does not grant platform
administrator roles or create business records.

From the isolated Bench:

```bash
export PYTHONPATH=/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta:${PYTHONPATH:-}
export FRAPPE_BENCH_ROOT=/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4/bench
export AGENT_HARNESS_NODE=/home/minte/.nvm/versions/node/v24.12.0/bin/node
export AGENT_HARNESS_PLAYWRIGHT_ROOT=/home/minte/projects/training-apps/apps/agent_harness
cd "$FRAPPE_BENCH_ROOT"
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.tests.content_browser_bootstrap.run
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute agent_plane.qa_workflows.browser_qa_service.get_browser_qa_runtime_status
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.tests.content_browser_bootstrap.enqueue_smoke
```

Use the returned run ID with `content_browser_bootstrap.smoke_status`.
Use `--kwargs "{'name': '<run-id>'}"` to select it.
Export a passing run with `content_browser_bootstrap.export_smoke`.

The helper stores credentials in the private runtime, outside the repository.
Do not print that file or commit authentication traces and session storage.
Agent Plane reads the encrypted Browser Account credential inside its worker.

The `browser-qa` tmux window consumes `short,default`. The `worker` window
consumes `long`. Both require the pinned Harness environment. After restarting
the stack, check the topology before submitting a run. The stack launcher may
restore its original combined worker. Stop that worker before starting the two
runtime-owned scripts under `browser/worker-{browser,long}.sh`.

Always export `FRAPPE_BENCH_ROOT`. Without it, commands can inspect or enqueue
against the source Bench namespace even when they target the isolated site.

Socket.IO also needs `webserver_host=127.0.0.1` in the isolated Bench common
config, with `webserver_port=34341`. Otherwise its authentication callback uses
the browser's unique loopback address, where the internal backend does not listen.
Restart only the isolated Socket.IO pane after changing this setting.

## Evidence boundary

The `content-runtime` suite checks authenticated React and Desk rendering at
desktop and mobile sizes. It also checks the Socket.IO WebSocket namespace.
It does not prove public-template or clean-site owner journeys.

Public-content acceptance must use published immutable content releases.
Capture each certified template, surface, mode, and viewport from the approved
plan. Keep captures and comparisons under `qa/evidence/`.

For a new suite, review its captures before establishing the first baseline.
Use `enqueue_smoke(update_baseline=1)` only for reviewed baseline changes.
Repeat without that flag to prove the strict comparison passes.
