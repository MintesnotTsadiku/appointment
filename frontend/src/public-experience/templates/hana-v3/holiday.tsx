import type { TemplateProps } from "../types";
import { useHoliday } from "../kit";
import { usePublicChrome, type ChromeKey } from "../chrome";

export function SiteHoliday({ props }: { props: TemplateProps }) {
  const { snapshot, locale } = props;
  const chrome = usePublicChrome(locale);
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const label = chrome.t(`holiday.${holiday.key}` as ChromeKey);
  return (
    <span
      data-qa="holiday-moment"
      data-holiday={holiday.key}
      aria-label={label}
    >
      {label} · {chrome.t(`holiday.${holiday.key}Line` as ChromeKey)}
    </span>
  );
}
