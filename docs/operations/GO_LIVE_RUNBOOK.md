---
tags: [runbook, appointment, operations, go-live]
created: 2026-10-10
status: draft
---

# Go-live runbook

This runbook starts on a provisioned server and ends with the first business taking bookings. The infrastructure (DNS, TLS, Nginx, systemd) is in the [deployment plan](DEPLOYMENT_AND_SERVER_PLAN.md).

In the commands, `<site>` is the canonical Frappe site name. `<platform host>` is the public platform hostname, for example `appointments.example.com`.

## 1. Before you start

These decisions are open. Close them before you provision the server. See [deployment plan §8](DEPLOYMENT_AND_SERVER_PLAN.md#8-open-decisions).

| # | Decision | Effect on this runbook |
|---|---|---|
| 1 | Hosting shape. **Decided 2026-10-10:** the user's existing multi-bench setup on AWS EC2. This app gets its own bench on that host. | Sections 2, 5 and 8 |
| 2 | Managed CDN custom hostnames, or self-managed Nginx with ACME | `brand_public_experience_edge_*` keys in section 3 |
| 3 | Certificates: certbot HTTP-01, or a DNS-01 wildcard | Section 3, `brand_public_experience_edge_tls` |
| 4 | Backup RPO, RTO and retention | Section 7 |
| 5 | The platform hostname, and whether platform subdomains launch with v1 | `host_name` and the platform host keys in section 3 |

You also need these items from outside the team:

| Item | From | Used in |
|---|---|---|
| Chapa secret key and webhook secret | Chapa dashboard | Section 4.1 |
| AfroMessage token, and the approved sender name if there is one | AfroMessage | Section 4.2 |
| SMTP account for the platform sender address | Mail provider | Section 4.3 |
| Reviewed Amharic catalog | Amharic reviewer | Section 6 |

## 2. Install and build

Do these steps as the bench user on the server.

1. Get the app from the release branch:
   `bench get-app appointment <repository URL> --branch <release branch>`
2. Create the site: `bench new-site <site> --db-root-username <root user>`
3. Record the site's `encryption_key` in the secret store. You cannot read Password fields without it.
4. Install the app: `bench --site <site> install-app appointment`
5. Build the app assets: `bench build --app appointment`. This runs `npm install` and the frontend build.
6. Run the migrations: `bench --site <site> migrate`
7. Make sure `apps/appointment/appointment/public/frontend/index.html` exists.
8. Install `wkhtmltopdf` with patched Qt. Receipts and statements need it.

Do not install demo or QA data on a live site. Do not copy a development or showcase site to production.


### On the existing multi-bench host

- Give this app its own bench directory and its own Python virtual environment. Do not add it to another app's bench.
- Pick ports that no other bench on the host uses: `webserver_port`, `socketio_port`, and the `redis_cache`, `redis_queue` and `redis_socketio` ports in `common_site_config.json`. List the ports in use first: `ss -ltn`.
- Each bench has its own `supervisor` or `systemd` group. Name it after this bench, so that restarting it does not restart the others.
- Nginx: `bench setup nginx` writes one file per bench. Include it next to the other benches' files, then run `nginx -t` before reloading. Only one Nginx serves ports 80 and 443 for all benches.
- Each bench builds its own assets: `bench build --app appointment`. Do not share `sites/assets` between benches.

## 3. Site config

Set each key with `bench --site <site> set-config <key> <value>`. Use `-p` for numbers and lists.

| Key | Production value | Why |
|---|---|---|
| `host_name` | `https://<platform host>` | Background jobs build emailed links and Chapa return URLs from it. |
| `guest_booking_limit_per_ip` | absent (default 10) | Guest bookings per IP in 10 minutes. Set higher only on QA sites; the readiness report warns above 10. |
| `guest_booking_limit_per_email` | absent (default 3) | Guest bookings per email address per business in 10 minutes. The readiness report warns above 3. |
| `encryption_key` | Set by `new-site`. Never change it. | It decrypts the Chapa keys and the Email Account password. |
| `developer_mode` | `0` | Developer mode shows tracebacks and allows DocType edits. |
| `mute_emails` | `0` | With `1`, no booking email leaves the site. |
| `mute_sms` | `0`, or absent | With `1`, SMS rows are recorded as Skipped. If absent, SMS follows `mute_emails`. |
| `pause_scheduler` | `0` | Reminders, payment holds and statements need the scheduler. |
| `maintenance_mode` | `0` | With `1`, the site blocks every visitor. |
| `brand_public_experience_platform_host` | `<platform host>` | Target hostname for the rendered Nginx config and the DNS instructions. |
| `brand_public_experience_platform_hosts` | `["<platform host>"]` | The resolver accepts only these hosts as platform hosts. |
| `brand_public_experience_edge_tls` | `1` | The rendered Nginx config listens on HTTPS. |
| `brand_public_experience_edge_staging_dir` | A path the Nginx reconcile job reads | The outbox worker writes `public-experience.conf` there. Needed before the first custom domain. |
| `webserver_port`, `socketio_port` | The bench ports, for example `8000` and `9000` | The rendered Nginx config proxies to them. |
| `afromessage_token` | The AfroMessage token | See section 4.2. |
| `gateway_rate_limit` | Absent (default `100`), or a tuned value | Rate limit of the channel gateway API. `0` turns the limit off. Do not use `0`. |
| `push_relay_server_url` | Absent, unless push notifications launch | The frontend boot reads it. |
| `server_script_enabled` | Absent or `0` | The app does not use server scripts. |
| `appointments.skip_availability_cron` | Absent | With `true`, the daily availability check does not run. |

Remove these development keys from `site_config.json` and `common_site_config.json`:

| Key | Used by |
|---|---|
| `rich_demo_enabled` | The showcase seed |
| `worktree_development` | The worktree stack and the showcase seed |
| `isolated_test_suites` | The test runner |
| `allow_tests` | The test runner |
| `brand_public_experience_mode` | Nothing. The app no longer reads it. |

Set `bench_id` in `common_site_config.json` only. If `bench_id` is in `site_config.json`, the readiness report does not find the scheduler heartbeat.

## 4. Secrets

Keep each secret in the secret store (AWS Secrets Manager or SSM). Do not put a secret in a ticket, a commit or a chat. The readiness report shows only whether each secret is set.

### 4.1 Chapa

Online payment is off until a business turns on Chapa. Who holds the keys depends on who collects the payment:

| Collector | Where the keys go |
|---|---|
| The platform | Desk, **Payment Settings**: `chapa_secret_key`, `chapa_webhook_secret` |
| The business | `/settings/payments`, Chapa section, as the business owner |

1. In the Chapa dashboard, copy the secret key.
2. In the Chapa dashboard, set the webhook URL:
   `https://<platform host>/api/method/appointment.scheduler.payments_chapa.webhook`
3. In the Chapa dashboard, set a webhook secret. Use a new random value.
4. Enter the secret key and the webhook secret in the place from the table.
5. In **Payment Settings**, fill in the legal name, the receipt prefix and the TIN. Platform receipts show them.
6. Test with the Chapa test keys first. Make one booking that needs payment, pay with a Chapa test card, and make sure the booking becomes Confirmed.
7. Make sure the payment has a receipt PDF.
8. Replace the test keys with the live keys.

The webhook rejects a request without a valid `x-chapa-signature`. The app confirms a payment only after the Chapa verify API confirms the full amount. See [the booking payments plan](../features/BOOKING_PAYMENTS_PLAN.md).

### 4.2 AfroMessage SMS

SMS is off until a business turns it on. The platform has one AfroMessage account.

1. In Desk, open **SMS Settings** and set:
   - SMS Gateway URL: `https://api.afromessage.com/api/send`
   - Message Parameter: `message`
   - Receiver Parameter: `to`
   - Use POST: on
   - Parameters: `Content-Type` = `application/json`, with Header on.
2. If AfroMessage approved a sender name, add the parameter `sender`. If AfroMessage gave an identifier ID, add the parameter `from`.
3. Put the token in site config, not in SMS Settings:
   `bench --site <site> set-config afromessage_token <token>`
   The SMS Parameter value field holds only 255 characters.
4. Turn on "Also send SMS" for one business at `/settings/notifications`.
5. Make a booking with a test phone number. Make sure the SMS arrives.
6. After 15 minutes, open the Appointment Notification row. Make sure its status is Delivered. If it stays Sent, record the status value AfroMessage returned.

See [the customer notifications plan](../features/CUSTOMER_NOTIFICATIONS_PLAN.md).

### 4.3 Outgoing email

1. In Desk, create an **Email Account** with the platform sender address.
2. Set the SMTP server, port, TLS and password from the mail provider.
3. Turn on Enable Outgoing and Default Outgoing.
4. Make sure the domain has SPF, DKIM and DMARC records for the mail provider.
5. Send a test email from the Email Account form.
6. Make a booking. Make sure the confirmation email arrives and its links start with `https://<platform host>`.

## 5. Processes

Run each process under systemd or supervisor. `bench setup supervisor` or `bench setup systemd` writes the unit files.

| Process | Command | Needed for |
|---|---|---|
| Web | gunicorn, `bench serve` in development | Every page and API |
| Socket.IO | `node apps/frappe/socketio.js` | Live updates in the staff app |
| Workers | `bench worker --queue short,default,long` | Emails, SMS, receipts, statements |
| Scheduler | `bench schedule` | Reminders, holds, SMS status, outbox, statements |
| Redis cache and Redis queue | `redis-server` | Cache and job queue. Bind to a private address only. |

1. Enable the scheduler: `bench --site <site> scheduler enable`
2. Make sure `bench --site <site> scheduler status` shows enabled.
3. Do not run the `watch` process on production.

The app's scheduled jobs:

| Job | Schedule |
|---|---|
| `scheduler.payments.process_holds` | Every 5 minutes |
| `scheduler.notifications.send_due_reminders` | Every 15 minutes |
| `scheduler.notification_sms.poll_delivery` | Every 15 minutes |
| `public_experience.hardening.process_pending_outbox` | Hourly |
| `tasks.verify_availability.verify_appointment_group_members_availabililty` | Daily |
| `tasks.reminder_google_calendar_auth.send_reminder_mail` | Daily |
| `scheduler.statements.send_monthly_statements` | 06:00 on the first day of each month |
| `content.newsletter.campaigns.run_due` | Every minute (see the note) |

Note: `hooks.py` has two `cron` keys in `scheduler_events`. Python keeps only the second one, so `run_due` is not scheduled. The readiness report shows this as a failure. Fix `hooks.py` before go-live.

## 6. The readiness report

Run the report after each install, migrate or config change:

```
bench --site <site> execute appointment.ops.go_live.report
```

The report reads only. It changes nothing and shows no secret value. It returns a summary and one row for each check:

| Field | Meaning |
|---|---|
| `area` | Site config, Email, SMS, Payments, Scheduler, Translations, Build or Data |
| `key` | The check name |
| `status` | `pass`, `warn` or `fail` |
| `detail` | What the check found |
| `fix` | What to do. Empty for `pass`. |

Rules:

1. Do not launch while any check shows `fail`.
2. Read each `warn`. Record why it is acceptable, or fix it.
3. A check for a feature that no business uses yet shows `pass` with "not needed yet". Run the report again after a business turns on SMS or Chapa.

The report is not a web API. Only a shell user on the server can run it.

## 7. Backups and restore

1. Schedule a backup with files every 6 hours:
   `bench --site <site> backup --with-files --compress`
2. Copy each backup to S3 with the retention from decision 4.
3. Keep the `encryption_key` with the backups, in the secret store. A restore without it cannot read the Chapa keys or the Email Account password.
4. Do a restore drill each month.

Restore (tested in the drill of 2026-10-10, see [DRILLS_2026-10-10.md](DRILLS_2026-10-10.md)):

1. Stop the web, the workers and the scheduler for the site.
2. If the site does not exist on this server, create an empty site: `bench new-site <site>`. Do not install apps; the restore brings them.
3. Set `mute_emails 1` and `pause_scheduler 1` on the site until step 8. This stops reminders and statements from going out twice.
4. Restore the database and the files in one command:
   `bench --site <site> restore <database.sql.gz> --with-public-files <files.tar> --with-private-files <private-files.tar>`
5. Put the original `encryption_key` from the secret store in the site's `site_config.json`. Do this before you start the web process or run any other command on the site.
   - `bench restore` does not copy `encryption_key`. The `*-site_config_backup.json` file next to the backup has it.
   - If the key is missing, Frappe makes a new key at the first use and writes it to `site_config.json` with no warning. Then every manage link in customer emails fails ("This link no longer works") and encrypted fields (Chapa keys, Email Account password, SMS token) cannot be read. The drill showed this.
   - If a new key was made by mistake, replace it with the original key. The data is not changed.
6. Run `bench --site <site> migrate`.
7. Check: record counts against the source, a staff login, a public page, a manage link from a sent email, and a sample of private files on disk.
8. Remove `mute_emails` and `pause_scheduler`, then start the web, the workers and the scheduler.
9. Run the readiness report.

Measured in the drill on the integration development bench (database 8.1 MiB compressed, public files 1.5 MiB, private files 226 MiB, 1,444 appointments, 485 files). Production times grow with the data size. Do the drill again on the production server before you set the final RTO.

| Step | Measured time |
|---|---|
| Backup with files (`backup --with-files`) | 3.2 s |
| New empty site (`new-site`) | 26.7 s |
| Restore database and files (one `restore` command) | 37.6 s |
| Put back `encryption_key`, set config | under 5 s |
| Migrate | 25 s |
| Total RTO (new site to migrated site, without checks) | about 95 s |

RPO is the backup interval: with a backup every 6 hours, up to 6 hours of bookings can be lost. A backup with files took 3.2 s on the drill data, so a shorter interval is possible if decision 4 asks for one.

## 8. Monitoring

| What | Where | Alert when |
|---|---|---|
| Host CPU, memory, disk | CloudWatch | Disk above 80% |
| Nginx 5xx rate | Nginx access log | Above 1% for 5 minutes |
| Unknown-host requests | Nginx and `public_experience/observability.py` counters | A sudden rise |
| Error Log | Desk, **Error Log** | Any "Customer SMS failed" or Chapa error |
| Job queue | Desk, **RQ Job**, and `bench doctor` | Queue length grows for 15 minutes |
| Scheduler | `bench doctor` | Scheduler inactive |
| Email Queue | Desk, **Email Queue** | Rows in Error |
| Certificates | certbot timer | Less than 14 days to expiry |
| Backups | S3 bucket | No new backup in 12 hours |

## 9. Rollback

Before each release, take a backup with files and record the app commit:
`git -C apps/appointment rev-parse HEAD`

If a release fails:

1. Turn on maintenance mode: `bench --site <site> set-maintenance-mode on`
2. Check out the recorded commit: `git -C apps/appointment checkout <commit>`
3. Build the assets: `bench build --app appointment`
4. If the release ran migrations that changed data, restore the backup from before the release (section 7).
5. Restart the processes: `bench restart`
6. Turn off maintenance mode: `bench --site <site> set-maintenance-mode off`
7. Run the readiness report.

For a public site that shows wrong content, roll back the Experience Release only. See the immutable release procedure in the [deployment plan](DEPLOYMENT_AND_SERVER_PLAN.md#operations).

## 10. First business checklist

1. The readiness report shows no `fail`.
2. The owner registers and creates the business.
3. The owner adds the locations, services, providers and opening hours.
4. The owner publishes the booking page.
5. If the business takes payment, the owner sets the bank accounts or Chapa at `/settings/payments`.
6. If the business wants SMS, the owner turns it on at `/settings/notifications`.
7. Make one guest booking on the public page.
8. Make sure the confirmation email arrives and the manage link opens.
9. If SMS is on, make sure the SMS arrives.
10. If payment is on, pay once and make sure the receipt is issued.
11. Cancel the test booking.
12. Run the readiness report again.
