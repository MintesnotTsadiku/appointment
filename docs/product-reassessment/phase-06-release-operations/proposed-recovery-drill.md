# Proposed bounded backup/restore drill (awaiting owner approval)

Phase 6 did **not** execute a backup or restore. A backup file or command is not
proof of successful restore, and no safe disposable restoration target was
available in this environment. This report records the exact gap and a bounded
drill that can be approved and run later without touching the preserved
assessment site or its data.

## What exists today (verified, read-only)

- Frappe ships standard `bench backup` / `bench restore` commands and a
  `delete_downloadable_backups` maintenance job; these are framework features,
  not product-owned procedures.
- The preserved site's backup directory is **empty**:
  `.../sites/meet-beta-fix-appointment-beta-readiness-01dea7.localhost/private/backups/`
  contains no files (`p6-inventory` run, filesystem inspection 2026-09-22).
- `common_site_config.json` and `site_config.json` define no backup schedule,
  `backup_limit`, or off-site target.
- No repository document describes a backup schedule, restore procedure,
  recovery point objective (RPO), recovery time objective (RTO), or rollback
  rehearsal. The only CI is a PR bench-build test and linters; there is no
  release/deploy/rollback workflow.
- The app has no product backup/restore code. `appointment/qa_preservation.py`
  is assessment snapshot tooling, not a customer backup.

## Why Phase 6 did not execute the drill

- Restoring over the preserved assessment site is explicitly forbidden.
- Creating a new disposable site or installing dependencies to host a restore
  was out of scope and not authorized by this phase's prompt.
- The preserved runtime is a development worktree stack (developer_mode = 1);
  it is not a staging environment representative of production recovery.

## Proposed bounded drill (for approval)

Run only on a disposable, non-customer target. Estimated: 1–2 hours.

1. On a throwaway site or container with the same app versions, take one
   `bench backup --with-files` of a synthetic site seeded with a known small
   fixture (a handful of organizations, providers, services, locations, and
   appointments).
2. Record a checksum/manifest of the fixture and the backup artifacts.
3. Destroy the throwaway database/files (simulating loss).
4. `bench restore` the backup into a fresh, empty throwaway database and restore
   files.
5. Verify: row counts and key relationships match the manifest; a booking can be
   read; a Booking Event and its Appointment/Event links resolve; files resolve.
6. Measure wall-clock restore time to establish a provisional RTO, and document
   the backup cadence needed for a provisional RPO.
7. Record results as evidence; keep the backup contents out of the repository.

## Decisions this drill still needs from the owner

- RPO/RTO targets and backup retention window for real customer data.
- Where off-site/encrypted backups live and who can restore them.
- The rollback procedure for a failed upgrade (app code and schema), rehearsed
  against a disposable target.

Until this drill is run and recorded, backup/restore and recovery objectives
remain **unverified** and must not be marked as passed.
