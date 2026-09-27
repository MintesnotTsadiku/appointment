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

## Safe configuration

Templates consume escaped typed content and validated actions. They may use compiled palette and typography tokens, but token changes do not replace the package's visual hierarchy. Repository-owned supporting assets are checksummed in the showcase catalog.

Customers cannot upload executable templates, arbitrary CSS, JavaScript, or raw HTML. A bespoke design is reviewed and deployed as a new certified package with a unique renderer key.

## Acceptance

Every template requires desktop and mobile browser captures for its landing page and booking handoff. Acceptance compares the real browser output with the committed design reference and checks console and network failures. Structural tests reject imports from the retired shared visual renderer.
