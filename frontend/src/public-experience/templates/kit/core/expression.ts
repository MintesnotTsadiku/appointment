/**
 * The expressive forms of a template: how it meets each expressive quality of the quality bar
 * (docs/design/TEMPLATE_REIMAGINATION.md, section 8). The recipe manifest declares them under
 * `expression`; the compiled design carries the declaration. Pure.
 *
 * A template package knows its own forms. Use this for shared code that must treat templates alike,
 * and remember that a release published before the declaration has no `expression`.
 */

export type ImageryForm = "photographic" | "illustrative" | "typographic" | "pattern" | "mixed";
export type MotionForm = "expressive" | "standard" | "calm";
export type DarkModeForm = "night-photos" | "tonal" | "graded";
export type HolidayForm = "decoration" | "greeting";
export type SuccessForm = "animated" | "static";
export type GreetingForm = "hero" | "header" | "tone";

export interface TemplateExpression {
  imagery: ImageryForm;
  motion: MotionForm;
  darkMode: DarkModeForm;
  holiday: HolidayForm;
  success: SuccessForm;
  greeting: GreetingForm;
}

/** The choices of each quality. The twin of `EXPRESSION_CHOICES` in `appointment/public_experience/recipes.py`. */
export const EXPRESSION_CHOICES: { readonly [Q in keyof TemplateExpression]: readonly TemplateExpression[Q][] } = {
  imagery: ["photographic", "illustrative", "typographic", "pattern", "mixed"],
  motion: ["expressive", "standard", "calm"],
  darkMode: ["night-photos", "tonal", "graded"],
  holiday: ["decoration", "greeting"],
  success: ["animated", "static"],
  greeting: ["hero", "header", "tone"],
};

/** The forms of a recipe without a declaration (`EXPRESSION_DEFAULTS` in `recipes.py`); motion follows the design. */
export const EXPRESSION_DEFAULTS: Omit<TemplateExpression, "motion"> = {
  imagery: "photographic",
  darkMode: "tonal",
  holiday: "greeting",
  success: "static",
  greeting: "tone",
};

function pick<Q extends keyof TemplateExpression>(raw: Record<string, unknown>, quality: Q, fallback: TemplateExpression[Q]): TemplateExpression[Q] {
  const value = raw[quality];
  return (EXPRESSION_CHOICES[quality] as readonly unknown[]).includes(value) ? (value as TemplateExpression[Q]) : fallback;
}

/** The declared forms of a compiled design, with the defaults for anything not declared or not valid. */
export function resolveExpression(design: { expression?: unknown; motion?: string } | null | undefined): TemplateExpression {
  const raw = design?.expression && typeof design.expression === "object" ? (design.expression as Record<string, unknown>) : {};
  const motion = pick({ motion: design?.motion }, "motion", "calm");
  return {
    imagery: pick(raw, "imagery", EXPRESSION_DEFAULTS.imagery),
    motion: pick(raw, "motion", motion),
    darkMode: pick(raw, "darkMode", EXPRESSION_DEFAULTS.darkMode),
    holiday: pick(raw, "holiday", EXPRESSION_DEFAULTS.holiday),
    success: pick(raw, "success", EXPRESSION_DEFAULTS.success),
    greeting: pick(raw, "greeting", EXPRESSION_DEFAULTS.greeting),
  };
}
