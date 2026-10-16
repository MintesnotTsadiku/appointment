/**
 * A test fixture, not a template: "Quiet Line", a minimal type-led package that meets the product
 * contract with the quiet expressive forms. Its recipe (`appointment/tests/fixtures/expression-minimal.recipe.json`)
 * declares typographic imagery, calm motion, a tonal dark mode, a holiday greeting line, a still success
 * moment and the greeting in the header. It has no photo and no animation. `template-expression.test.mjs`
 * checks it with the same contract as the certified packages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const recipe = JSON.parse(fs.readFileSync(path.resolve(here, "../../../appointment/tests/fixtures/expression-minimal.recipe.json"), "utf8"));

const template = `import { useRef } from "react";

import { usePublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { greetingKey, habeshaPhrase, openState, useMotionLevel, useNextAvailability, useTimeOfDay } from "../kit";
import { QuietHoliday } from "./holiday";
import "./quiet.css";

export function QuietLoading() {
  return <div className="ql-loading" role="status" aria-live="polite"><span className="ql-rule" /></div>;
}

export function QuietSite({ snapshot, locale, mode, toggleMode, publicRoot }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const level = useMotionLevel(snapshot.compiledDesign.motion);
  const now = useTimeOfDay();
  const next = useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
  const days = snapshot.placeHours?.[0] || [];
  const open = days.length ? openState(days, now) : null;
  const root = useRef<HTMLDivElement>(null);
  return <div ref={root} className="ql" data-pe-mode={mode} data-motion-level={level} lang={locale}>
    <header className="ql-header">
      <p className="ql-greet" data-qa="quiet-greeting">{chrome.t(greetingKey(now.part))}</p>
      <button type="button" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{mode}</button>
    </header>
    <main>
      <h1 className="ql-title">{snapshot.compiledDesign.identity.applicationName}</h1>
      <QuietHoliday snapshot={snapshot} locale={locale} chrome={chrome} />
      {next.status === "ready" ? <p className="ql-next">{next.data.next}</p> : null}
      {open?.closesAt ? <p className="ql-hours">{locale === "am" ? habeshaPhrase(open.closesAt) : open.closesAt}</p> : null}
    </main>
  </div>;
}
`;

const holiday = `import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { holidayGreeting, useHoliday } from "../kit";
import "./holiday.css";

/* The holiday moment as one line of type in the page flow: no drawing. */
export function QuietHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const text = holidayGreeting(holiday, locale);
  return <p className="ql-holiday" data-qa="holiday-moment" data-holiday={holiday.key} aria-label={chrome.t(text.label as ChromeKey)}>
    <strong>{chrome.t(text.title as ChromeKey)}</strong>
    {text.geez ? <span lang="am">{text.geez}</span> : null}
    <span>{chrome.t(text.line as ChromeKey, text.values)}</span>
  </p>;
}
`;

const moment = `import "./moment.css";

/* A still confirmation: a typeset rule and a check mark. Nothing moves, so reduced motion needs nothing. */
export default function QuietMoment() {
  return <div className="ql-moment" aria-hidden="true" data-qa="booking-moment" data-moment="rule"><span className="ql-moment-rule" /></div>;
}
`;

const skin = `import type { BookingSkin } from "../booking-skin";

export const quietBookingSkin: BookingSkin = {
  key: "quiet-line@3",
  name: "quiet-v1",
  frame: "square",
  servicePhotoRoles: [],
  style: () => import("./booking.css"),
};
`;

export const minimalPackage = {
  folder: "quiet-v1",
  id: "quiet-line@3",
  recipe,
  imagery: { assets: {} },
  registry: `const PACKAGES = {
  "quiet-line@3": lazyPackage("quiet-line", () => import("./quiet-v1/QuietTemplate"), () => import("./quiet-v1/QuietContent"),
    (t, c) => ({ Site: t.QuietSite, Booking: t.QuietBooking, Content: c.QuietContent, Loading: t.QuietLoading })),
};`,
  moments: `const MOMENTS = {
  "quiet-line@3": lazy(() => import("./quiet-v1/QuietMoment")),
};`,
  files: {
    "QuietTemplate.tsx": template,
    "holiday.tsx": holiday,
    "QuietMoment.tsx": moment,
    "booking.tsx": skin,
    "quiet.css": `.ql { --ql-ink: #1d1b18; --ql-paper: #f6f3ec; color: var(--ql-ink); background: var(--ql-paper); }
.ql[data-pe-mode="dark"] { --ql-ink: #ece7dc; --ql-paper: #191816; }
.ql button { transition: color 120ms ease-out; }
@media (prefers-reduced-motion: reduce) { .ql * { transition: none !important; } }
[data-motion-level="none"] .ql * { transition: none !important; }
`,
    "holiday.css": `.ql-holiday { display: flex; gap: 0.5rem; font-style: italic; }\n`,
    "moment.css": `.ql-moment-rule { display: block; height: 2px; background: currentColor; }\n`,
    "booking.css": `[data-bk-skin="quiet-v1"] .bk-card { border-radius: 0; }\n`,
  },
};
