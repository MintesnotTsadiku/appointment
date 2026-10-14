/**
 * The headless template kit: behaviour only (hooks, timing, data). No visual component lives here;
 * each template package renders its own markup and CSS. See docs/design/TEMPLATE_V3_KIT.md.
 */
export { allows, easeOut, maskTiming, resolveMotion, revealDelay, viewProgress, type MotionLevel } from "./core/motion";
export { countFrame, parseCountable, toGeez, type Countable } from "./core/numbers";
export { coverRadius, glowPosition, magneticOffset, tiltAngles } from "./core/pointer";
export { loadingAttributes, MOBILE_QUERY, pictureSet, widthSet, type PictureAsset, type PictureSet, type PictureSource } from "./core/picture";
export { ADDIS, afterDark, clockIn, dayPart, habeshaPhrase, openState, parseClock, WEEKDAYS, type DayPart, type OpenState, type OpeningDay, type Weekday } from "./core/clock";
export { parseAvailability, slotLabel, type NextAvailability, type SlotFacts, type SlotLabel } from "./core/availability";
export { supportsScrollTimeline, useCountUp, useMotionLevel, useReveal, useScrollProgress } from "./motion";
export { usePointerEffects } from "./pointer";
export { useMarquee, type MarqueeState } from "./marquee";
export { bookingTransition, circularModeSwitch } from "./transitions";
export { useTimeOfDay, type TimeOfDay } from "./time";
export { useNextAvailability, type AvailabilityStatus } from "./availability";
export { haptic } from "./haptics";
export { useSectionProgress } from "./progress";
