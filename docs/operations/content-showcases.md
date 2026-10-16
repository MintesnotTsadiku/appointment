# Published content showcases

`appointment/demo/content.v1.json` is the versioned content manifest. Its
SHA-256 is `14ef94a251e780ca6dc4a82c8394db63d71e7f5424a2011ae4fff9e86e50a53b`.
The image catalog supplies local assets and verifies their checksums before use.

Each of the five fictional organization businesses receives three published articles,
two published gallery collections, one newsletter draft, and one unsent preview.
The seeder creates no subscribers or delivery campaigns. Sender verification
requests and previews stay in the local email inbox.

The second collection includes a typed YouTube link to Big Buck Bunny. Its
caption identifies it as an independent animation example, not business footage.
The manifest records Blender Foundation attribution and the CC BY 3.0 license.
The video is a link. It is not downloaded, embedded, or played automatically.

Run the existing explicit seeder on an approved isolated development site:

```bash
export PYTHONPATH=/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta
export FRAPPE_BENCH_ROOT=/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4/bench
cd "$FRAPPE_BENCH_ROOT"
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.demo.showcase.seed \
  --kwargs '{"base_url":"http://127.0.0.11:34340","anchor_date":"2026-09-26"}'
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.demo.content_world.inventory
```

The site must already have the explicit rich-demo development guard enabled,
muted email, and a paused scheduler. Installation and migration never seed data.
The private runtime journal records exact owned names and the manifest checksum.
Do not commit or print that journal. It also contains synthetic login credentials.

A repeat refuses a changed manifest or missing journal-owned records. It does
not adopt existing content. The existing rich-demo verification also checks
byte-identical records and private journal bytes across a repeat.

The showcase site is visual evidence only. Seedless owner acceptance uses
separate sites. Full browser, accessibility, and release gates remain required.

## Independent showcases

The seeder also makes independent-provider showcases: one practitioner who is
the business, with their own locations, sessions, provider page and published
website. Today there is one, Yared Tesfaye Counselling (Ergata Therapy,
`/yared-counselling`). The definitions are in `appointment/demo/` and are
shared with the QA fixtures. See `docs/growth/TEMPLATE_ERGATA.md`, section
"Showcase". These showcases get bookings, but no articles, galleries or
newsletters.

## Amharic names

Amharic pages show the names of the businesses and their people in Ge'ez
script. The English name stays in the record's own field. The Amharic name is
next to it:

| Record | Field | Shown on |
|---|---|---|
| Provider | `display_name_am` | Service chooser chips and avatars, time picker, booking summary and bar, details step, confirmation, provider page, directory |
| Organization | `organization_name_am`, `description_am` | Chooser heading and description, booking header, directory, link previews (`og:title`, `og:site_name`) |
| Public Site | `site_title_am` | Website header and footer on Amharic pages, `/book`, the booking header |
| Location | `location_name_am`, `address_am` (the whole address, one line) | Booking summary and details, provider page places, independent booking, manage booking, Amharic emails |

Manage booking (`self_service` view, `local_names`), My bookings (`local_business_name`, `local_provider`) and
the Amharic customer emails and SMS (`notification_email`, `notification_sms`, the My bookings link email) use the
Amharic business, provider and place names when they exist. English pages and messages keep the English
fields they showed before. An Amharic SMS still goes through the segment guard.

When an Amharic value is empty, the page shows the English value. The public
APIs send the names as `{en, am}` (`appointment/scheduler/localized_names.py`),
and the page shows its own language (`frontend/src/lib/local-names.ts`). The
website name goes into the release (`localTitle`) when the owner publishes: the
site's Amharic title, else the organization's Amharic name. The team section of
a website reads its own bilingual content, so the seeder writes the Amharic
names there too.

Owners edit the names in English and Amharic side by side:

- Settings › Business, "Names on your booking pages": the business name, the
  description and the name of each provider of the business
  (`public_names.save_business_names`, managers only).
- Settings › Profile, "Name on booking pages": the signed-in provider's own name.
- Website setup, "Website name in Amharic".
- Settings › Locations, the place form: "Name in Amharic" next to the name, and "Address in Amharic" under the
  address (`locations.save`, `location_name_am`, `address_am`; left out, they keep their values).

The seeder (`CONTENT_VERSION` 9, Ergata showcase version 6) fills the Amharic
names of the five organization showcases, their ten providers, their nine places
(name and address, from the website's own translations) and the Ergata practice
and its two places. A repeat run writes the same values.

### Portraits

The ten staff portraits of the five organization showcases are new photos of
the same people in each template's v3 art direction, with warm or neutral
grading. They were made with the Codex CLI (`gpt-6.1-sol`) as edits of the
earlier portraits, so each person keeps the same face. The files are in
`appointment/public/brand-experience/providers/warm/`:

- `<name>.webp` and `<name>.avif`, 768 × 768 (the team sections),
- `<name>-192.webp` / `.avif` and `<name>-96.webp` / `.avif` (avatars).

The Ergata portrait has the same small variants next to it. The scheduler APIs
send the 192 px file as the avatar (`localized_names.avatar`), about 4–7 KB
instead of 40–75 KB. Each file and its checksum is in the showcase catalog
(`providerAssets[].variants`). The earlier portraits stay in place, because old
releases can point to them.

QA: `qa/manifests/growth/amharic-names.yaml` (each showcase in Amharic) and
`amharic-names-owner.yaml` (the owner changes a name and changes it back). The
fixture is `appointment.tests.amharic_names_qa_fixtures`.
Runs on 2026-10-15: BQA-2026-00414 (`amharic-names`, every scenario passed) and
BQA-2026-00413 (`amharic-names-owner`, passed).

## What the seeder fills

A fresh seed fills these fields on every showcase where they apply. The
read-only coverage check of 2026-10-16 found no other gaps (see "Regenerate
showcase data on a server", step 6).

| Record | Fields | Showcases |
|---|---|---|
| Organization | `organization_name_am`, `description_am`, `phone` (placeholder) | The five organizations |
| Provider | `display_name_am`, `bio`, `bio_am`, `spoken_languages`, the portrait (warm, with 96 and 192 px variants) | All eleven providers |
| Provider | `public_slug` | Ergata only. Provider pages are for independent providers. |
| Location | `location_name_am`, `address_am`, `location_type`, `phone` (placeholder) | All places |
| Location | `video_platform`, `meeting_link_mode`, `meeting_link` | The Ergata online room |
| Public Site | `site_title_am`, `recipe_version` (latest: v3, Ergata v2), `am` locale, booking `liveAvailability` and `holidayGreetings`, `expressive` motion | All six websites |
| Website sections | Amharic for every localized text, also the reviewer names and bare numbers; the v3 photos (hero, about, services, places, and the process steps of Selam and Tena); a gallery section where the template has one | All six websites |
| Appointment | `client_phone` (E.164), `customer_language`, `participant_phones` (some Tena and Bloom bookings, the Ergata couples sessions), `is_online` and `meeting_link` (Ergata online sessions) | All bookings |
| Customer Profile | `primary_phone`, `primary_email`, `preferred_language` | All customers |
| Walk In | `client_name` (a showcase client), `client_phone` (E.164), `participant_phones` (one per Tena and Bloom queue) | All walk-ins |
| Directory Listing | Listed, with a category and an area | All six showcases |

Not filled, on purpose:

- Public business and place numbers stay non-dialable placeholders
  (`+251 11 000 0101` and so on), so a showcase never shows a number that could
  belong to a real person. Customer numbers are E.164 mobile numbers
  (`+2519112…` Ergata, `+2519113…` organizations, `+2519114…` companions),
  because the phone rule accepts nothing else. Nobody gets a message: the seeder
  skips customer notifications, the showcases keep SMS off, and every email
  address is on `example.test`.
- Empty image slots (the gallery items, the process steps of Bloom, Meron and
  Abugida, testimonials, contact): the v3 templates show their own packaged
  photos there.
- Online offerings: only Ergata has an online room. The organization
  showcases meet in person.
- Business referral codes (made when an owner first opens the referral page),
  customer referral offers (an owner opt-in; an active offer makes customer
  codes on demand that the journal does not own, which would block cleanup) and
  signup sources (they record how a real owner signed up).
- Brand and growth settings, directory categories and areas: install and
  `migrate` fill them (`appointment.growth.seed.ensure_defaults`,
  `appointment.growth.directory.ensure_defaults`), not the seeder.

The seeder modules: `showcase.py` (organizations, websites, bookings),
`content_world.py` (articles, galleries, newsletters), `analytics_world.py`
(lifecycle facts, walk-ins), `dashboard_world.py`, `independent_world.py`
(Ergata), `customer_world.py` (customer contacts) and `growth_world.py`
(directory listings). Each step has its own version in the journal. A repeat
run does the steps whose version changed and nothing else.

## Regenerate showcase data on a server

There is one seeder: `appointment.demo.showcase.seed`. Its guard
(`require_target`) accepts only these two kinds of site:

- **A development site:** the name ends with `.localhost` and
  `worktree_development` is set.
- **The named server showcase site:** the site config key `showcase_site`
  holds this site's own name (for example `showcase.example.com`). On the
  **first** seed the site must be empty: no Organization, Provider or
  Appointment. Later seeds are allowed because the site has the seeder's
  private journal.

Both kinds also need `rich_demo_enabled` set to `1`, `mute_emails`,
`pause_scheduler`, and the command must run as Administrator (`bench execute`
does). The seeder therefore cannot take over a live site: a live site is not
named in `showcase_site`, and it is not empty.

Never set `showcase_site` on the live site, never run the seeder on a site
with real businesses or customers, and never copy a showcase site to
production (`GO_LIVE_RUNBOOK.md` §2).

### Steps

Use a separate site for the showcases, for example `showcase.example.com`
(its own bench is best; its own site is the minimum).

1. Create the site and install the app (as in `GO_LIVE_RUNBOOK.md` §2):

   ```bash
   bench new-site showcase.example.com --db-root-username <root user> --install-app appointment
   bench --site showcase.example.com migrate
   ```

2. Name the site as the showcase site and turn on the seeder flags. Mute email
   and pause the scheduler first:

   ```bash
   bench --site showcase.example.com set-config -p mute_emails 1
   bench --site showcase.example.com set-config -p pause_scheduler 1
   bench --site showcase.example.com set-config showcase_site showcase.example.com
   bench --site showcase.example.com set-config -p rich_demo_enabled 1
   bench --site showcase.example.com set-config host_name https://showcase.example.com
   bench --site showcase.example.com set-config -p brand_public_experience_platform_hosts '["showcase.example.com"]'
   bench --site showcase.example.com set-config -p brand_public_experience_edge_tls 1
   ```

   The last three keys make the public pages answer on the showcase host
   over HTTPS (`GO_LIVE_RUNBOOK.md` §3).

3. Seed. `anchor_date` is the "today" of the showcase: bookings run from 89
   days before it to 30 days after it. Leave it out to use today. `base_url`
   only goes into the persona landing links in the private journal.

   ```bash
   bench --site showcase.example.com execute appointment.demo.showcase.seed \
     --kwargs '{"base_url": "https://showcase.example.com"}'
   ```

   On the drill of 2026-10-16 a fresh seed took about 5 minutes. A repeat run
   takes a few seconds and changes nothing. If the site is not empty on the
   first seed, the seeder stops with "The showcase site already has records …"
   and changes nothing.

4. Turn off `rich_demo_enabled`. Keep `showcase_site`, muted email and the
   paused scheduler: the showcase customers have `example.test` addresses, and
   reminders for them must not go to the mail queue.

   ```bash
   bench --site showcase.example.com set-config -p rich_demo_enabled 0
   ```

   Turn it on again only for the next seed or cleanup.

5. Serve the site through Nginx like any other site of the bench (for a site
   named after its host, the normal `bench setup nginx` config works), and
   reload Nginx after `nginx -t`.

6. Check:

   - `https://showcase.example.com/bloom-studio`, `/selam-studio`,
     `/tena-studio`, `/abugida-studio`, `/meron-studio` and
     `/yared-counselling` open, in English and with `/am`;
   - `/bloom-studio/book` and `/schedule/p/yared-counselling` open and show
     free times;
   - `/directory` lists the six showcases;
   - `bench --site showcase.example.com execute appointment.tests.test_rich_demo.verify`
     (it needs `rich_demo_enabled` for the duration of the check).

   The readiness report (`appointment.ops.go_live.report`) is for the live
   site; on the showcase site it reports the demo keys as expected failures.

   The private journal `sites/showcase.example.com/private/rich-demo-v1.json`
   lists every record the seeder made, and the sign-in credentials of the
   showcase staff. Do not copy, print or commit it.

A `.localhost` site with `worktree_development` (the development rule) also
works on a server when Nginx sends `X-Frappe-Site-Name`, but the named
`showcase_site` is the clearer choice for a server.

### Refresh around today

The bookings of a seed run from 89 days before its anchor date to 30 days
after it, with a few older bookings 100 to 180 days before it. Over time they
move into the past. `appointment.demo.showcase.refresh` removes the showcases
and seeds them again around a new anchor date (today if you do not give one).

`cleanup` stops when other records link to the showcases, for example the
bookings that visitors made. `refresh` also removes these records, but only
the records on the showcase businesses of the journal:

- every record in the private journal, which includes the showcase staff
  accounts (the new seed makes them again, with new passwords);
- every record outside the journal that links to a journal record, and the
  records that link to those: visitor bookings, customer profiles,
  notifications, payments and receipts, walk-ins, referral rows, staff
  invitations, and the contacts and user permissions of the showcase staff;
- the page views of the showcase paths.

Safety rules:

- The guard of the seeder applies (`require_target`: a development site or the
  site named in `showcase_site`, `rich_demo_enabled`, muted email, a paused
  scheduler, Administrator). The site must also have the journal, so refresh
  runs only on a site that the seeder seeded.
- `dry_run` is `True` by default. The dry run changes nothing. It reports the
  records per DocType (`journal_records`, `visitor_records`, with examples),
  the booking dates now (`bookings_before`), what it keeps (`kept`: the
  records of other businesses, which nothing links to a showcase) and
  `refused`.
- Refresh refuses, and changes nothing, when a record to remove links to an
  Organization, Provider, Location, Service, offering, website, customer,
  booking or walk-in that is not a showcase record. It never removes an
  Organization or a User that is not in the journal.
- All link checks stay on. Records are deleted through their lifecycle, in
  link order. Only the audit and history records that refuse deletion
  (releases, revisions, outbox rows, newsletter records, staff invitations,
  versions) are removed directly, as `cleanup` does. Where an organization and
  its services link each other, the organization's booking URL rows go first.
- The removal is one transaction. Files leave the disk only after the commit.
- After the commit the journal is removed and the seed runs. If the seed
  stops, the site has no showcases: correct the cause and run `seed`.
- Each run writes its report to the `appointment.showcase_refresh` log.

Development site (the stack bench, with `PYTHONPATH` set as for any bench
command):

```bash
bench --site <dev site> execute appointment.demo.showcase.refresh > refresh-dry-run.json
bench --site <dev site> execute appointment.demo.showcase.refresh \
  --kwargs "{'dry_run': False, 'base_url': 'http://localhost:47800'}"
```

Server showcase site:

```bash
bench --site showcase.example.com set-config -p rich_demo_enabled 1
bench --site showcase.example.com backup
bench --site showcase.example.com execute appointment.demo.showcase.refresh \
  --kwargs "{'base_url': 'https://showcase.example.com'}"
# Read the report: refused must be empty and the visitor records must be what you expect.
bench --site showcase.example.com execute appointment.demo.showcase.refresh \
  --kwargs "{'dry_run': False, 'base_url': 'https://showcase.example.com'}"
bench --site showcase.example.com set-config -p rich_demo_enabled 0
```

`--kwargs` is a Python value: write `False`, not `false`. Give `anchor_date`
(`'2026-10-16'`) to use another day. The output of the real run adds
`bookings_after` (earliest and latest booking date) and the seeded counts.
Then do the checks of step 6.

Warnings:

- Refresh permanently deletes the bookings that visitors made on the
  showcases. Nobody gets a message, and their booking links stop working.
- The showcase staff passwords change. Sign-ins with the old journal stop
  working.
- The showcases are not there for about 5 minutes (the removal takes about a
  minute, the seed about 4). On a server, refresh at a quiet time.
- QA fixtures that use showcase records (`template_bloom_v3_qa_fixtures`,
  `template_selam_v3_qa_fixtures`, `amharic_names_qa_fixtures`) need their
  `setup` again after a refresh.
- Take a backup first. Never set `showcase_site` on the live site.

Results of 2026-10-16:

- Drill on a throwaway site (`refresh-drill.localhost`), seeded with anchor
  2026-07-01, with a guest booking on Bloom and one on a provider that is not a
  showcase (Rahel Girma Nutrition): the dry run listed the Bloom booking, its
  profile and notification; the refresh removed them and kept the other
  booking; bookings moved from 2026-01-02 – 2026-07-31 to 2026-04-19 –
  2026-11-15; a repeat seed changed nothing.
- Development site: anchor 2026-10-13 to 2026-10-16. Visitor records removed:
  9 bookings, 9 notifications, 7 customer profiles, 4 staff invitations,
  1 notification setting, 1 contact, 1 former page address, 5 user
  permissions. Bookings moved from 2026-04-16 – 2026-11-12 to 2026-04-19 –
  2026-11-15. After the refresh all showcase pages opened (en and am), the
  directory listed the six showcases, a guest booking on Bloom went through,
  `appointment.tests.test_rich_demo.verify` passed, and these Agent Plane runs
  passed: template-gallery BQA-2026-00663, template-bloom-v3 BQA-2026-00664,
  booking-journey-bloom BQA-2026-00668, booking-journey-selam BQA-2026-00671,
  amharic-names BQA-2026-00673, provider-page BQA-2026-00674.

### Refresh and upgrade

To make the data current again (the bookings are around the anchor date), use
"Refresh around today". `cleanup` (it deletes only the records in the journal)
stops when people booked on the showcase site, on purpose.

A seed after an app update upgrades the existing showcases in place: each step
whose version changed writes its new values on the records it owns, and the
websites are published again.
