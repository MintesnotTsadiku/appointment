/** Date, time and money in the booking's time zone and the page language. */
export function formatWhen(iso: string, timeZone: string, language: string) {
  const locale = language === 'am' ? 'am-ET' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));
}

export function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Fill {0}, {1}… placeholders in a translated string. */
export function fill(text: string, ...values: (string | number)[]) {
  return values.reduce<string>((result, value, index) => result.replace(`{${index}}`, String(value)), text);
}
