# Sharing: make the booking link native to Ethiopia (workstream B)

Status: code complete. Site verification is blocked by the site restore (see "Run after the restore").

## What an owner gets

The **Grow** staff page (`/grow`) is for the person who runs the business: organization owners and
managers, and independent providers (`individual_owner`). The nav item `nav-grow` shows for them only,
and `BusinessOwnerRoute` guards the route. The server checks every call again.

| Section | What it does |
|---|---|
| Share your booking link | Shows the short link (`<short_host>/<slug>`). Copy link, open page. A message in Amharic and English from Growth Settings (`share_message_en` / `_am`, `{business}` and `{link}` filled in one pass). The owner can edit it. Buttons: Share to Telegram (`https://t.me/share/url?url=…&text=…`), WhatsApp, Copy message, and native Web Share when the browser has it. |
| Visits and bookings | Counts for the last 30 days per channel: visits from Frappe `Web Page View` (`source`), bookings from `Appointment.referral_source`. |
| Pin it in your channel | Five steps with icons: copy, post, pin, add to bio, add to the Telegram Business profile. |
| Link preview | A chat-style preview of the share card, title and description, in Amharic or English. |
| Short link | Live availability, reasons (length 3–30, format a-z 0-9 single hyphens, reserved, taken), 2–3 available ideas from the business name, a confirm dialog, and the list of former addresses. |
| Counter poster | A4 or A5, light, dark or business colour, Amharic + English or one language, location (multi-location businesses). Live preview, Download PDF, Print, Open full size. Hidden when `posters_enabled` is off. |
| Slots | `ReferralSection` (C), `DirectorySection` and `YearReviewSection` (E). |

Every link carries `?source=`: `telegram_share`, `whatsapp_share`, `web_share`, `copy_link`, `qr_poster`.

## How it works

| Part | File |
|---|---|
| Business, links, messages, preview, Open Graph tags, stats, `grow_context` API | `appointment/growth/sharing.py` |
| Share card renderer (generic `render_card(title, subtitle, lines, logo, colors, lang, footer, key) -> /files/og-cards/<key>-<hash>.png`) | `appointment/growth/og_image.py` |
| Poster (HTML print view and PDF, QR as SVG from PyQRCode, hours in both clocks) | `appointment/growth/poster.py`, `appointment/templates/growth/poster.html` |
| Short links: check, suggestions, change, alias redirect, guest `resolve` | `appointment/growth/short_links.py` |
| Former addresses | DocType **Public Site Slug Alias** (`appointment/public_experience/doctype/public_site_slug_alias`) |
| Shell: 301 for a former address, Open Graph tags | `appointment/www/index.py`, `frontend/index.html` (`{{ public_meta_tags }}`, removed by the Vite dev plugin) |
| SPA forward for a former address (Vite dev serves the shell itself) | `frontend/src/pages/public-experience/site.tsx` |
| `?source=` capture: kept for the session, one `make_view_log` call, sent as `referral_source` with the booking | `frontend/src/lib/referral-source*.ts`, `useBookingSubmit.ts`, `independent-booking.tsx` |
| Grow page | `frontend/src/pages/grow/` |

Rules:

- The public link is the published Public Site (`/<slug>`), else the booking page (`/schedule/org/<slug>` or
  `/schedule/individual/<offering>`). Without a published site there is no short link; the section links to
  website setup.
- The share card and poster use the **business** brand from its published release: logo
  (`identity.logoCompact`), colours (`tokens.light` / `tokens.dark`), services from the services section.
  A small platform mark comes from `brand()`. No brand name or logo path is in code.
- The card file name is a hash of everything drawn. A brand, name or service change gives a new file on the
  next view and removes the old file of the same business and language.
- Open Graph: `og:title` "`<name> · Book online`", `og:description` services summary (≤ 155 characters),
  `og:image` 1200×630, `og:locale`, `twitter:card summary_large_image`. The language follows the URL
  (`/<slug>/am` gives Amharic).
- A slug change saves the Public Site through its normal controller (all validations and permission checks
  run) and stores the former slug as an alias. The shell answers a former address with a 301 that keeps the
  rest of the path and the query. Only the same business can take a former address back; a Public Site
  `validate` hook stops any other site from claiming it. An organization's own `Organization.slug` stays
  reserved for that organization (it is its booking root). The organization slug and the
  `/schedule/org/<slug>` booking path do not change.
- Poster hours come from the location's Opening Hours. Consecutive days with the same hours make one row.
  International time uses `habesha.format_hours_range(..., "en")`, Ethiopian time
  `habesha.format_hours_range(..., "am")` (ምሽት for evening). Closed days come last.
- The PDF uses the receipts pipeline (`frappe.utils.pdf.get_pdf`, wkhtmltopdf). wkhtmltopdf cannot use
  variable or WOFF2 fonts, so the poster embeds static Noto Sans Ethiopic Regular and a new static **Bold**
  instance (`appointment/public/fonts/pdf/noto-sans-ethiopic-bold.ttf`, made from the variable font with
  fontTools, OFL). Images are embedded as PNG data URIs (wkhtmltopdf cannot read WebP).
  `.print-format { margin: 0 }` removes Frappe's default 15 mm header and footer margins.
- Guest endpoints: `short_links.resolve` (rate limit 60/min). Owner endpoints: `sharing.grow_context`,
  `short_links.check` (120/min), `short_links.change`, `poster.poster` (30/min). Each calls
  `sharing.require_business(key)`: `membership.require_manager` for an organization,
  `independent.require_owner` for `Provider:<name>`.

## Verification

Done before the site pause:

- Bloom Studio: share cards in English and Amharic (viewed), A4 light, A5 dark and A5 brand posters
  (viewed; one page each after the margin fix; bold headings; both clocks: `9:00 AM – 7:00 PM`,
  `ጠዋት 3:00 – ምሽት 1:00`).
- Read-only `curl` of `/bloom-studio/am` through Frappe: all Open Graph and Twitter tags are in the shell, in
  Amharic. `/home` has no Open Graph tags.
- `node tests/growth-sharing.test.mjs`: pass. `tsc -p tsconfig.app.json`: 178 errors (baseline 178).
  `npm run build`: pass. `test:dom`: all pass except `landing-world.test.mjs` (landing copy of workstream F,
  missing `world.amharic.short`; not changed by B).
- `py_compile` and `ruff` on the new Python modules: clean.

Not yet verified (site paused for the restore): `test_growth_sharing`, both Agent Plane manifests, the Grow
page in a browser, the slug change and redirect on the site.

## Run after the restore

1. `$G/migrate.sh` (creates **Public Site Slug Alias** if the restored database does not have it).
2. `$G/strings.sh $G/strings/sharing-skeleton.json`, `sharing-server.json`, `sharing-ui.json` (the JSON is
   already merged into `en.json` / `am.json`; this imports the catalog into the site).
3. `$G/test.sh appointment.tests.test_growth_sharing`
4. `$G/qa.sh qa/manifests/growth/sharing-owner.yaml appointment.tests.growth_sharing_qa_fixtures`
5. `$G/qa.sh qa/manifests/growth/sharing-independent.yaml appointment.tests.growth_sharing_qa_fixtures`
6. Review every screenshot and fix what is not polished.

## Decisions

- Slugs could not be edited after website setup. The product owner asked for editable short links that keep
  printed posters working, so B added the change API and the alias DocType instead of skipping the feature.
- One generic renderer, `appointment/growth/og_image.py`, with its own font loading. It does not import the
  tools renderer, so a change there cannot break business cards.
- Visits use Frappe's own `Web Page View` (`make_view_log` accepts `source`). It records only when Website
  Settings → "Enable view tracking" is on; bookings by `referral_source` count either way.
- Telegram's share text leaves out the URL, because Telegram adds the `url` parameter itself.
- Poster copy uses `_()` with an explicit language for both languages, so translators can edit it in the
  catalog and the poster prints both languages whatever the session language is.

## Open items

- Changing a slug does not republish the site. Links inside the published release still name the former
  slug; they forward through the alias. A later publish writes the new slug.
- The SPA forward covers the landing page; `/old-slug/book` forwards through the server 301 only (production).
- Website view tracking is off by default in Frappe; an administrator must turn it on to see visit counts.
