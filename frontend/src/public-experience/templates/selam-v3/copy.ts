import type { ChromeKey, PublicChrome } from "../chrome";

/*
 * Selam v3 chrome strings that only this package uses. They live under `publicSite.selam.*` in
 * en.json and am.json, and they resolve through the page's chrome (the page locale decides).
 */
export type SelamKey =
  | "flowTitle" | "frameKneel" | "frameReach" | "frameTwist" | "frameRise" | "frameStand" | "frameOf" | "showFrame"
  | "coach" | "beats" | "moreReviews" | "swipeFrames";

export function sx(chrome: PublicChrome, key: SelamKey, values?: Record<string, string | number>): string {
  return chrome.t(`selam.${key}` as ChromeKey, values);
}

/** The five frames of the hero movement, in order. */
export const FRAME_KEYS: readonly SelamKey[] = ["frameKneel", "frameReach", "frameTwist", "frameRise", "frameStand"];
