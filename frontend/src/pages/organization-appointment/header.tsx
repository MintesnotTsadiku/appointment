import type { CSSProperties, ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n";

/**
 * The sticky header of the organization scheduler: the business, the steps (done steps link back) and the mode switch.
 * Its height is fixed, so the time picker's sticky columns can start right under it.
 */
export function BookingHeaderBar({ height, style, branded, recipe, home, homeLabel, name, logo, back, step, steps, actions, skin }: {
  height: string; style?: CSSProperties; branded: boolean; recipe?: string; home: string; homeLabel: string;
  name: string; logo?: string; back?: ReactNode; step?: string; actions?: ReactNode;
  /** The step indicator ("Service → Time → Details → Done"); it replaces the plain step name. */
  steps?: ReactNode;
  /** `data-bk-skin` and `data-bk-frame` of the booking skin; the skin's CSS draws the header. */
  skin?: Record<string, string>;
}) {
  return (
    <header
      className="bk-header sticky top-0 z-50 w-full backdrop-blur-xl"
      data-booking-branded={branded ? "true" : "false"}
      data-pe-recipe={recipe}
      data-qa="booking-header"
      {...skin}
      style={{ ...style, height }}
    >
      <div className="bk-header-inner mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="bk-header-brand flex min-w-0 items-center gap-3">
          {back}
          <a href={home} className="flex min-w-0 items-center gap-3 no-underline" aria-label={homeLabel}>
            {logo ? <img className="pe-brand-logo shrink-0" src={logo} alt="" /> : <span className="pe-brand-mark shrink-0" aria-hidden="true">✦</span>}
            {name ? (
              <span className="truncate text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--booking-font-display)" }}>{name}</span>
            ) : (
              <span className="bk-bone h-4 w-36" aria-hidden="true" />
            )}
          </a>
        </div>
        {steps}
        <div className="booking-header-actions">
          {step && !steps && <span className="booking-step" aria-live="polite">{step}</span>}
          {actions}
        </div>
      </div>
    </header>
  );
}

/** Light or dark, for the booking pages that do not follow a published website's mode. */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const dark = theme === "dark" || (theme === "system" && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex min-h-10 items-center gap-2 rounded-lg px-3 transition-colors"
      style={{ backgroundColor: "var(--border-subtle)", border: "1px solid var(--border-default)" }}
      aria-label={t("bookingPicker.switchTheme")}
      data-qa="booking-theme-switch"
    >
      {dark ? <Sun className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" /> : <Moon className="h-4 w-4" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />}
      <span className="text-sm font-medium max-sm:hidden" style={{ color: "var(--text-secondary)" }}>{dark ? t("bookingPicker.light") : t("bookingPicker.dark")}</span>
    </button>
  );
}
