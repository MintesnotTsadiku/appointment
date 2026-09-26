# Content publishing operations

This runbook covers the tenant-owned publication, website, media, workbook, and
local newsletter services. The release candidate remains in validation. Use the
progress record for accepted and pending gates.

## Runtime and dependency checks

Use the exact Blog and Newsletter revisions in `content-dependencies.md`. Check
the installed apps and Git revisions before migration. Keep the configured
Frappe version and the database encryption key with the private recovery record.
Do not place database credentials, subscriber tokens, session state, or browser
authentication traces in source control.

In a worktree runtime, export both `PYTHONPATH` for that checkout and
`FRAPPE_BENCH_ROOT` for its isolated Bench. Run Bench commands from that Bench.
A missing site or a different application import path is a configuration error.
Stop and correct it before migration or publication. Startup must not migrate.

Run a site-scoped migration after a schema or permission change. The install and
migration hooks maintain upstream Custom DocPerm rows. Tenant permission hooks
still filter category, author, article, newsletter, and gallery access. A global
content role does not grant access to another business.

## Owner support diagnostics

A signed-in owner can call
`appointment.content.diagnostics.business_health(site=<public-site-name>)`.
The endpoint refuses another business. It returns release and audience status
counts, media usage, pending campaign retries, due queue age, and operation
counters. It does not return recipient addresses, message bodies, tokens, or
credentials.

Operation counters distinguish success, failure, exception class, and held,
scheduled, error, or delivered worker results. Publication, previews, media
uploads, workbook review and confirmation, newsletter queues and retries, and
consent actions produce private `content_operations` logs without input payloads.
Counters expire after 90 days and are advisory. Cache loss resets them; durable
release, import, consent, and delivery audit records remain authoritative.
Unattributed events, including invalid public tokens, remain in the private
operator log and unscoped counters. Do not expose those counters to an owner.

There is no external email transport. Bounce and complaint delivery telemetry is
unavailable by design. Do not interpret its absence as successful external mail.

## Failed publication or preview

Check that the acting user has an active business membership or owns the
independent provider. Confirm that the content ownership row points to the same
business and website. A category or author from another site must fail
publication. Do not repair ownership by relinking a foreign record.

Check the feature entitlement and limits, route owner, image consent, decoded
image validation, and expected draft version. Reload a stale draft before
retrying. A preview is private and bound to its session; it does not publish.
Use the normal workspace to publish, withdraw, or roll back. Never edit an
immutable release row to repair a route or hash.

For seeded demonstrations only, an operator may run the guarded
`appointment.demo.content_world.bind_owned_support` upgrade. It binds only
category and author records already listed in the private seeder journal and
refuses conflicting mappings. It is not a general migration or a restore repair
command. Repeating it creates no additional mappings and changes no release.

## Media or workbook failures

Use the owner upload control and confirm public-display consent. Image bytes must
pass decoding and belong to the exact Public Site. Renaming an executable file
or changing its MIME type must not make it acceptable. Private originals must
not be used in a public release.

Use the workbook dry-run report to correct the named sheet and cell. Download
the versioned template again if its columns or schema were changed. Confirmation
must match the reviewed checksum. Retrying the same workbook returns its audit
and does not create duplicate records. Corrected stable keys update records;
missing rows do not delete them.

Invite staff through Team. Each invitee chooses their own password on acceptance.
The owner then assigns the accepted account to a role and location/provider
scope. Never place a password in a workbook. Revoking an invitation does not
replace revoking an existing membership.

## Newsletter queues and consent

Keep external delivery disabled and run the isolated newsletter worker on its
configured queue. Do not add a second worker with the same identity. Check due
campaign count and oldest due age. Scheduled campaigns require the explicit due
run while the development scheduler is paused.

A held campaign requires an active entitlement and verified sender before retry.
An error requires review of the local capture failure. Retry through the owner
workspace; the campaign cursor and message identity prevent duplicate captures.
Do not reset a cursor or insert local delivery messages by hand.

Consent, suppression, and unsubscribe state are checked again before each
recipient capture. A guest unsubscribe must not restore a suppressed subscriber.
Invalid tokens must return a generic failure without recipient information.

## Backup and restore

Back up the site database, public files, private files, and site configuration.
Preserve the encryption key privately; encrypted consent tokens cannot be
recovered with a different key. Keep the pinned application revisions with the
backup inventory. Browser traces in private files require the same access
controls as credentials.

Restore into a separate isolated target first. Keep emails muted and scheduling
paused. Verify canonical release hashes, actual file checksums, authoring and
ownership records, subscriber status and consent audit, decrypted token hashes,
and delivery audit. Then use managed browser sessions to check public routes,
media loading, and a synthetic unsubscribe. Data integrity alone does not prove
route recovery.

The recorded drill restored backup `20260926_163236` into
`meet-beta-content-restore.localhost`. The data inventory matched for 35 content
releases, 15 media files, and two synthetic consent records. Public-route recovery
and code rollback evidence must be recorded separately before staging.

## Upgrade and rollback gate

Take a verified backup before changing application revisions. Validate upgrade
and rollback on the separate restored target, with the pinned dependencies and
both frontend and backend revisions recorded. Preserve the original checkout,
its untracked files, and the reference runtime.

Do not downgrade a database by deleting new DocTypes, releases, audiences, or
files. A code rollback requires a compatibility test against the retained schema;
otherwise restore the matching database and media backup into a replacement
runtime. Switch traffic only after the restored public routes and consent paths
pass managed browser acceptance. The current progress record must identify any
remaining compatibility or manual accessibility checks.
