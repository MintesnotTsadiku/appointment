# Independent Public Template Packages

## Decision

Each certified public design is a separate, versioned implementation package. A template owns its component hierarchy, CSS, responsive behavior, assets, and booking handoff. Templates do not import visual components from other templates.

The shared platform remains headless. It owns tenant resolution, immutable releases, typed content, safe actions, asset policy, permissions, publishing, and booking behavior.

## Runtime boundary

An Experience Release contains a compiled design with a certified `layout.rendererKey`. The frontend registry resolves this exact key to one installed template package. Unknown keys fail closed. The registry does not infer a template from a business name, slug, palette, or image.

The first certified packages are:

- `selam-movement`
- `bloom-hair`
- `meron-atelier`
- `abugida-language`
- `tena-clinic`

Each package contains one landing implementation, one booking-handoff implementation, and one private stylesheet. Duplication between packages is intentional when it preserves independent art direction.

## Versions

The registry resolves a package by renderer key and renderer version (`tena-clinic@2`). The renderer version is the layout manifest version, and every release stores it. A redesign is a new package folder (`templates/tena-v2/`) with a new class prefix, registered next to the old one. A release stays on the package it was published with until the owner republishes on the new recipe version. Recipe manifests keep every published version loadable (`recipes.py`, `RECIPE_MANIFESTS`), and the design gallery offers the latest.

## Shared headless contracts

- `templates/content.ts`: localized content, safe links, owner photos (`contentImage`, with the release's `imageAlt`), recipe images with their catalog alt (`designImage`), price and duration formatting, and the locale-preserving booking link.
- `templates/chrome.ts`: translated platform strings for template chrome (navigation, the mode switch, "Back to site", field labels). They live under `publicSite` in the translation catalogs and follow the page locale.
- Fonts: each template bundles its own OFL faces under `appointment/public/fonts/<template>/` (built by `scripts/build_public_fonts.py`). The `@font-face` rules live in `platform.css` so the scheduler inherits them. Faces of one family share one weight descriptor, because Chrome groups faces by weight before it applies `unicode-range`.

Templates never ship invented copy. Anything a release does not contain is hidden.

## Safe configuration

Templates consume escaped typed content and validated actions. They may use compiled palette and typography tokens, but token changes do not replace the package's visual hierarchy. Repository-owned supporting assets are checksummed in the showcase catalog.

Customers cannot upload executable templates, arbitrary CSS, JavaScript, or raw HTML. A bespoke design is reviewed and deployed as a new certified package with a unique renderer key.

## Acceptance

Every template requires desktop and mobile browser captures for its landing page and booking handoff. Acceptance compares the real browser output with the committed design reference and checks console and network failures. Structural tests reject imports from the retired shared visual renderer.
