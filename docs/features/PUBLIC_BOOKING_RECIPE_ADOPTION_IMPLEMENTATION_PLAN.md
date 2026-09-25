# Public Booking Recipe Adoption — Follow-up Plan

**Status:** follow-up after the Quiet Trust public-site slice
**Date:** 2026-09-25
**Depends on:** `docs/implementation/quiet-trust-warm-editorial-architecture.md`

## Decision

The accepted Brand Recipe already provides the public identity, semantic typography, palette, density, surfaces, protected states, and typed booking intents. The booking lifecycle follow-up must consume the release-scoped `CompiledDesign` and must not read mutable profile data or create a second theme/recipe authority.

The current `/:slug/book` route is a branded handoff shell. It links to the established scheduler path `/schedule/org/{slug}`. This preserves the validated booking domain behavior while making the adapter boundary explicit.

## In scope for the follow-up

- identify the canonical scheduler calendar, form, confirmation, reschedule, and cancellation routes;
- expose a narrow release-scoped booking adapter interface;
- apply semantic typography, presentation density, CTA hierarchy, surface treatment, focus/reduced-motion rules, and protected state tokens;
- preserve organization/provider/service/location ownership checks and booking idempotency;
- verify direct-entry, refresh, locale, empty/error/loading, keyboard, mobile, and reduced-motion behavior;
- replace the handoff incrementally only after each lifecycle surface passes acceptance.

## Out of scope

Do not redesign all booking generations at once, change booking domain semantics, add arbitrary editor controls, translate obsolete links, maintain two CTA renderers, or add a public switch between visual systems. The scheduler handoff remains the supported boundary until the adapter replaces it surface by surface.

## Adapter contract

```text
resolve_public_booking_context(host, path)
  -> { releaseHash, compiledDesign, identity, bookingProjection, locale }

render_booking_surface(context, canonicalBookingState)
  -> branded lifecycle surface
```

The adapter accepts canonical booking facts and protected state roles. It cannot change availability semantics, permission outcomes, destructive meaning, or tenant identity. Release/hash changes are explicit; a journey never silently combines two release artifacts.

## Acceptance

A surface is adopted only when it proves release pin integrity, owner isolation, safe direct navigation, action intent correctness, keyboard/focus, reduced motion, responsive layout, English/Amharic font coverage, no raw editor hrefs, and existing booking regression tests. Rollback is to the previous immutable Experience Release or the scheduler handoff at the adapter boundary, not to a second branding system.
