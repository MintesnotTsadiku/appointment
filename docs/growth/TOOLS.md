# Growth workstream D: free tools

Status: code complete. Browser QA with Agent Plane and the Frappe test modules are **not run yet**,
because the site was paused for a restore from backup. See "Run after the restore".

## What the tools do

| Page (English / Amharic) | Purpose | Sign-up source |
|---|---|---|
| `/tools`, `/am/tools` | Index of all tools | `tool_index` |
| `/tools/ethiopian-time-converter`, `/am/tools/...` | Habesha clock to international time and back, 24-hour chart | `tool_ethiopian-time-converter` |
| `/tools/ethiopian-calendar-converter`, `/am/tools/...` | Today's Ethiopian date (server side), Gregorian to Ethiopian and back, 13-month table | `tool_ethiopian-calendar-converter` |
| `/tools/amharic-appointment-reminder`, `/am/tools/...` | Reminder messages in Amharic and English for SMS, Telegram, WhatsApp, with SMS segment count and Share to Telegram | `tool_amharic-appointment-reminder` |
| `/tools/business-hours-sign`, `/am/tools/...` | Printable A4/A5 opening-hours sign in Amharic and English, both clocks, light/dark/colour theme | `tool_business-hours-sign` |

Every page has one H1, a title of 60 characters or less, a description of 155 characters or less,
a canonical URL, `hreflang` links (en, am, x-default), a language switch, Open Graph tags with a
generated 1200×630 image, `twitter:card` `summary_large_image`, FAQPage JSON-LD that matches the
visible FAQ, WebApplication JSON-LD, one call to action to sign-up with `?source=tool_<slug>`, and
links to the other tools. Content is visible without JavaScript. The pages do not load the React
bundle.

When `Growth Settings.tools_enabled` is off, every tool page returns 404 and the sitemap drops them.

## Files

- Pages: `appointment/www/tools/{index,ethiopian-time-converter,ethiopian-calendar-converter,amharic-appointment-reminder,business-hours-sign}.{html,py}`.
- Shared layout and icons: `appointment/templates/tools/base.html`, `icons.html`.
- Page context, catalog, brand colours, share images, registry: `appointment/growth/tools/{page,catalog,colors,og_image,registry}.py`.
- Crawler files: `appointment/growth/seo.py`, `appointment/www/robots.{py,txt}`, `appointment/www/sitemap.{py,xml}`.
- Python twins: `appointment/growth/habesha.py`, `appointment/growth/ethiopian_calendar.py`.
- Shared test vectors (Python and node): `appointment/growth/vectors/{habesha,ethiopian_calendar}.json`.
- JavaScript: `appointment/public/js/habesha-time.js` (pure, shared), `appointment/public/js/tools/{tools-common,ethiopian-calendar,time-converter,calendar-converter,reminder,hours-sign}.js`.
- Styles: `appointment/public/css/tools.css` (one file for all tools, light and dark, print rules).
- Tests: `appointment/tests/test_time_converter_page.py`, `test_tools_pages.py`, `test_habesha_calendar_vectors.py`, `frontend/tests/habesha-time.test.mjs`, `frontend/tests/tools-pages.test.mjs`.
- QA: `qa/manifests/tools/time-converter.yaml`, `qa/manifests/growth/tools-{index,index-dark,calendar,calendar-dark,reminder,sign}.yaml`, fixture `appointment/tests/tools_qa_fixtures.py`.

Shared files changed with small edits: `appointment/hooks.py` (route rules for `/tools...` and
`/am/tools...`, `appointment_sitemap_links` entry), `appointment/public_experience/reserved.py` and
`frontend/src/public-experience/routes.ts` (reserve `am`; no Public Site uses that slug),
`frontend/vite.config.ts` (proxy `am/tools`), `frontend/package.json` (`test:dom`),
`frontend/src/pages/landing/day/components/Finale.tsx` (footer link "Free tools for businesses" to
`/tools`), `frontend/index.html` (a `<noscript>` link to `/tools` and `/am/tools` in the SPA shell).

## How it works

- **Language.** The URL sets the language: `/am/tools/...` is Amharic. `page.build` sets
  `frappe.local.lang` and gives templates `t(key)`. `t` reads the English text from the frontend
  catalog (`en.json`) and translates it with `_()`, so the Translation records (imported from
  `am.json`) supply the Amharic. An administrator's correction in the Translation list reaches the
  pages too.
- **Brand.** Product name, mark, tagline, short host and colour come from
  `appointment.growth.brand.brand()`. No brand name is in the tool code (a test checks this). The
  accent colour is derived from the brand colour and adjusted to keep 4.5:1 contrast in light and
  dark mode (`colors.palette`).
- **Share images.** `og_image.image_url` draws a PNG with Pillow (12.3, available in the bench
  environment): gradient from the brand colour, brand mark, product name, tool title, a clock dial
  motif. Latin text uses Inter, Ethiopic text uses Noto Sans Ethiopic; Pillow reads the app's
  `.woff2` files directly, so no TTF conversion is needed. The file is
  `sites/<site>/public/files/tool-og/<slug>-<lang>-<hash>.png`; the hash covers the brand values and
  the text, so a brand change gives a new file on the next page view and older files are removed.
- **Sitemap and robots.** `appointment/www/sitemap.py` extends the framework sitemap with the
  functions in the `appointment_sitemap_links` hook (directory and tools use it). Entries carry
  `xhtml:link` hreflang alternates. `robots.txt` keeps the Website Settings text and appends
  `Sitemap: <host>/sitemap.xml` once. No database value was changed.
- **Habesha clock.** Period words match the staff app: ሌሊት 00–05, ጠዋት 06–11, ከሰዓት 12–17,
  **ምሽት** 18–23 (ማታ is gone from JS, Python, copy and tests). `appointment.growth.habesha` gives
  `to_habesha(hour, minute) -> (hour12, minute, period_key)`, `from_habesha(hour12, minute,
  period_or_half)`, `format_time`, `format_hours_range(start, end, lang)` for workstream B.
- **Ethiopian calendar.** Julian Day Number method, epoch 1723856, leap year when `year % 4 == 3`.
  Vectors include Enkutatash on 11 and 12 September, Pagume 6, Genna on Tahsas 29 and 28, Timket,
  Adwa and Meskel. Python and node tests both read the same JSON file.
- **Reminder messages.** Templates are catalog entries in `tools.reminder.tpl` with named
  placeholders; each page uses both languages. SMS length: GSM-7 160/153, otherwise UCS-2 70/67
  UTF-16 units. Share to Telegram uses `https://t.me/share/url?url=<tool URL with source>&text=<message>`.
  Copied text does not include the link back.
- **Hours sign.** The sample sign is server-rendered with the Python twin. The sign state is kept in
  the URL hash (`#s=<base64url JSON>`), so a sign can be reopened, shared and opened in the print
  preview `?view=print`, which applies the same layout as `@media print`. Paper size sets
  `@page { size: A4|A5 }`. The footer credit links back with `?source=tool_business-hours-sign`.
- **Controls.** Selects are styled native selects (chevron, focus ring), radio groups are segmented
  controls, open/closed is a switch. There are no native date or time inputs. Tap targets are 44 px
  or more.

## Verification done

- Static: `python -m py_compile` for all new modules; `node tests/habesha-time.test.mjs`,
  `node tests/tools-pages.test.mjs` pass; `$G/build.sh`: tsc errors 0 (baseline 178), build pass.
  `test:dom` fails in `landing-world.test.mjs` ("missing world.amharic.short"), which comes from
  another workstream's uncommitted landing edits, not from this work.
- Read-only HTTP checks of all 10 pages (status 200, title and description lengths, one H1,
  og:image reachable PNG, JSON-LD FAQ equals visible FAQ, sitemap and robots).
- Local Playwright screenshots (read-only page loads, not Agent Plane) at 1440 and 390, light and
  dark, reviewed and fixed: field heights, date-row widths, sign scale (container units), sign
  overflow, time-select truncation, title width on share images. 0 console errors, no horizontal
  scroll at 390 px.

## Run after the restore

1. Import the strings (Translation records may be lost in the restore). The catalog files are
   already merged; re-running is safe:
   `$G/strings.sh $G/strings/tools-common.json`, `tools-time.json`, `tools-calendar.json`,
   `tools-reminder.json`, `tools-sign.json`, `tools-landing.json`.
2. No migrate is needed (no DocType change).
3. `$G/test.sh appointment.tests.test_time_converter_page appointment.tests.test_tools_pages appointment.tests.test_habesha_calendar_vectors`.
4. Agent Plane, fixture `appointment.tests.tools_qa_fixtures`:
   `qa/manifests/tools/time-converter.yaml`, `qa/manifests/growth/tools-index.yaml`,
   `tools-index-dark.yaml`, `tools-calendar.yaml`, `tools-calendar-dark.yaml`,
   `tools-reminder.yaml`, `tools-sign.yaml`. Review the screenshots.

## Decisions

- The reminder and sign pages prefill realistic sample values so the output is complete on first
  view; visitors replace them.
- The SPA shell link is a `<noscript>` block in `frontend/index.html` (the source of the served
  shell), with fixed English and Amharic text, because the shell has no translation step.
- There is no `emulate_media` action in the harness, so print is checked through `?view=print`.
- The index CTA uses source `tool_index`.
- Sign labels that always show both languages (Opening hours, Closed, Phone, Book online) reuse
  existing catalog English strings so the Translation table stays consistent.
