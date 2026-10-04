# Workspace controls and discovery

BQA-2026-00227 passed the existing Home desktop/mobile, light/dark, navigation, presets, persistence, scope and reception regression, plus Appearance mode selection, opening the shared calendar and opening Browse widgets and category checkbox filtering. Screenshots in this folder come from that run. Appearance dialog padding and calendar day sizing were refined and verified in this final run.

Focused shared-component lint and DOM suites pass. The isolated Vite build passes with the existing font/import warnings. Full TypeScript still reports 271 pre-existing diagnostics, none in the changed shared controls or dashboard modules.

BQA-2026-00215 failed on an optimistic-lock conflict in reception after completing the dashboard matrix. The subsequent expanded run passed the same reception stages. This first failure is recorded rather than hidden.

Native select fields have centralized workspace styling and retain native browser menus and keyboard behavior. Shared Radix select/popover menus use the same theme surfaces. Native date entry remains available beside the shared calendar, including form registration and min/max constraints. Published template design systems remain independent.

Appearance configures color mode and navigation. Workspace palette and typography remain platform-owned theme tokens; this does not introduce arbitrary color/font editing. Published website branding is separate.

Independent BQA-2026-00222 and corrected publishing BQA-2026-00223 passed.
