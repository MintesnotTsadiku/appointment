# Public page performance

This document describes how the public pages load on a phone, the changes that make them fast, and how to measure them. The public pages are the business website (landing page, `/book`, journal and gallery) and the schedulers (`/schedule/org/<business>`, `/schedule/p/<provider>`).

Target: Largest Contentful Paint (LCP) at most 2.5 s on a phone over 4G (guardrail G1 in `docs/design/TEMPLATE_REIMAGINATION.md`).

## 1. The problem

All public pages were one single-page application. Before the first paint, a phone had to do these steps in sequence:

1. Download the HTML.
2. Download and run the application code: about 324 KB of compressed JavaScript for the entry, plus 98 KB for the website page and the registry of all templates, and 109 KB of CSS. The registry loaded every template package, and the entry loaded the staff application, the Frappe SDK, the motion library and the full English catalog.
3. Ask the API for the published snapshot, then for the UI config.
4. Wait for the fonts. Until the config arrived, the page used the packaged fallback design, which loaded a 1.1 MB Ethiopic TTF font on every English page.
5. Render, and only then request the hero photo.

The scheduler had the same chain: its services request started only after its page code had loaded and rendered.

## 2. What changed

### 2.1 Server: data and preload hints in the HTML

`appointment/public_experience/shell_boot.py` adds a block to the page shell (`www/index.py` and `www/schedule/index.py`) for these addresses:

| Address | Inlined data | Preload hints |
|---|---|---|
| `/<slug>`, `/<slug>/<en\|am>` | Snapshot and UI config | Display font of the page script, phone crop of the hero photo |
| `/<slug>/book`, `/<slug>/blog…`, `/<slug>/gallery…` | Snapshot and UI config | Display font |
| `/schedule/org/<slug>…` | UI config of the business website | Display font |

Rules:

- The inlined data is the return value of the guest API functions (`get_public_experience_snapshot`, `get_public_ui_config`) for the same address. The page gets no data that the API does not give to a guest.
- The data is in a `<script type="application/json" id="pe-boot">` element. The browser does not run it, so the content security policy does not change. The encoder escapes `<`, `>` and `&`, so the text cannot close the element.
- The font preload is the display face of the active script only (guardrail G7). An Amharic page preloads the Ethiopic face.
- The hero preload uses the kit rule of the v3 templates (and Ergata 2): the night photo in dark mode and after dark in Addis Ababa (18:00 to 06:00), else the day photo. A `media` query limits it to phones and to the color scheme. Owner photos and older template versions get no hero preload.
- The viewport `<meta>` element is now the first element after the character set. Without it, a phone evaluates the `media` queries of the preload hints at a width of 980 px and skips them.
- If anything fails, the shell adds nothing and the page uses the API as before.

### 2.2 A lean entry for the business website

The build makes two pages from `frontend/index.html`:

- `index.html` loads `src/main.tsx`: the full application (staff pages, schedulers, accounts).
- `site.html` loads `src/site-main.tsx`: only the website routes (`src/public-site-routes.tsx`). It has no Frappe SDK, realtime, session, staff theme, tooltips or motion library.

`www/index.py` serves `site.html` for website addresses when the build has it. When a visitor follows a link to another address (for example a service row on `/book` that opens the scheduler), the website app hands the page to the full application in place. There is no page reload. The website page loads the full application code in the background two seconds after the `load` event, so this step is fast.

The website page does not register the service worker. Before, every first visit to a website started a precache of about 1.3 MB (4.4 MB uncompressed) of staff code after the page loaded.

### 2.3 Templates load on demand

`src/public-experience/templates/registry.ts` loads each package (its code and its stylesheet) on first use. A page downloads only its own template. Before, every website page downloaded all 17 packages: 80 KB of JavaScript and 80 KB of CSS, compressed.

### 2.4 The page starts its own requests early

The entries start these requests before the application code runs:

- the template package and the fonts of the inlined design (`src/public-experience/prefetch.ts`);
- the page code of the route;
- the language catalog of an Amharic page;
- the first data request of a scheduler (`src/lib/scheduler-prefetch.ts`). The page then uses this request through SWR `preload` and does not send its own. If a page changes its request, the keys do not match and the page fetches as before. A test checks that the keys match.

The website page now starts with the published config and its fonts. When the fonts are ready, it renders the template at once, without its loading screen.

### 2.5 Smaller bundles

- The English catalog: the full application registers the whole file (`src/lib/i18n/english.ts`). A website page registers only the groups it uses, `publicSite` and `bookingStates` (`src/lib/i18n/english-site.ts`, list in `vite.config.ts`). A test fails when website code uses another group.
- Vendor chunks by package: React, the motion library, the icons and the Frappe SDK each have their own chunk. Before, the icons chunk also held the motion library, and a shared React helper was in that chunk, so every page loaded the motion library.
- `public-core`: the code that all website pages share (data, page shells, template kit) is one chunk instead of about twenty small ones. On an HTTP/1.1 connection, each small file waited for a free connection.
- `src/lib/utils.ts` imported a type from the Frappe SDK as a value. This put the SDK into every page and shadowed the global `Error`. It is now a type import.

## 3. Bundle sizes

Compressed (gzip) size of the code that a page needs before it renders.

| Page | Develop 72c22ea | This work |
|---|---|---|
| Website landing page (Bloom v3), JavaScript | 422 KB (entry 324 + page and all templates 98) | 153 KB (entry 138 + template 15) |
| Website landing page, CSS | 109 KB | 43 KB |
| Fonts on an English landing page | 1.2–1.4 MB (with the Ethiopic TTF) | 23–176 KB |
| Scheduler, JavaScript | 419 KB | 441 KB, but the data request starts before the code runs |
| Staff pages, entry JavaScript | 324 KB | 352 KB |

The staff entry is 28 KB larger because it preloads `public-core`, which the scheduler needs at once.

## 4. Method

The scripts are in `~/template-v3-work/phase3-speed/scripts/` on the development machine:

- `build.sh` builds a source tree into a private folder. It never writes to `appointment/public/frontend`.
- `proxy.py` serves one build in front of the stack's web port, as the production nginx does: gzip and keep-alive. It takes the HTML from the server and puts in the script and style tags of the build. For the develop build, it removes the block that `shell_boot.py` adds (between `<!--pe-fast-->` and `<!--/pe-fast-->`), so the page is the develop page.
- `measure.py` loads each page in a new browser context with Playwright and Chrome DevTools throttling. It alternates the builds and flips their order every round. It waits for the page itself (not a loading screen) and for the LCP to settle.
- `summary.py` prints the medians.

Profiles:

- Phone: 390 × 844, device pixel ratio 2, 9 Mbps down, 3 Mbps up, 170 ms latency, CPU 4× slower, cache off, service workers blocked.
- Desktop: 1440 × 900, no throttling, cache off.

Builds: develop 72c22ea, and this work alone on 72c22ea (`mine/`, the changes of this workstream without the other phase 3 work). The final check also measured the full worktree build with all phase 3 work.

Limits of the method:

- The proxy uses HTTP/1.1. Production uses HTTP/2, so many small files cost less there.
- Four agents and the Frappe regression suite used the same eight-core machine during the runs. The load average was 11 to 21. Single loads varied by up to 2 s, so compare the medians of the same run. Absolute values are higher than on an idle machine or a real phone.
- Earlier template documents measured the stack's web port without compression. Their values (4.5 to 5.4 s for landing pages) are not comparable with the values here.

## 5. Results

Run of 2026-10-15, 18:00 to 18:10 Addis Ababa time (after dark, so the pages show their night photos). Phone: 5 rounds (3 for `/bloom-studio/am` and Ergata). Desktop: 3 rounds. "Final" is the full worktree with all phase 3 work. "This work" is this workstream alone on develop 72c22ea. LCP is the median, with the range of the single loads. CLS is the median.

### 5.1 Phone

| Page | Develop 72c22ea | Final | This work alone |
|---|---|---|---|
| `/bloom-studio` | 3.61 s (3.42–4.85), CLS 0.013 | 2.76 s (2.02–4.35), CLS 0.013 | 2.49 s (2.16–3.00) |
| `/bloom-studio/am` | 4.54 s (3.75–4.60), CLS 0.064 | 2.66 s (2.17–3.50), CLS 0.016 | – |
| `/selam-studio` | 4.26 s (3.06–4.95), CLS 0.022 | 2.37 s (2.19–2.52), CLS 0.022 | 2.35 s (1.94–3.28) |
| `/tena-studio` | 4.54 s (3.81–5.84), CLS 0 | 2.18 s (1.62–2.81), CLS 0 | 1.89 s (1.63–2.15) |
| `/abugida-studio` | 4.94 s (4.13–5.66), CLS 0 | 3.04 s (1.91–4.21), CLS 0 | 3.02 s (2.41–3.33) |
| `/meron-studio` | 4.08 s (3.75–5.48), CLS 0 | 2.52 s (2.00–3.30), CLS 0 | 3.12 s (1.88–3.97) |
| `/yared-counselling` (Ergata) | Not comparable: the release pins `ergata-therapy@2`, which develop does not have | 2.48 s (2.21–2.72), CLS 0 | – |
| `/bloom-studio/book` | 2.82 s (2.73–3.55), CLS 0.089 | 1.87 s (1.32–2.09), CLS 0.089 | 1.50 s (1.43–2.75) |
| Chooser `/schedule/org/bloom-studio` | 4.21 s (3.68–5.09), CLS 0.005 | 3.34 s (3.07–3.89), CLS 0.008 | 3.40 s (3.26–3.97) |
| Time picker `…/EVT-2026-000005?with=any` | 5.08 s (3.82–6.22), CLS 0.003 | 4.06 s (3.75–5.34), CLS 0.003 | 4.08 s (3.92–6.70) |

TTFB was 120 to 320 ms in all builds. The inlined data adds about 11 KB (compressed) to the HTML of a landing page.

Bytes per landing page load (median, compressed): JavaScript requested before the LCP fell from 430 KB to 153–158 KB, CSS from 111 KB to 46–57 KB, fonts from 1.2–1.6 MB to 23–382 KB. Image bytes did not change. On the scheduler, the JavaScript is 454 KB (432 KB on develop).

### 5.2 Desktop

| Page | Develop 72c22ea | Final |
|---|---|---|
| `/bloom-studio` | 1.24 s | 1.09 s |
| `/selam-studio` | 1.64 s | 0.88 s |
| `/tena-studio` | 1.16 s | 0.94 s |
| `/abugida-studio` | 1.34 s | 1.06 s |
| `/meron-studio` | 1.37 s | 1.03 s |
| `/schedule/org/bloom-studio` | 1.39 s | 1.23 s |

### 5.3 Visual check

Screenshots of develop and this work, with reduced motion and a fixed time of day, are identical to the pixel: the five v3 landing pages, `/bloom-studio/am` and the chooser, in light and dark, at 390 and 1440 px.

### 5.4 What is still slow

- The medians of the landing pages are 2.2 to 3.0 s on a loaded machine. Bloom, Selam, Tena and Ergata meet 2.5 s in most loads. Abugida did not: its first layout took about 0.75 s of main-thread time at 4× CPU. Fixed in 5.5.
- After the code arrives, the first render and layout of a template take 0.5 to 1 s at 4× CPU. Faster pages need lighter template markup or CSS (for example fewer sections in the first render), not shell work.
- The scheduler still loads the full application (454 KB). Its LCP waits for the services data, the page code and a render. A lean scheduler entry is the next step.
- `/book` had a CLS of 0.089 on develop and after the first pass. Fixed in 5.5.
- On an Amharic page, the template waits for the server catalog of the language (about 130 KB compressed). The page now requests it at start, not after the first render.

### 5.5 Consolidation run (2026-10-15, 22:45–23:20 Addis Ababa time)

The same method on an idle machine (load average about 1.5), after the consolidation fixes. "Final" is the whole worktree with all phase 3 work (`~/template-v3-work/phase3-final/builds/dist-d`). Phone: 5 rounds; desktop: 3 rounds. Median LCP (range), CLS is the worst load.

| Page | Phone, develop 72c22ea | Phone, final | Desktop, develop | Desktop, final |
|---|---|---|---|---|
| `/bloom-studio` | 2.73 s (2.63–4.56), CLS 0.012 | 1.52 s (1.48–1.95), CLS 0.012 | 0.76 s | 0.44 s |
| `/bloom-studio/am` | 3.27 s (2.94–3.87), CLS 0.242 | 1.86 s (1.70–2.10), CLS 0.010 | – | – |
| `/selam-studio` | 2.90 s (2.56–3.01), CLS 0.022 | 1.35 s (1.29–1.42), CLS 0.022 | 0.68 s | 0.75 s |
| `/tena-studio` | 2.82 s (2.67–3.08), CLS 0 | 1.42 s (1.36–1.68), CLS 0 | 0.74 s | 0.41 s |
| `/abugida-studio` | 2.87 s (2.74–2.91), CLS 0 | 1.50 s (1.37–1.72), CLS 0 | 0.67 s | 0.48 s |
| `/meron-studio` | 3.04 s (2.85–3.66), CLS 0 | 1.49 s (1.41–1.84), CLS 0 | 1.02 s | 0.56 s |
| `/yared-counselling` (Ergata 2; not comparable on develop) | 2.68 s | 1.69 s (1.58–2.44), CLS 0 | 0.76 s | 0.66 s |
| `/bloom-studio/book` | 2.40 s (2.29–3.10), CLS 0.089 | 1.28 s (1.24–2.02), CLS 0.005 | 0.68 s | 0.61 s |
| Chooser `/schedule/org/bloom-studio` | 2.95 s (2.82–3.79), CLS 0.005 | 2.74 s (2.70–2.93), CLS 0.007 | 0.89 s | 1.06 s |
| Time picker `…/EVT-2026-000005?with=any` | 3.38 s (3.33–3.99), CLS 0.004 | 3.28 s (3.10–6.21), CLS 0.016 | – | – |

Every landing page and `/book` meet 2.5 s on the phone profile. The run was after the last open time of the day, so the time picker opened on the next open day (`docs/growth/BOOKING_LAYOUT.md`, "The first day"): one more slots request, and the note above the list (the small CLS).

Two fixes of this run:

- **Abugida:** its first layout took about 0.3 s at 4x CPU (about 0.1 s for the other templates), because the browser laid out the whole long page before the first paint. The sections under the hero have `content-visibility: auto` now (`docs/design/ABUGIDA_V3.md`, "Performance"). The first layout is about 0.14 s.
- **`/book` CLS 0.089:** the live "next free" chip of the handoff appeared when the free times arrived and pushed the service list down by its height (84 px on Bloom). Every v3 handoff and Ergata 2 now draws an invisible chip in its place while the free times load (`NextChip` `pending`), and Bloom also keeps the live line of each service row. Measured with `shifts.py`: Bloom 0.089 → 0.006, Selam 0.068 → 0.007, Tena 0.060 → 0.001, Abugida 0.048 → 0.003, Meron 0.047 → 0.013, Ergata 0.020 → 0.

## 6. Checks

- Frontend gate: typecheck 123 errors (develop: 124), `npm run -s test:dom` passes (with the new `tests/public-performance.test.mjs`), `npm run -s build` passes and writes `site.html`.
- Backend: `appointment.tests.test_shell_boot` (11 tests) passes. Full Frappe regression: 793 tests, 1 failure in `test_data_preservation` (the site's record counts differ from its fixed baseline, the same as in the phase 2 run).
- Browser QA on the development server (`http://localhost:47800`), 38 manifests: 35 passed, BQA-2026-00485 to BQA-2026-00531. `booking-journey-meron`, `-selam` and `-tena` (BQA-2026-00491, 00495, 00499) failed after 17:30 because the first service of each showcase had no free time left that day. The develop build shows the same disabled slots.
- Browser QA on the web port (`http://localhost:47801`, the built `site.html` with the inlined data), 16 manifests, BQA-2026-00533 to BQA-2026-00556: the journey, gallery and dark checks that do not depend on the clock passed. The other failures are expected on a built page: `?preview-time=` works only in development builds, so the greeting checks fail. The gallery preview frame is blocked by `frame-ancestors 'none'` on the web port, also on develop. After 18:00 the Bloom and Abugida journeys had no free time left.

## 7. Keep it fast

- Do not import a template package from shared code. Add it to the registry with `lazyPackage`.
- Do not import staff code, the Frappe SDK or `framer-motion` from website code. `tests/public-performance.test.mjs` checks the static imports of `site-main.tsx`.
- Website code translates only with the groups in `WEBSITE_TRANSLATION_GROUPS` (`vite.config.ts`). Add a group there when website code needs it.
- When a scheduler changes its first request, change `src/lib/scheduler-prefetch.ts` too.
- Keep the hero photo eager and `fetchpriority="high"`, and keep the kit night rule. `shell_boot.hero_preloads` repeats it.
