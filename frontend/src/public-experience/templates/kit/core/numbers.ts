/**
 * Count-up values and Ge'ez numerals. Pure (tests load this file directly).
 */

const GEEZ_ONES = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
const GEEZ_TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];

/** One pair of digits (1 to 99) in Ge'ez. */
function pair(value: number): string {
  return GEEZ_TENS[Math.floor(value / 10)] + GEEZ_ONES[value % 10];
}

/**
 * A positive integer in Ge'ez numerals (፩ … ፺፱, ፻ hundred, ፼ ten thousand).
 * Ge'ez has no zero; 0 and values that are not whole positive numbers return "".
 * Groups of two digits are joined by ፻ and ፼; a leading ፩ before ፻ or ፼ is dropped (፻ is 100, not ፩፻).
 */
export function toGeez(value: number): string {
  if (!Number.isInteger(value) || value <= 0) return "";
  const pairs: number[] = [];
  for (let rest = value; rest > 0; rest = Math.floor(rest / 100)) pairs.unshift(rest % 100);
  let result = "";
  pairs.forEach((group, index) => {
    const position = pairs.length - 1 - index; // pairs to the right of this one
    const leadingOne = group === 1 && index === 0 && position > 0;
    if (group) result += leadingOne ? "" : pair(group);
    if (position > 0 && (group || position % 2 === 0)) result += position % 2 === 1 ? "፻" : "፼";
  });
  return result;
}

export interface Countable {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
}

/** The first number in a text ("ETB 1,100", "3 options", "12 years") with what comes before and after it. */
export function parseCountable(text: string): Countable | null {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(text || "");
  if (!match) return null;
  const digits = match[2].replace(/,/g, "");
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  return { prefix: match[1], value, suffix: match[3], decimals };
}

/** The text of a count-up frame: the number at `progress` (0 to 1, already eased) with its prefix and suffix. */
export function countFrame(countable: Countable, progress: number, options: { geez?: boolean; locale?: string } = {}): string {
  const current = countable.value * Math.min(1, Math.max(0, progress));
  if (options.geez) return countable.prefix + (toGeez(Math.max(1, Math.round(current))) || "") + countable.suffix;
  const formatted = new Intl.NumberFormat(options.locale === "am" ? "am-ET" : "en", {
    minimumFractionDigits: countable.decimals,
    maximumFractionDigits: countable.decimals,
  }).format(countable.decimals ? current : Math.round(current));
  return countable.prefix + formatted + countable.suffix;
}
