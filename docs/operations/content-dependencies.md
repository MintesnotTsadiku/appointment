# Content dependency lock: Blog and Newsletter

**Status:** Phase 0 qualified
**Date:** 2026-09-25
**Primary app:** `appointment`
**Appointment baseline:** commit `18f301e7f93a817443d46e11e4262f3bfc73170d`

Frappe v16 moved Blog and Newsletter out of the framework. Appointment uses the
official upstream apps for article authoring and newsletter delivery. This file
is the dependency lock. Production benches, containers, and deployment manifests
must fetch these exact commits. Do not depend on floating upstream branches in
production.

## Pinned dependency versions

| App | Repository | Ref | Exact commit | Compatible Frappe | License |
| --- | --- | --- | --- | --- | --- |
| Blog | https://github.com/frappe/blog | `develop` | `ed1ed4019c7f167c41b80f8ea92da60680c2112d` | `>=17.0.0-dev,<18.0.0` (declared in `pyproject.toml`) | MIT |
| Newsletter | https://github.com/frappe/newsletter | `develop` | `e5ed3645199104818c354617cb495cbdf90b94fe` | Frappe 17 (no upper pin declared on `develop`) | AGPL-3.0 |

Both repositories are installed with `bench get-app <url> --branch develop` and
then checked out to the exact commit above. The isolated development stack
resolves both apps from the source Bench `apps/` directory through
`.frappe-worktree.json` `dependency_apps` and installs them before Appointment.

## Ref selection notes

- Blog `develop` explicitly declares `[tool.bench.frappe-dependencies] frappe =
  ">=17.0.0-dev,<18.0.0"`. The Blog `version-16` branch is the Frappe 16 line
  and is out of scope.
- Newsletter `develop` declares no upper Frappe pin. The Newsletter `version-16`
  branch pins `frappe >=16.0.0,<17.0.0` and is **not** compatible with this
  repository's Frappe 17 baseline. Do not pin Newsletter to `version-16` here.
- The Blog app is the article authoring system. Appointment does not add a
  second `Article` DocType.
- The Newsletter app supplies campaign composition and delivery infrastructure.
  Installation never grants a business permission to send; Appointment owns
  sender verification, audience consent, suppression, quota, and entitlement.

## Install and upgrade procedure

```bash
# Source Bench (once)
cd "$BENCH"
bench get-app https://github.com/frappe/blog --branch develop
bench get-app https://github.com/frappe/newsletter --branch develop
git -C apps/blog checkout ed1ed4019c7f167c41b80f8ea92da60680c2112d
git -C apps/newsletter checkout e5ed3645199104818c354617cb495cbdf90b94fe

# Isolated stack (per worktree)
frappe-worktree --worktree <worktree> --source-bench "$BENCH" \
  --runtime-root <runtime-root> create
```

`bench install-app appointment` installs `blog` and `newsletter` first through
`required_apps`, provided both are already present in `sites/apps.txt`.
`required_apps` cannot fetch a missing Git repository.

A site-scoped `bench --site <site> migrate` is required after adding these apps
because schema, fixtures, and hooks change. Ordinary stack startup must not
migrate.

## Rollback procedure

1. `bench --site <site> uninstall-app appointment` is not required for a
   dependency rollback; content tables are upstream-owned and retained.
2. Restore the prior pinned commit:
   `git -C apps/blog checkout <previous-sha>` and
   `git -C apps/newsletter checkout <previous-sha>`.
3. `bench --site <site> migrate`.
4. If an upgrade introduced new DocTypes that must be removed, restore the site
   from the pre-upgrade backup (SQL + public/private files) rather than issuing
   destructive table drops.

## Qualification status

- [x] Repository URLs recorded.
- [x] Exact commits pinned and licenses recorded.
- [x] Frappe compatibility reviewed from upstream metadata.
- [ ] Both apps install on a disposable site (Phase 0 execution).
- [ ] DocTypes, routes, permissions, hooks, background jobs, unsubscribe
      behavior, and upgrade support inspected on a live site.
- [ ] Clean install, migrate, backup, restore, and uninstall proven.

The unchecked items are completed and evidenced during the isolated-stack
provisioning and Phase 0 verification run recorded in
`docs/features/CONTENT_PUBLISHING_GALLERY_AND_GUIDED_WEBSITE_SETUP_IMPLEMENTATION_PLAN.md`.
