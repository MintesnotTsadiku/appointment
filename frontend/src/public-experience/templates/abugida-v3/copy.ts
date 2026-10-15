import type { ChromeKey, PublicChrome } from "../chrome";

/*
 * Abugida v3 chrome strings. They live in the translation catalogs under `publicSite.abugida.*`
 * (English and Amharic), so the shared chrome loader translates them with the page locale.
 */
export type AbugidaKey =
  | "contents" | "phraseTitle" | "phraseMeaning" | "phraseSay" | "phraseGloss"
  | "turnCard" | "turnBack" | "inTheMargin" | "plates" | "coaches";

export function abugidaText(chrome: PublicChrome, key: AbugidaKey, values?: Record<string, string | number>): string {
  return chrome.t(`abugida.${key}` as ChromeKey, values);
}

/** The phrase of the week is Amharic on both pages, with its sound in Latin letters. */
export const PHRASE = "ቀስ በቀስ እንቁላል በእግሩ ይሄዳል።";
export const PHRASE_SOUND = "Qes be qes, inqulal be-igru yihedal.";
