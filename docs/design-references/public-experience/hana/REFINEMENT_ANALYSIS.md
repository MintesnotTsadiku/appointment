# Hana Bekele — Addis Field Notebook comparison

Analysis recorded on 2026-10-17. Hana implementation and business records are unchanged. This comparison defines the proposed rebuild for review.

Approved source: [revision-2-01-addis-field-notebook.png](revision-2-01-addis-field-notebook.png). Current website: `http://localhost:47800/hana-bekele`.

## Finding

The current site has condensed headings, a grid, and orange accents. Its composition does not match the reference. The reference presents a creator's editorial notebook before offering paid time. The current page presents services first, then a biography and several generic booking sections.

The reference is 772×2037. At 1440 px wide, it scales to approximately 3800 px tall. The current English desktop capture is 1440×5340, about 41% taller. The current English phone is 390×7359. These dimensions describe the captures; they are not fixed-height requirements.

## Visual comparison

| Area | Approved reference | Current implementation | Rebuild standard |
| --- | --- | --- | --- |
| Header | Compact bilingual name, editorial section links, language/theme controls, black booking button | Small name, generic Services/Team/Visit links, separate greeting strip, no booking button | Restore the bilingual masthead and compact navigation. Keep the greeting subtle in the header. |
| Hero type | Extremely large, tightly condensed black `HERE,` / `IN ADDIS.` headline occupying most of the left half | Smaller two-line heading inside a padded copy panel | Match the scale, line breaks, density, and left alignment. Use native text and a readable Ethiopic counterpart. |
| Hero imagery | Three upright photographs: Addis street, coffee ritual, and Hana walking. Pale street-map linework behind them | One large tilted portrait with a small coffee inset | Restore the three-photo hierarchy, rectangular crops, numbered labels, and pale map background. |
| Hero details | Monospaced introduction, orange text link, handwritten notes, restrained location label | Regular body copy, filled orange button, hard-coded coordinates | Use the reference's type contrast and small orange discovery link. Keep the primary booking action in the header. Do not present unverified coordinates. |
| Connecting structure | Thin orange path connects hero photos, turns into the left gutter, and links four numbered field notes | Isolated section numbers and short dashed dividers | Build one coherent route with circular stops and a narrow index gutter. |
| First field note | Large podcast conversation photo, title and play link beside it, two small related stories below | Four paid services immediately follow the hero | Put editorial work first. Preserve the feature-plus-two-teasers composition with truthful content and working destinations. |
| Second field note | Wide market photograph of Hana, with a narrow handwritten note, short biography, and social links on the right | Large beige biography band and another seated studio portrait | Restore the market scene, wide rectangular frame, white grid paper, and narrow annotation column. |
| Service menu | Four compact numbered rows with description, duration, fee, black Select buttons; optional collaboration inquiry row | Four tall rows with repeated photographs, small links, and substantial spacing | Use the reference's compact table rhythm. Keep the four real offerings and their booking identities. |
| Booking panel | Selected experience, date/time columns, timezone, customer details, and black continuation button | A separate large call-to-action section | Preserve the panel's visual hierarchy while using real availability and the shared scheduler. No decorative date buttons or duplicate customer form. |
| Supporting information | Information is integrated into the notebook and booking panel | Separate preparation, FAQ, and two-location hours sections | Fold useful preparation, FAQs, meeting details, and hours into compact supporting areas near booking. Keep required information accessible. |
| Footer | Wide hand-drawn Addis skyline, bilingual signature, real social links, compact address, and postal-style ornament | Plain text footer with journal/gallery links | Restore the skyline illustration and compact footer composition. Keep existing content routes discoverable. |
| Color and texture | Near-white fine graph paper, black typography and buttons, small vivid orange route accents | Cream paper, large beige bands, coarse grid, rust-colored buttons | Match the reference's paper, grid density, black actions, fine rules, and restrained orange marks. |

The image does not identify exact font families. The target is the visible width, weight, spacing, and hierarchy. Handwritten English notes need legible Amharic translations, not artificially distorted Ethiopic lettering.

## Proposed sequence

1. Compact bilingual masthead and oversized hero beside the mapped three-photo collage.
2. `01 — What we talk about`: one featured conversation or field note and two smaller related entries.
3. `02 — In between`: the market photograph and a concise personal note.
4. `03 — Let's compare notes`: the compact service menu.
5. `04 — Pick a moment`: selected service, owner-enabled live availability, timezone, and real scheduler handoff.
6. Illustrated skyline and compact footer.

Preserve this order on phones. Stack the editorial feature and annotations while retaining the route, section numbers, rectangular photographs, and strong type hierarchy. Avoid recreating the current long series of generic panels.

## Necessary platform adaptations

Hana remains the sole bookable provider. Preserve these offering IDs, formats, durations, and fees:

| Offering | Duration | ETB | Format |
| --- | ---: | ---: | --- |
| Personal conversation | 20 minutes | 1500 | Online |
| Podcast and content feedback | 45 minutes | 4000 | Online |
| Coffee and conversation | 60 minutes | 5000 | In person |
| Lunch conversation | 90 minutes | 9000 | In person; meal charged separately |

The reference includes a fifth Brand Collaboration inquiry row. This is not an existing bookable service. Show it only with a configured, working inquiry action. Do not create another offering merely to fill the row.

Hana is an authored showcase persona. The source manifest does not supply genuine podcast episodes or creator social profiles. Do not invent YouTube destinations, episode durations, follower counts, or publication claims. The recommended fallback is authored field notes with real internal article destinations, using the same feature and teaser layout. Show Watch links and social icons when real owner URLs are available.

The booking panel must show real service selection and availability. Use shadcn for interactive selects and date/time controls. Keep customer details and appointment confirmation in the existing scheduler unless a supported shared handoff preserves the selected slot. The reference's dates, available times, and email field are not a specification for a second booking engine.

Keep the actual Bole meeting point and online format. Place useful meeting details and real hours near booking, with Habesha time support. Retain English and Amharic, owner-controlled holiday greetings and availability, AA contrast, keyboard focus, reduced motion, and the phone LCP budget.

## People and imagery

Use a consistent Hana across the walking, podcast, and market photographs. Her portrait is the focus because this is her personal creator website. Supporting people should fit each scene: a podcast guest viewed from behind, market vendors, and ordinary city pedestrians. Do not add unrelated portraits to meet a gender quota. Staff or the creator may face the camera; customers must face away or turn away.

Generate independent assets for the city, coffee ritual, walking portrait, podcast conversation, market, related notes, and skyline drawing. The concept board remains a reference, never a sliced page asset. Keep map labels, route, numbers, typography, and controls native.

## Expression and structure

Retain `imagery: mixed`, `motion: calm`, `darkMode: tonal`, `holiday: greeting`, `success: static`, and `greeting: header` unless the implementation demonstrates a reason to change them.

- Calm kit reveals and precise hover/focus/press feedback suit the notebook. Avoid continuous route animation and parallax.
- A loading route or notebook index should replace the current generic three-bar loading treatment.
- The booking skin should use the same paper, condensed headings, fine rules, black actions, and restrained orange selected states.
- A static route endpoint or small notebook stamp can acknowledge confirmation beside the shared localized message.
- Dark mode should use deliberate dark paper, pale map/grid lines, light typography, and controlled orange accents. Day photographs can remain unchanged.
- Put the time greeting and owner-enabled holiday line in a quiet header detail. Preserve the poster headline as the hero's main message.

Keep all visual implementation inside `hana-v3`. Share only headless kit and contracts. Refresh the exact seeder-owned Hana business, not other showcases. Preserve source assets, responsive variants, and checksums. Record final Agent Plane runs and production phone measurements in `docs/design/HANA.md`.

## Review boundary

First approve the composition and the content adaptations above. Then rebuild Hana alone and present reference/rebuilt screenshots at desktop and phone widths in both languages and themes. Commit and push only after visual approval. Main and other templates remain outside this work.

## Current-state evidence

Fresh captures on 2026-10-17 cover 1440 px desktop and 390 px phone, English and Amharic, in both themes.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Current light views | BQA-2026-00793 | Passed |
| Current dark views | BQA-2026-00792 | Passed |

The existing local stack had stopped during the earlier capture session. Restarting that same stack restored the public route and same-origin Socket.IO transport. No migration or showcase refresh was needed. The fresh captures supersede the interrupted and connection-refused attempts.

Comparison viewer: `http://localhost:47915/comparison.html`. Evidence paths, source copy, and viewer script stay under `~/template-new/hana-review/`. Screenshots remain outside Git. The only Hana repository change at this stage is this analysis document.
