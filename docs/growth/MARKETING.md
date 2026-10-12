# Growth workstream F: marketing

Workstream F gives visitors fewer reasons not to try the product. It has four parts:

1. The landing page says "free to start", "live in N minutes" and "Amharic everywhere".
2. Onboarding has less friction, so the "N minutes" claim can be true.
3. The partners page (`/partners`, `/am/partners`) recruits associations, schools, trainers and
   Telegram channel admins.
4. The growth playbook ([PLAYBOOK.md](PLAYBOOK.md)) tells the team how to use all growth features.

## 1. Landing page promise

The promise has three parts. Each part reads its facts from configuration:

| Promise | Source of truth |
|---|---|
| Free to start | Payment Settings: `platform_fee_type`, `platform_fee_value`, `free_bookings`. These are the values `scheduler/payments.py` charges with. |
| Live in N minutes | Growth Settings `marketing_live_minutes` |
| Amharic everywhere | Product fact. The Amharic chapter shows a booking page, a reminder and the staff app in both languages. |

`appointment.growth.marketing.offer()` turns Payment Settings into one of three wordings:

| `free` | Condition | English detail |
|---|---|---|
| `no_fee` | No fee type, or a fee value of 0 | No card needed, and no platform fee on your bookings. |
| `free_allowance` | A fee, and `free_bookings` > 0 | No card needed. Your first {count} paid bookings carry no platform fee. |
| `free_setup` | A fee from the first paid booking | No card needed to sign up and set up your booking page. |

The guest API `appointment.growth.marketing.public_offer` returns the facts. Until it answers, the
page shows `free_setup`, the claim that is true for every configuration. The dev site has no platform
fee, so it shows `no_fee`. The product does not claim that the default entitlements (blog, gallery,
newsletter in "Trial") are free forever.

Where the promise shows:

- Dawn (hero): three cards under the call to action: `0 ETB`, `N min`, `አማርኛ`.
- A new hour, 22:30 "Amharic", between Growth and the Finale. It is a normal chapter with its own
  sky palette and a diorama (`stages/AmharicStage.tsx`). An English/አማርኛ toggle switches one booking
  between languages: Ethiopian calendar date (መስከረም 6 = 16 September), Habesha time
  (3:00 ጠዋት = 9:00 AM), an Amharic SMS reminder and the staff app. The story loops while it is on
  screen and stops on Amharic with reduced motion.
- Finale: a one-line recap under the call to action, and a "Partners" footer link to `/partners` or
  `/am/partners` (shown when `partner_program_enabled` is on).

Files: `frontend/src/pages/landing/day/components/Promises.tsx`,
`frontend/src/pages/landing/day/stages/AmharicStage.tsx`, `frontend/src/pages/landing/shared/offer.ts`
(pure, tested), `frontend/src/pages/landing/shared/useLandingOffer.ts`, edits to `world.ts`,
`DayLanding.tsx`, `Prologue.tsx`, `Finale.tsx`, `landing.css`, `stages/stages.css`,
`appointment/growth/marketing.py`.

## 2. Onboarding friction

The flow from the landing page to a live booking page had these steps:

1. Sign up (name, email, password).
2. Wait 2 seconds, then sign in again with the same email and password.
3. Fill in the business form (business, location, first service).
4. Land on `/home`. The booking page is a private draft.
5. Find **Settings → Business**, press **Publish**.

Changes:

- Open sign-up now signs the new account in (`registration._sign_in`, `login_manager.login_as`). The
  sign-up page goes straight to the server's landing for the account (`/onboarding`). Accounts that
  wait for administrator approval are disabled and are not signed in.
- Onboarding has a **Publish my booking page now** switch, on by default. After the business is
  created, the page calls `workspace.publish`. The success screen then shows the live link, **Open
  booking page** and **Go to your workspace**. With the switch off, the old draft flow stays.
- The sign-up and sign-in pages were English only. They now use the catalog (`auth.*`) and have a
  language toggle, so "Amharic everywhere" is true from the first screen. Their decorative shapes
  caused a horizontal scroll at 390 px. The page root now clips them.

The new flow has three screens: sign up, business form, live link.

### Timing

Measured on 12 October 2026, run `BQA-2026-00297` (`marketing-signup-timing.yaml`, desktop 1440, English):

| Step | Time from the first click |
|---|---|
| Press **Start free** on the landing page | 0 s |
| Sign-up form submitted (3 fields) | 9 s |
| Business form open (signed in, no second sign-in) | 13 s |
| Business form submitted (3 fields, publish switch on) | 18 s |
| Live link shown | 21 s |
| Customer booking page open with the service | 26 s |

The browser fills each field in about 1 second. At a human pace of about 10 seconds for each of the
six fields, plus 20 seconds to read each of the three screens, the total is about 2 minutes. This is
less than `marketing_live_minutes` (5), so the landing promise stays at 5 minutes. No friction was
removed in this pass.

The run found one defect: the booking page of a new business asked for the public site config of
`/<slug>` and got four `404` errors, because a new business has no published site yet. The config
API now accepts `optional=1` and returns an empty result for such a path
(`appointment/public_experience/api.py`, `get_public_ui_config`). The booking page theme
(`frontend/src/public-experience/bookingTheme.ts`) and the landing showcase doors use it. A run after
the fix has no console or network errors (except the known socket.io polling noise).

## 3. Partners page

`/partners` (English) and `/am/partners` (Amharic). The language comes from the path, like the tool
pages. Route rules are before the SPA catch-all in `hooks.py`. The Vite proxy, `reserved.py` and
`routes.ts` reserve `partners` (workstream D reserved `am`).

The page is a standalone Jinja page that uses `tools.css` for the shared look, plus `partners.css`:

- SEO: title "Partner program for associations and trainers | `<product>`" (55 characters), meta
  description (144 characters in English), one H1, canonical, hreflang en/am/x-default, Open Graph,
  `robots: index, follow`, FAQPage JSON-LD. Both languages are in `/sitemap.xml` with alternates,
  through the `appointment_sitemap_links` hook (`partner_page.sitemap_links`).
- Sections: hero with three facts (the partner reward from Growth Settings, "0 ETB to join",
  "አማ · EN"), who it is for (associations, beauty and medical schools, coaching groups, trainers,
  Telegram admins), what you get, how it works in 3 steps, the Telegram admin kit, the application
  form and the FAQ.
- The numbers come from Growth Settings: `partner_reward_free_bookings`,
  `referral_reward_free_bookings`, `referral_threshold_bookings`, `marketing_live_minutes`.
- When `partner_program_enabled` is off, the page is a 404 and leaves the sitemap.

### Telegram admin kit

Four ready-to-post messages: a free tools post and a booking page post, in English and Amharic. The
tool links are `<product_url>/tools/<slug>?source=partner_PARTNERCODE` (or `/am/tools/...`). The
sign-up link is `<product_url>/signup?ref=PARTNERCODE&source=partner`. The page tells admins to
replace `PARTNERCODE` with their code. With JavaScript, each message has a **Copy message** button.
Without it, the text is selectable.

### Application form

The form sends `name, organization, email, phone, kind, message` to workstream C's guest API
`appointment.growth.referrals.apply_partner` (C defines it in `partners.py` and exports it from
`referrals.py`). `partner_page.apply_method()` picks the exported path. `kind` is a radio group:
association, school, trainer, telegram, other.

- With JavaScript (`public/js/partners.js`): inline validation, `fetch` POST, server messages in
  place, a 429 message, and the success panel replaces the form.
- Without JavaScript: the form posts to the page. `partner_page.handle_post` validates each field,
  calls the same API function and renders field errors, a form error or the success panel. The API
  rate limit (5 an hour for each address) counts both paths together.
- CSRF follows Frappe web forms. A guest session has no token and needs none. A signed-in visitor's
  form carries the session token in `csrf_token` (and the `X-Frappe-CSRF-Token` header for `fetch`).
- A hidden trap field (`website`) answers like a success and stores nothing.

Files: `appointment/www/partners.py`, `appointment/www/partners.html`,
`appointment/growth/partner_page.py`, `appointment/public/css/partners.css`,
`appointment/public/js/partners.js`.

## 4. Strings

Prepared in `$G/strings/` and merged into `en.json` and `am.json` with `merge_strings.py` (files
only). The site import has not run, because of the database pause:

- `F-landing.json`: `world.promise.*`, `world.amharic.*`, `world.night.partners`
- `F-onboarding.json`: `staff.onboarding.publishNow`, `publishHint`, `liveTitle`, `liveDescription`,
  `openPage`, `goHome`
- `F-auth.json`: `auth.*`, `auth.login.*`, `auth.signup.*`
- `F-partners.json`: `growthPartners.*`

Until the import runs, the Amharic landing promise, the Amharic partners page and the Amharic auth
pages show English text.

## 5. Tests

- `frontend/tests/landing-world.test.mjs`: the offer parser, the free wording keys, placeholders
  instead of numbers in the copy, the partners footer link. Passes.
- `appointment/tests/test_growth_marketing.py`: partners page en/am SEO over HTTP, sitemap and
  hreflang, reserved slug, no-JavaScript POST creates a Growth Partner through the API, field errors
  render, API errors render, the trap field, the shared rate limit (5 allowed, then refused), the
  kit links, the 404 when the program is off, and the `offer()` wordings. The form tests run
  in-process in a savepoint with `frappe.db.commit` patched. Not run yet.
- `$G/build.sh`: tsc 178 errors (baseline 178), `test:dom` pass, build pass.

## 6. Browser checks

Agent Plane manifests in `qa/manifests/growth/`:

| Manifest | Fixture | What it checks |
|---|---|---|
| `marketing-landing.yaml` | none | en, desktop, light: promise cards, offer API call, Amharic chapter toggle, finale recap, partners link |
| `marketing-landing-am-dark.yaml` | none | am, 390 px, dark: Amharic promise text, Amharic chapter, `/am/partners` link |
| `marketing-signup-timing.yaml` | `appointment.tests.growth_marketing_qa_fixtures` | sign-up to a published booking page, with the new auto sign-in and publish switch |
| `marketing-partners.yaml` | `appointment.tests.growth_marketing_qa_fixtures` | en, desktop, light: kit, inline errors, a successful application |
| `marketing-partners-am-dark.yaml` | none | am, 390 px, dark: Amharic H1, kit, Amharic field error |

The fixture `cleanup` removes the sign-up account, every business it created (and the referral rows
that point at it) and the QA partner application, through `frappe.delete_doc`. Every filter is
checked for an empty value first.

The harness cannot turn JavaScript off. The no-JavaScript path is covered by the Frappe tests and by
a local check (below).

Before the pause, read-only guest screenshots were taken with a local Playwright script (no Agent
Plane run, no writes): the landing hero with the promise, the Amharic chapter, the finale (desktop),
the promise and the chapter (390 px, dark), the sign-up and sign-in pages, `/partners` desktop full
page, `/am/partners` at 390 px dark, `/partners` with JavaScript off, and the inline form errors.
They led to these fixes: a fixed figure column for the promise cards on phones, a confirm button to
fill the sample booking page, plain bullets instead of emoji in the Telegram posts (emoji showed as
empty boxes on systems without an emoji font), the field spacing in the stacked form on phones, the
horizontal scroll on the auth pages, and the flag emoji next to the auth language toggle.

## Run after the restore

1. `$G/migrate.sh` (no DocType change in this workstream, but it reloads hooks and route rules).
2. `$G/strings.sh $G/strings/F-landing.json`, then `F-onboarding.json`, `F-auth.json`,
   `F-partners.json`.
3. `$G/test.sh appointment.tests.test_growth_marketing`.
4. `$G/qa.sh qa/manifests/growth/marketing-landing.yaml`
5. `$G/qa.sh qa/manifests/growth/marketing-landing-am-dark.yaml`
6. `$G/qa.sh qa/manifests/growth/marketing-partners.yaml appointment.tests.growth_marketing_qa_fixtures`
7. `$G/qa.sh qa/manifests/growth/marketing-partners-am-dark.yaml`
8. `$G/qa.sh qa/manifests/growth/marketing-signup-timing.yaml appointment.tests.growth_marketing_qa_fixtures`.
   Record the measured time in section 2. Review every screenshot.

## Decisions

- The Amharic promise is a new hour (22:30) in the day story, not a separate band. The landing page
  is one day in the city. A new hour fits the design. A band would break it.
- The diorama's sample screens are constants in both languages, not catalog keys. They must show
  both languages whatever the visitor's language is.
- Before the offer API answers, the page shows the most careful "free" wording.
- Open sign-up signs the account in. The visitor chose the password a second earlier, and a second
  sign-in adds nothing to security.
- Publish at setup is on by default, but the owner can turn it off. The draft flow stays.
- The partners page uses D's `tools.css`, icons, catalog reader and JSON-LD encoder, so the growth
  pages look the same.
- The language comes from the path (`/am/partners`), like D's tool pages, not from a route default.

## Open items

- The sign-up to live time is measured (section 2). Measure it again when the onboarding flow changes.
- New businesses get a slug like `business-<hash>`. Their public link is long. A readable slug at
  setup would make the shared link better. This needs a change in `workspace.create` (not done).
- Partners have no self-service view of their sign-ups. The FAQ tells them to ask the team.
