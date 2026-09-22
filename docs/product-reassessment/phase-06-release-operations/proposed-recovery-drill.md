# Proposed bounded recovery drill — not executed

Recovery remains unverified. The assessment site must not be overwritten. No safe
disposable target was established during this phase, and creating one was outside
its authorized scope. The owner must approve the target and drill before execution.
Do not create infrastructure or run this plan as part of Phase 7 synthesis.

## Existing evidence

Frappe provides database/file backup and restore facilities, including protected
configuration and optional backup encryption. The assessed site's local backup
folder was empty; this does not establish the absence of external/platform backups.
Historical repository documents mention backups and rollback, but no approved,
rehearsed production recovery procedure was verified. Missing site-config schedule
keys do not rule out external scheduling.

## Approved scope to establish first

- Exact disposable source and separate empty restoration target; neither may be
  the preserved assessment site or contain customer data.
- Pinned framework/app versions and dependency/runtime requirements.
- Small synthetic manifest covering organizations, staff, customers, supported
  booking records, availability, status changes and public/private file attachments.
- Restore credentials, configuration/encryption-key custody and backup decryption
  material. Keep all secrets and backup contents out of source/evidence reports.
- Network isolation and muted notifications before services start, so restored
  integrations, jobs and credentials cannot contact real systems.
- Recovery time objective (maximum acceptable service interruption) and recovery
  point objective (maximum acceptable data loss), chosen for the intended cohort.

## Bounded procedure

1. Create the approved synthetic source and record fixture identifiers, key
   relationships, representative values and file checksums. Do not include secrets.
2. Back up database, public/private files and required protected configuration.
   Verify artifact readability/checksums and record tool/app versions. Keep an
   untouched copy of the source as the comparison reference.
3. Restore into the separate approved empty target. Simulated loss does not
   require deleting the source. Reconcile target-specific connection configuration
   while preserving the encryption material needed to read encrypted fields.
4. Before enabling application access, verify mail remains muted, scheduler policy
   and network isolation remain safe, and no restored job can dispatch externally.
5. Compare fixture content, ownership, supported links, statuses and attachments
   with the manifest. Verify private-file access and tenant/role boundaries.
   Check representative booking read/update behavior without assuming the current
   split Booking Event/Appointment model already has correct synchronization.
6. Record elapsed restore and validation times, steps requiring manual work and
   errors. A tiny synthetic restore supplies rehearsal measurements, not a proven
   production-scale RTO. Backup cadence alone does not prove RPO: verify that
   backups complete, are retained, and can be retrieved/decrypted.
7. Record results and limitations. Remove only the approved disposable resources
   after evidence is retained securely; preserve the assessment runtime.

## Separate upgrade-recovery check

For a selected candidate release, rehearse forward upgrade and recovery on an
approved disposable target. Restoring only old source code may not reverse schema
changes. Specify whether recovery uses rollback, forward repair or a matched
code/database/files restore, and verify resulting behavior and data-loss bounds.
There is no migration obligation for today's seed data; this prepares for future
real customer releases.

Off-site storage, encryption, access controls, retention, restore authorization,
monitoring and responsible operators need explicit decisions. No duration/cost
estimate or successful recovery claim is supported until the drill is executed.
