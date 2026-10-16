# Mizan Auto Lab — Precision Atlas

Approved reference: [precision-atlas-desktop.png](../design-references/public-experience/mizan/precision-atlas-desktop.png).

Package `mizan-v3`, recipe `mizan-inspection@3`, showcase `/mizan-studio`. Dawit Bekele is the independent provider.

## Design and expression

A white report-style hero, numbered inspection menu and a car schematic make the page read like an inspection report. Rules and measurements organize the page.

The recipe declares `imagery: mixed`. Photographs introduce people and places. Type, rules, color fields and spacing carry the remaining sections.

`motion: calm` uses focus, hover, press and disclosure feedback. Reduced motion removes movement. This keeps the page readable in both languages.

`darkMode: tonal` uses dark ink surfaces, pale text and a lighter accent. Day photographs remain day photographs. No night variant is declared.

`holiday: greeting` and `greeting: header` place short translated lines in the running header. Holiday greetings follow the owner setting.

`success: static`: A checked report sheet confirms the booking. Its static lines match the inspection language.

The split hero and report rows become single columns. Prices and durations remain beside each service description.

## Package and content

The package owns its landing page, content pages, booking handoff, booking skin, loading state and confirmation mark. It shares only headless contracts and behavior.

The scheduler retains the shared interaction model. Its typography, colors, borders, service imagery and confirmation match this package.

English and Amharic content comes from the starter manifest, showcase definition and UI catalogs. Availability follows the owner setting. Hours support international and Habesha time.

Images are generated source photographs, separate from the approved concept board. AVIF, WebP and phone crops have checksums in the imagery manifest. `support/mizan-v3/provenance.json` records the source and processing. The collection font manifest records licenses and subsets.

The idempotent `appointment.demo.showcase.seed` command creates and refreshes this business. Gallery previews use the standard capture script and catalog checksums. QA evidence stays in Agent Plane.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Vehicle diagnostics | 45 | 2000 | In person |
| Pre-purchase inspection | 120 | 5000 | In person |
| EV battery assessment | 60 | 3500 | In person |
| Planning call | 20 | 0 | Video |

The people, premises and prices are authored showcase content. Owners replace these facts before publishing their own business.

## Verification — 2026-10-16

The light and dark runs cover 1440px desktop and 390px phone in English and Amharic. State runs cover holidays, theme changes and loading. Booking runs capture landing, handoff, scheduler, details and confirmation. They also check the Amharic dark handoff and scheduler.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00693 | Passed |
| Dark | BQA-2026-00694 | Passed |
| Holiday and loading states | BQA-2026-00708 | Passed |
| Booking journey | BQA-2026-00709 | Passed |
| Final collection visual review | BQA-2026-00721 | Passed |

Phone measurements use the production build, cache disabled, 390×844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Values are three-load medians. The budget is median LCP ≤ 2500 ms.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1680 | 1432–1696 | 0.0000 |
| Amharic | 1876 | 1800–2152 | 0.0000 |

Frontend gates: 123 TypeScript errors, unchanged from baseline. The DOM suite and production build pass. Focused Frappe tests cover collection manifests, section schemas, checksums, AA color pairs, shell boot and gallery contracts. The known full-suite `test_data_preservation` failure is outside this change. The full app suite was not rerun.

## Precision Atlas rebuild — 2026-10-17

The rebuild follows the approved board's compact report layout: a two-line blue/navy headline, a technician portrait and narrow diagnostic rail, three numbered service columns, one car diagram, two staff portraits, a numbered booking panel, an illustrative report table, and a workshop/location row. The original implementation was 6250px tall at 1440px width; the rebuild is about 3462px. The reference scales to about 3611px at that width. Text, navigation, tables, controls and the car drawing remain native HTML/CSS/SVG.

Mizan owns the `Mizan Atlas` font alias. Latin Figtree and Ethiopic Menbere use matching weight ranges; otherwise Chromium selects the Ethiopic range and falls back to DejaVu for Latin. These declarations live only in the Mizan package. The header and footer read the bilingual site identity. A narrow outline separates the headline from the photo without changing the reference's sharp photo edge.

### Necessary adaptations

- The shadcn service selector selects a real offering. Dates, times, locations and contact details remain in the shared scheduler. The landing page does not pretend to save vehicle details.
- Live availability appears below the main actions. Habesha hours remain available in the visit section. A subtle header greeting also appears on phones.
- The sample report is explicitly illustrative. It does not describe an actual customer's vehicle or promise an inspection result.
- The seeder-owned business remains in Bole. Its schematic map is labelled “not to scale” and links to address-based directions. It does not invent a precise coordinate or adopt the reference's Gerji address.
- Selam Tesfaye is a display-only staff profile. Dawit remains the bookable provider; the second portrait does not create another calendar or capacity.
- Journal, gallery and the platform credit remain functional footer destinations.

### Expression and imagery

The recipe's existing declarations still apply: mixed imagery, calm motion, tonal dark mode, a holiday greeting, a static success moment, and a header greeting. Fine hover/focus/press feedback and a small kit-controlled team reveal suit an inspection report. Reduced motion removes movement and keeps photographs visible. Loading uses a static report skeleton. Booking confirmation uses a checked report sheet and the bilingual acknowledgement “Your next step is booked.” The booking skin uses the same type, blue accent, fine rules and square controls.

Seven new photographs show the male lead technician, a female inspection specialist, diagnostic equipment, brakes, an engine and the workshop. Staff faces are intentional; no customer faces appear. These are authored showcase people and premises. The hero and lead portrait depict the same technician. The generated source files are kept outside Git under `~/template-new/mizan-rebuild/raw/`. Prompts are in `docs/design-references/public-experience/mizan/asset-prompts-r2.txt`. Responsive WebP/AVIF assets and checksums are in the imagery manifest and showcase catalog; `support/mizan-v3/provenance-r2.json` records processing. Dark mode keeps day photographs on a deliberate navy palette.

### Scoped refresh

Use `appointment.demo.showcase_refinement.refresh` with `{"key":"mizan"}` for this existing showcase. It takes the normal seeder lock, verifies ownership and identity, refreshes only the selected business, records the version and is a no-op on a repeated run. It does not create, clean up or refresh peer businesses. Mizan's authored revision is 9. The tests patch commits and roll back; they verify preserved booking IDs, display-only staff and peer isolation.

### Rebuild verification

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Final light: English/Amharic, desktop/phone | BQA-2026-00755 | Passed |
| Final dark: English/Amharic, desktop/phone | BQA-2026-00757 | Passed |
| Holiday, theme change, light/dark loading | BQA-2026-00752 | Passed |
| Booking handoff, scheduler, details, success | BQA-2026-00756 | Passed |
| Deferred service selector preserves offering | BQA-2026-00758 | Passed |

The DOM suite and production build pass. TypeScript remains at 123 errors, equal to the starting baseline; none are in Mizan. Two Mizan seeder tests, five collection contract/checksum/contrast tests and two reference regression tests pass. The browser checks found no horizontal overflow or broken images in either language, mode or viewport. Reduced-motion checks report `none` and visible team photographs. Fixture cleanup removed the one booking created by each journey run.

The selector code loads when the booking section approaches the viewport; the booking handoff loads it immediately. This keeps its controls out of the initial hero download. Final phone measurements use the same cold-cache production-build profile as the earlier table.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1744 | 1692–2796 | 0.0000 |
| Amharic | 2156 | 1820–2560 | 0.0014 |

Both three-load medians meet the 2500ms budget. Individual loads reached 2796ms in English (including a 1260ms server response) and 2560ms in Amharic; the budget result is a median, not a guarantee for every load. The hero lead sentence now comes from published bilingual content, removing the late Amharic translation reflow. Initial JavaScript fell from 182.9KB to 151.8KB after deferring the selector.

The shared scheduler currently displays the stored English service name on its otherwise Amharic screen. This is an existing shared offering-contract limitation, not a Mizan translation key. This refinement does not change the shared scheduler or other templates.

The local review at `http://localhost:47912/comparison.html` compares the approved reference, previous implementation and rebuilt screenshots in both languages and modes at 1440 and 390 pixels. Browser evidence stays in Agent Plane artifacts. Only the Mizan product gallery preview assets are refreshed in Git. Nothing is committed or pushed pending visual approval.
