# Template gallery

The product owner asked that every designed website template is available for navigation and preview on the home landing page. The landing page now has a template gallery. It is also a page of its own at `/templates`.

## What visitors see

- **Where.** The gallery is the 23:00 stop of the landing page story ("the shop windows are lit for tomorrow"), between the Amharic chapter (22:30) and the night finale (23:45). It has its own sky palette (`data-world="gallery"`). The timetable and the hour rail list it. The top bar has a "Templates" link (`#gallery`). The footer has a "Website templates" link to `/templates`.
- **A card per template.** Each card is a lit shop window: the desktop screenshot in a browser frame with the phone screenshot in front of it. Below are the focus (for example "Beauty"), the template name, who it is for, "Light and dark", "English and Amharic", and three actions:
  - "Preview" opens the preview dialog.
  - "Use this template" goes to sign-up with `?source=template_gallery&template=<key>`. A signed-in person goes to `/settings/website` with the same parameters.
  - "Open live example" opens the showcase site in a new tab. A template without a published showcase shows "Live example coming soon" and keeps its screenshot and "Use this template".
- **Preview dialog.** A full-size dialog with the template name and showcase name, a Desktop/Mobile switch, a Light/Dark switch, "Open live example", "Use this template" and a close button. It frames the live showcase (`/<slug>`, or `/<slug>/am` in Amharic) and adds `?display=light|dark`. The desktop page is drawn at 1440 px and scaled to the dialog width. The phone page is drawn at 390 x 844 in a bezel and scaled to fit. When the frame cannot load (see "Framing in production"), the dialog shows the screenshot for the chosen size and says so.
- **Phones.** The cards are a horizontal shelf that snaps card by card, with the next card visible at the edge. In the dialog the switches show icons only; their labels stay for screen readers.
- **Motion and access.** Cards rise in as they enter the view. The dialog fades and rises. `prefers-reduced-motion` stops both, as on the rest of the landing page. The dialog is a Radix dialog (focus trap, Escape, labelled title and description). The switches are Radix toggle groups. Every string is in English and Amharic (`world.gallery.*`, `world.nav.templates`, `world.night.templates`).

The showcase doors in the night finale are removed: the gallery shows the same businesses, as the live examples of their templates.

## How it is data-driven

Nothing in the page names a template.

1. `appointment.public_experience.api.get_public_template_gallery` (guest, GET) calls `template_gallery.template_gallery()`. It lists every certified recipe from `list_recipes()` (the latest version of each). For each recipe it gives the label, description and audience from the recipe manifest, the focus from `setup.CATALOG`, the locales from the recipe, the modes from the palette manifest, the palette's light primary colour, the hero and the preview screenshots of the recipe's showcase in `manifest/showcase/catalog.v1.json`, and the live showcase path and title only when that Public Site is published. The seeder (`appointment.demo.showcase.seed`) publishes a showcase for every template, the Ergata one included, so after a normal seed every card has "Open live example".
2. `frontend/src/pages/landing/shared/templateGallery.ts` validates the answer (safe keys, local `/assets` or `/files` images only, hex colours, single-segment showcase paths) and builds the links.
3. The card copy for "who it is for" and the focus label come from `world.gallery.for.<focus>` and `world.gallery.industry.<focus>`. A template with a new focus shows the recipe's own audience text until someone adds the translations.

A new recipe appears in the gallery when it is added to `RECIPE_MANIFESTS`. Its screenshots appear when its showcase is in the catalog and the capture script has run.

The frontend registry (`public-experience/templates/registry.ts`) holds the renderers. It is not imported by the landing page, so the landing bundle does not load every template's code. The registry and `RECIPE_MANIFESTS` are kept in step by hand; `public-template-packages.test.mjs` pins the registered keys.

## Preview images

`scripts/capture_template_gallery.py` opens each showcase in the catalog at desktop 1440 x 900 and mobile 390 x 844 (device scale 2), in light mode with reduced motion. It writes WebP files and records each file with its SHA-256 checksum as the site's `previewAssets` in the catalog:

```
env/bin/python apps/appointment/scripts/capture_template_gallery.py http://localhost:47800
```

`validate_showcase_catalog()` requires a desktop and a mobile preview for every showcase site and checks the checksums.

Images made on 2026-10-14 (`appointment/public/brand-experience/template-gallery/`):

| Template | Desktop (1280 px wide) | Mobile (420 px wide) |
|---|---|---|
| Selam Movement | `selam-movement-desktop.webp` 72 KB | `selam-movement-mobile.webp` 37 KB |
| Bloom Hair (v3, recaptured 2026-10-15) | `bloom-hair-desktop.webp` 74 KB | `bloom-hair-mobile.webp` 41 KB |
| Meron Atelier | `meron-atelier-desktop.webp` 66 KB | `meron-atelier-mobile.webp` 36 KB |
| Abugida Language | `abugida-language-desktop.webp` 77 KB | `abugida-language-mobile.webp` 45 KB |
| Tena Clinic | `tena-clinic-desktop.webp` 50 KB | `tena-clinic-mobile.webp` 41 KB |
| Ergata Therapy | `ergata-therapy-desktop.webp` 60 KB | `ergata-therapy-mobile.webp` 33 KB |

Run the script again after a template redesign and commit the new images with the catalog change. The script opens each showcase with `?preview-time=16:30`, so a template with day and night photos (Bloom v3) shows its day photos. The gallery lists the latest recipe version of each template; Bloom is v3 (`docs/design/BLOOM_V3.md`). Runs of 2026-10-15 after the Bloom v3 move: BQA-2026-00262 (`template-gallery.yaml`, passed, 0 console, 0 network errors).

## Showing a showcase in a chosen mode

The public experience reads `?display=light` or `?display=dark` on first load (`PublicExperienceProvider.storedPreference`). The parameter sets the mode for that view only. It is not saved, so a preview never changes the visitor's own mode for public sites. The template's own mode switch still works inside the preview.

## Framing in production

The preview frames a same-origin page. On the development stack (Vite on port 47800) this works. In production, the Frappe shell sends `frame-ancestors 'none'` and `X-Frame-Options: DENY` for every public page (`public_experience/csp.py`). The browser then refuses the frame. The dialog treats a frame whose document it cannot read as refused and shows the screenshot instead (not yet seen on a production server), with "This is a picture of the template. Open the live example to try it."

To show the live frame in production, a security owner must decide to allow same-origin framing (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`) for the platform showcase slugs only. That change is not made here.

## Sign-up and the chosen template

"Use this template" passes `source=template_gallery` and `template=<key>`. The choice goes with the new owner to the first website setup.

### The flow

1. **Sign-up.** `/signup` reads `template` (`lib/template-choice.ts`) and sends it to `registration.signup` with `ref` and `source`. The prefilled quick start (`?prefill=`) sends it too, and its "expired" link keeps it. The "Sign in" links on sign-up go to `/login?redirect-to=/settings/website?source=template_gallery&template=<key>`, so a person who already has an account lands on website setup with the choice.
2. **Stored with the account.** `referrals.remember_signup` keeps the key in the new `template` field of the account's Business Signup Source (the record that already holds the sign-up channel and referral code). `template_choice.clean` keeps only a certified recipe key (`list_recipes()`); an unknown key is dropped without an error. When the first business is created, the record is attached to it and keeps the template.
3. **Onboarding.** Organization setup, solo setup and the quick start end on the shared success screen. When the account has a gallery template and its business has no website yet, the screen shows "Your website: <Template>" with "Set up my website", a link to `/settings/website?source=template_gallery&template=<key>` (`GalleryTemplateNext`, `template_choice.chosen_template`).
4. **Website setup, no website yet.** The template comes from the link, else from the sign-up record (`website_setup_context` returns `galleryTemplate`). The chooser selects it, puts its card first with "Your gallery choice", shows "You chose <Template> from our gallery — you can change it anytime", fills the website name and address from the business name, and draws the preview with that template. "Create website draft" makes the draft exactly as a choice in the chooser does: the recipe, its default appearance and its starter content. Business focus, feeling, audience and density only re-rank the cards; they do not replace the chosen template. The owner can pick another card at any time.
5. **Website setup, website exists.** A stored choice is never used. A link with `template` (for example a signed-in owner who clicks "Use this template") opens "Switch your website to <Template>?" at the top: the cards with that template selected and the current one marked. "Use <Template>" asks for confirmation. "Switch template" calls `switch_website_template`: the draft takes the new recipe, its default appearance and its starter content; sections the owner edited keep the owner's words. The published website does not change until the owner publishes. "Keep <current>" or Cancel leaves the site as it is. The gallery parameters leave the address once the choice is used or dismissed.
6. **Signed in without a business.** Website setup calls `template_choice.note_template`, which keeps the template on the account's pending sign-up record without changing its referral code or channel.

### Why the server keeps it

The choice must survive automatic sign-in, a later sign-in, administrator approval (the account is disabled until approved), another browser and a lost tab. A value in browser storage loses all of these. The Business Signup Source already follows the account from sign-up to its first business, so the template is one more field on it.

## Routes## Routes

- `/templates` is reserved in `public_experience/reserved.py` and `frontend/src/public-experience/routes.ts`, so no Public Site can take the slug.
- `/templates` is in `modeToggleRoutes.ts`: like `/`, it is tinted by the story clock and has no global light/dark toggle.

## Files

- Backend: `appointment/growth/template_choice.py` (the stored choice), `public_experience/template_switch.py` (switch an existing draft), `api.switch_website_template`, `website_setup_context.galleryTemplate`, the `template` field on Business Signup Source, `appointment/public_experience/template_gallery.py`, `api.get_public_template_gallery`, `showcase_catalog.py` (preview validation), `reserved.py`, `manifest/showcase/catalog.v1.json` (`previewAssets`), `scripts/capture_template_gallery.py`, `appointment/tests/test_template_gallery.py`.
- Frontend: `pages/landing/day/components/TemplateGallery.tsx`, `TemplatePreview.tsx`, `gallery.css`, `pages/landing/shared/templateGallery.ts`, `useTemplateGallery.ts`, `pages/landing/templates/index.tsx`, `day/world.ts` (`gallery` world, `STOPS`), `TopBar.tsx`, `Finale.tsx`, `DayLanding.tsx`, `landing.css`, `route.tsx`, `public-experience/PublicExperienceProvider.tsx`, `public-experience/routes.ts`, `modeToggleRoutes.ts`, translations.
- Sign-up to website setup: `lib/template-choice.ts`, `pages/auth/signup.tsx`, `quick-start.tsx`, `pages/onboarding/GalleryTemplateNext.tsx`, `OnboardingSuccess.tsx`, `components/live-page-success` (`next` slot), `pages/settings/website-setup.tsx`, `pages/settings/website-template-choice/`, translations (`staff.website.templateChoice.*`).
- Tests: `appointment/tests/test_template_choice.py`, `frontend/tests/template-choice.test.mjs`, `frontend/tests/landing-world.test.mjs` (gallery parsing, links, copy, no hard-coded template), `mode-toggle-routes.test.mjs`.
- QA: `qa/manifests/growth/template-gallery.yaml`, `qa/manifests/growth/template-preselect.yaml` (fixture `appointment.tests.template_preselect_qa_fixtures`). `qa/manifests/landing/day-world.yaml` now waits for the finale call to action and checks the Bloom live example link instead of the removed doors.

## Browser QA (2026-10-14)

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00107 | `growth/template-gallery.yaml` | Passed (first version) |
| BQA-2026-00109 | `growth/template-gallery.yaml` | Failed: Vite reloaded the page during the Amharic run (another agent saved a file) |
| BQA-2026-00113 | `growth/template-gallery.yaml` | Passed, no console or network errors |
| BQA-2026-00111 | `growth/marketing-landing.yaml` | Passed |
| BQA-2026-00112 | `growth/marketing-landing-am-dark.yaml` | Passed. One socket.io polling 400 (realtime session), not from the landing page |

The gallery manifest checks, in English at desktop 1440 light: every template card, the preview images, the copy, the sign-up link, the preview dialog at desktop light and at mobile dark, the frame URLs, close, the footer link, the live example and `/templates`. In Amharic at mobile 390 dark: the Amharic top bar link and copy, every card, the preview in Amharic (`/tena-studio/am?display=…`) at mobile and desktop, light and dark, and the live example.

## Browser QA: template choice (2026-10-14)

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00152 | `growth/template-preselect.yaml` | Passed. 16 console messages, all "Blocked script execution in about:srcdoc" from the sandboxed website preview frame (`PreviewFrame`), not from this change |
| BQA-2026-00148 | `growth/template-gallery.yaml` | Passed, no console or network errors |
| BQA-2026-00150 | `growth/marketing-signup-timing.yaml` | Passed, no console or network errors |
| BQA-2026-00151 | `growth/solo-success.yaml` | Passed, no console or network errors |

`template-preselect.yaml`, en desktop 1440 light: a guest clicks "Use this template" on Ergata in the landing gallery, signs up, creates the business, sees "Your website: Ergata Therapy" on the success screen, opens website setup with Ergata selected, the note, the badge and the suggested address, sees the preview drawn with Ergata, changes the business focus (Ergata stays selected) and creates the draft on Ergata. am mobile 390 dark: the same owner signs in, clicks "Use this template" on Bloom Hair in `/templates`, gets the switch offer with Bloom selected and Ergata marked as current, cancels once (nothing changes), then confirms and the draft uses Bloom Hair.
