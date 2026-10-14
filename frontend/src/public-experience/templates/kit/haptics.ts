/**
 * A short vibration on a tap (Android browsers; feature-detected, so nothing happens elsewhere).
 * "select" for choosing a time, "success" for a confirmed booking. Browsers vibrate only after a
 * user gesture, so call it from the event handler or right after the booking answer.
 */
export function haptic(kind: "select" | "success" = "select"): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(kind === "success" ? [14, 50, 24] : 10);
  } catch {
    return false;
  }
}
