# Business newsletter operations

Newsletter delivery in this implementation uses the local email sink. It does
not send SMTP mail, create upstream Email Queue messages, or contact external
recipients. A sender marked **Verified Local** proves access to the local
verification link only. It does not establish external domain ownership.

Owners open **Website content → Newsletters and audience**. They request sender
verification, open its message in the local inbox, and follow the action link.
Visitors must select the consent checkbox and confirm the separate subscription
link. Pending, unsubscribed, and suppressed members do not receive campaigns.

Campaigns copy the saved newsletter and confirmed audience into an immutable
snapshot. Editing the draft does not change a queued campaign. The request
identity prevents duplicate scheduling; each campaign/member delivery key
prevents duplicate local messages. The worker rechecks business access, sender
verification, and subscriber status before every capture.

The default trial limits are 2,000 audience records and four campaigns per
calendar month. Scheduled campaigns reserve their selected month immediately.
Cancelled campaigns retain their reservation and audit history. The local worker
limits capture to 100 recipients per business and 500 per site per minute.
Throttled campaigns resume through the minute scheduler or the owner's **Check
due campaigns** action. A single campaign supports at most 2,000 recipients.

Run a short-queue worker independently of the managed browser QA worker. Browser
QA uses the default queue and can occupy its worker for the whole journey. The
isolated acceptance stack has a dedicated `newsletter` tmux window serving
`bench worker --queue short`. Its scheduler remains paused; owner-triggered
queueing and due checks work without enabling external side effects.

**Held** means access expired or the sender requires verification. Restore the
capability or sender, then retry. **Error** means local capture failed. Review
the server error log and retry after fixing the cause. At most three retries
are allowed. Previously captured recipients are not captured again. **Delivered**
means capture completed locally; it is not proof of external delivery.

Confirmation links expire after 48 hours and sender links after 24 hours. Both
are single use. Unsubscribe links remain available after entitlement expiry.
Unsubscribe and suppression take effect before the next recipient capture.
Token hashes support lookup; the reusable unsubscribe token uses Frappe's
encrypted Password storage. Preserve the site's private encryption key during
backup and restore. Never put private keys, tokens, or inbox payloads in support
tickets, browser evidence, source control, or public diagnostics.

Audience, campaign, sender, and captured-message records cannot be edited through
raw document APIs. The business permission hooks constrain reads and exports.
The upstream Newsletter send, test-send, subscription, and scheduling paths are
disabled. Mutable upstream Blog routes and global RSS routes are disabled;
public articles use immutable appointment releases.

The acceptance record is
`docs/operations/content-publishing-validation.md`. The local-only workflow does
not establish production email delivery, bounce integration, or external sender
verification. Do not infer those capabilities from a passing local test.
