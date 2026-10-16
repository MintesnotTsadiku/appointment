# Template refinement standard

## Goal

Bring each selected template as close as possible to its approved reference. Keep only necessary platform adaptations. Enkua is the accepted example of this process, not a visual style for other templates to copy.

## Order

1. Automotive — Precision Atlas.
2. Accounting — A Day in Addis.
3. Coffee — Field Atlas.
4. Hana — Addis Field Notebook, revision 2.
5. Dr. Dawit — Medical Journal V2.
6. Real estate — Living Gallery.

Start each template with analysis only. The user can change this order. Do not change another template while reviewing the current one.

## Review and approval stages

1. Read the template package, recipe, design document and approved reference.
2. Capture the current page and show it beside the reference. Compare section order, geometry, spacing, type, colors, imagery and details.
3. Explain each mismatch and each necessary platform adaptation. Wait for the user's approval of the analysis before rebuilding.
4. Rebuild within the template's independent package. Preserve its visual identity and responsive hierarchy.
5. Review motion, loading, booking skin, success, holiday and time-of-day moments against that design. Use only forms that fit it.
6. Show the verified result beside the reference and previous implementation. Wait for approval before committing and pushing that template to develop.

Main stays unchanged unless the user explicitly asks to advance it.

## Acceptance standard

- Match the reference closely. Do not claim pixel accuracy without browser evidence. Record remaining differences and their reasons.
- Keep the existing headless kit and shared booking behavior. Never import another template's visual components.
- Preserve natural English and Amharic, including the language handoff into booking.
- Review desktop at 1440 px and phone at 390 px, in both languages and both themes.
- Check landing, booking handoff, scheduler, loading and success. Verify keyboard focus, AA contrast and reduced motion.
- Choose imagery that fits the business and Ethiopian context. Use credible industry representation without invented demographic ratios. Staff faces are allowed. Show clients from behind or turned away.
- Provide a designed dark mode and the declared recipe expression. Owner-controlled availability, Habesha hours and holiday settings must work.
- Keep assets local, processed and checksummed. Use the idempotent seeder for showcase changes.
- Keep Agent Plane screenshots and traces outside Git. Record run IDs and review artifacts in the design document.
- Keep TypeScript errors at or below the starting baseline. Pass DOM tests, production build and relevant Frappe tests.
- Check the phone LCP budget of 2.5 seconds. Record conditions, individual results and any misses, not just a favorable median.
- Resolve relevant failures before approval. Report unrelated existing failures separately.

## Enkua acceptance

The user approved Enkua's rebuilt design and experience refinements and authorized its push to develop. Final browser runs: BQA-2026-00743 and BQA-2026-00744. DOM tests and production build passed. TypeScript remained at 123 existing errors. See ENKUA.md for evidence and the earlier performance measurements.
