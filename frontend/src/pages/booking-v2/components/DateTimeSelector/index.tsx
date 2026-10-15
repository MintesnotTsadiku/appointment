/**
 * The booking time picker shared by organization booking, independent providers and rescheduling.
 *
 * Wide container: a side column (compact summary, calendar, a footer row with the booking notes and quiet links)
 * and a slot panel. The page fits the window: only the slot list scrolls. The panel header holds the day, the time
 * format and the time zone, and under it the "Your time" bar shows the chosen time with the next step.
 * Narrow container: the summary, then a sticky strip of days with the "Your time" row, then the slot list; on phones
 * Continue is at the bottom of the screen, in the thumb's reach. See docs/growth/BOOKING_LAYOUT.md.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Clock3, MapPin, User, Video } from "lucide-react";
import { useOnlineLabel } from "@/components/online-session/JoinSession";
import { BookingState, previewState } from "@/components/booking-states";
import { zoneLabel } from "@/lib/time";
import { intlLocale, useTranslation } from "@/lib/i18n";
import { addDays, startOfDay } from "../../utils/dateHelpers";
import { CalendarPanel, isSelectableDay } from "./CalendarPanel";
import { EthiopianCalendar } from "./EthiopianCalendar";
import { ethiopianMonthLabel, ethiopianOf, formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { TimeSlotsPanel, isSameSlot, shortProviderName, slotOpen } from "./TimeSlotsPanel";
import { BookingInfo, BookingSummaryCard, DateStrip, PhoneContinue, StripHeader, TimeFormatControl, YourTime, ZoneLabel, type SummaryFact } from "./parts";
import { useFitProbe } from "./fitProbe";
import { useOpeningDay, type OpeningNote } from "./openingDay";
import type { TimeFormat, TimeSlot } from "../../types";
import "./layout.css";

export { BookingSummaryCard, type SummaryFact } from "./parts";

const FORMAT_KEY = "booking-time-format";

function rememberedFormat(): TimeFormat | null {
  try {
    const value = window.sessionStorage.getItem(FORMAT_KEY);
    return value === "12h" || value === "24h" || value === "ethiopian" ? value : null;
  } catch {
    return null;
  }
}

/**
 * The picker's clock: Habesha time (with the Ethiopian calendar) first for Amharic readers, else 12-hour.
 * The customer's choice in the toggle wins, stays when the language changes and is remembered for the
 * tab's session (every booking page reads it).
 */
export function usePickerTimeFormat(): [TimeFormat, (format: TimeFormat) => void] {
  const { language } = useTranslation();
  const [chosen, setChosen] = useState<TimeFormat | null>(() => (typeof window === "undefined" ? null : rememberedFormat()));
  const choose = (format: TimeFormat) => {
    setChosen(format);
    try { window.sessionStorage.setItem(FORMAT_KEY, format); } catch { /* private mode: the choice lasts for the page */ }
  };
  return [chosen ?? (language === "am" ? "ethiopian" : "12h"), choose];
}

/** The next step once a slot is chosen: shown in the "Your time" bar (on phones, at the bottom of the screen). */
export interface PickerAction {
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** `data-qa` of the button; `booking-continue` by default. */
  qa?: string;
}

interface DateTimeSelectorProps {
  selectedDate: Date | null;
  displayMonth: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  availableDays?: number[];
  minDate?: Date;
  maxDate?: Date;

  availableSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  /** Choosing the chosen time again unselects it. Without it, the chosen time stays chosen. */
  onSlotClear?: () => void;

  timeFormat: "12h" | "24h" | "ethiopian";
  onTimeFormatChange: (format: "12h" | "24h" | "ethiopian") => void;
  timezone: string;
  loading?: boolean;

  serviceName?: string;
  providerName?: string;
  duration?: number;
  location?: {
    name: string;
    location_name: string;
    address?: string;
    is_online?: boolean;
    platform?: string;
  };
  /** Replaces the default summary card (service, duration, provider, place). A function gets the layout (wide or not). */
  summary?: ReactNode | ((wide: boolean) => ReactNode);
  /** More controls for the side column, such as the quantity picker. */
  extras?: ReactNode;
  /** The next step. Without it, choosing a slot calls `onSlotSelect` only (older pages move on there). */
  action?: PickerAction;
  /** More words for the "Your time" bar, such as the service and its length. */
  barDetail?: string;
  /** Quiet links (my bookings, powered by): in the footer row of the side column when wide, under the list when narrow. */
  footer?: ReactNode;
  /** Everyone who offers the service (the filter shows them even on a day they do not work). */
  providers?: Array<{ id: string; name: string; avatar?: string }>;
  /** The provider filter, when the page owns it ("all" for any provider). */
  providerId?: string;
  onProviderChange?: (providerId: string) => void;

  /** @deprecated The page header owns navigation. */
  onBack?: () => void;
  /** Inside another page (manage booking): no sticky columns, no page heading. */
  embedded?: boolean;
  /** Older pages pass raw API data; the picker does not read it. */
  rawApiData?: unknown;
  bookingConfig?: unknown;
}

/** The picker and the details step change to the wide layout at this container width. */
export const WIDE_AT = 900;
/** Below this window width, Continue sits at the bottom of the screen (thumb reach). */
const PHONE_QUERY = "(max-width: 899.98px)";
const NO_SLOTS: TimeSlot[] = [];

export function DateTimeSelector({
  selectedDate,
  displayMonth,
  onDateSelect,
  onMonthChange,
  availableDays,
  minDate,
  maxDate,
  availableSlots: givenSlots,
  selectedSlot,
  onSlotSelect,
  onSlotClear,
  timeFormat,
  onTimeFormatChange,
  timezone,
  loading = false,
  serviceName,
  providerName,
  duration,
  location,
  summary,
  extras,
  action,
  barDetail,
  footer,
  providers: offeredBy,
  providerId: chosenProvider,
  onProviderChange,
  embedded = false,
}: DateTimeSelectorProps) {
  const { t, language } = useTranslation();
  const onlineLabel = useOnlineLabel();
  // Development only: `?preview-state=empty` shows a day without open times.
  const availableSlots = previewState() === "empty" ? NO_SLOTS : givenSlots;
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const wide = useContainerWide(root, WIDE_AT, !embedded);
  const phone = useMediaQuery(PHONE_QUERY);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [stripHeight, setStripHeight] = useState(0);

  // Everyone who offers the service when the page knows them, else the providers present on this day.
  const providers = useMemo<Array<{ id: string; name: string; avatar?: string }>>(() => {
    if (offeredBy?.length) return offeredBy;
    const map = new Map<string, string>();
    availableSlots.forEach((slot) => { if (slot.provider?.id && slot.provider.name) map.set(slot.provider.id, slot.provider.name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [availableSlots, offeredBy]);
  const [ownProviderId, setOwnProviderId] = useState("all");
  const providerId = chosenProvider ?? ownProviderId;
  const setProviderId = (next: string) => (onProviderChange ? onProviderChange(next) : setOwnProviderId(next));
  useEffect(() => {
    if (!onProviderChange && providerId !== "all" && !providers.some((provider) => provider.id === providerId)) setOwnProviderId("all");
  }, [providers, providerId, onProviderChange]);
  const slots = useMemo(
    () => (providerId !== "all" ? availableSlots.filter((slot) => slot.provider?.id === providerId)
      : providers.length > 1 ? anyProvider(availableSlots) : availableSlots),
    [availableSlots, providerId, providers.length]
  );

  // Narrow: the group headings stick under the strip, so the strip's height is a layout token.
  useLayoutEffect(() => {
    const element = strip.current;
    if (wide || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setStripHeight(element.offsetHeight));
    observer.observe(element);
    setStripHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, [wide, calendarOpen]);

  const selectable = (date: Date) => isSelectableDay(date, { minDate, maxDate, availableDays });
  const today = startOfDay(new Date());
  const nextOpenDay = (from: Date, step = 1) => {
    for (let index = 1; index <= 120; index++) {
      const day = addDays(startOfDay(from), index * step);
      if (maxDate && day > startOfDay(maxDate) && step > 0) return null;
      if (selectable(day)) return day;
    }
    return null;
  };
  /** Shows a day (and its month). */
  const show = (date: Date) => {
    onDateSelect(date);
    if (date.getMonth() !== displayMonth.getMonth() || date.getFullYear() !== displayMonth.getFullYear()) onMonthChange(date);
  };
  const firstOpen = selectable(today) ? today : nextOpenDay(today);
  // The picker opens on today, or on the next day with an open time, and says so.
  const opening = useOpeningDay({ selectedDate, list: availableSlots, hasOpenTime: slots.some(slotOpen), loading, firstOpen, nextOpenDay, show,
    enabled: !previewState() });
  /** The customer's choice of a day. */
  const pick = (date: Date) => {
    opening.release();
    show(date);
  };
  const choose = (date: Date) => {
    opening.release();
    onDateSelect(date);
  };
  const nextDay = selectedDate ? nextOpenDay(selectedDate) : null;
  const previousDay = selectedDate ? nextOpenDay(selectedDate, -1) : null;
  const busy = loading || opening.settling;

  const locale = intlLocale(language);
  const zone = zoneLabel(timezone, language, t("customerBooking.zoneTime"), (city) => {
    const key = `timeZoneCities.${city}`;
    const name = t(key);
    return name === key ? null : name;
  });
  // Habesha time brings the Ethiopian calendar: the grid, the day title, the strip and "Your time".
  const ethiopian = timeFormat === "ethiopian";
  const Calendar = ethiopian ? EthiopianCalendar : CalendarPanel;
  const dayTitle = !selectedDate ? ""
    : ethiopian ? formatEthiopianDate(selectedDate, language)
    : new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(selectedDate);
  // Choosing the chosen time again unselects it (when the page allows it).
  const toggleSlot = (slot: TimeSlot) => (onSlotClear && isSameSlot(selectedSlot, slot) ? onSlotClear() : onSlotSelect(slot));
  const openingNote = opening.note && selectedDate && sameDay(opening.note.to, selectedDate)
    ? <p className="bk-open-note" role="status" data-qa="booking-next-open-note">{noteText(opening.note, today, ethiopian, language, locale, t)}</p>
    // The first day's times are loading: hold the note's place (one line), so a note does not push the list down.
    : opening.searching && busy ? <p className="bk-open-note bk-bone bk-open-note-hold" aria-hidden="true" data-qa="booking-open-note-hold">{"\u00a0"}</p>
    : null;
  const openCount = slots.filter(slotOpen).length;
  const chosen = action && selectedSlot ? availableSlots.find((slot) => slot.start_time === selectedSlot.start_time && (!selectedSlot.provider?.id || slot.provider?.id === selectedSlot.provider.id)) ?? selectedSlot : null;

  const facts: SummaryFact[] = [];
  if (duration) facts.push({ icon: Clock3, text: t("bookingPicker.minutes").replace("{0}", String(duration)), qa: "booking-summary-duration" });
  if (providerName) facts.push({ icon: User, text: t("bookingPicker.with").replace("{0}", shortProviderName(providerName)) });
  if (location) {
    facts.push(location.is_online
      ? { icon: Video, text: onlineLabel(location.platform), qa: "booking-summary-online" }
      : { icon: MapPin, text: location.location_name || location.name, detail: location.address, qa: "booking-summary-place" });
  }
  const summaryNode = typeof summary === "function" ? summary(wide)
    : summary !== undefined ? summary
    : embedded || !serviceName ? null
    : <BookingSummaryCard title={serviceName} titleQa="booking-picker-service" facts={facts} compact={!wide} />;

  const providerChips = providers.length > 1 && (
    <div className="bk-provider-row" data-qa="booking-provider-filter">
      <p className="bk-eyebrow shrink-0" id="bk-provider-label">{t("bookingPicker.filterProvider")}</p>
      <div role="group" aria-labelledby="bk-provider-label" className={wide ? "bk-provider-chips" : "bk-days"}>
        <button type="button" className="bk-chip" aria-pressed={providerId === "all"} onClick={() => setProviderId("all")} data-qa="booking-provider-any">{t("bookingPicker.anyProvider")}</button>
        {providers.map((provider) => (
          <button key={provider.id} type="button" className="bk-chip" aria-pressed={providerId === provider.id} onClick={() => setProviderId(provider.id)}
            title={provider.name} data-qa="booking-provider-option">
            {shortProviderName(provider.name)}
          </button>
        ))}
      </div>
    </div>
  );

  const slotList = selectedDate ? (<>
    {openingNote}
    <TimeSlotsPanel date={selectedDate} slots={slots} selectedSlot={selectedSlot} onSlotSelect={toggleSlot}
      timeFormat={timeFormat} timezone={timezone} loading={busy} onNextDay={nextDay ? () => pick(nextDay) : undefined} />
  </>) : (
    <BookingState kind="empty" compact headingLevel={3} qa="booking-pick-date" title={t("bookingPicker.pickDate")} description={t("bookingPicker.pickDateHint")}
      actions={firstOpen ? [{ label: t("bookingLayout.firstOpenDay"), onClick: () => pick(firstOpen), qa: "booking-first-day" }] : []} />
  );

  const countLine = !busy && availableSlots.length > 0
    ? (openCount === 0 ? t("bookingPicker.noSlots") : openCount === 1 ? t("bookingPicker.oneSlot") : t("bookingPicker.slotsAvailable").replace("{0}", String(openCount)))
    : "";
  const dayHeading = selectedDate && (
    <div className="min-w-0">
      <h2 id="bk-day-title" className="bk-day-title truncate font-semibold" style={{ color: "var(--text-primary)" }} data-qa="booking-day-title">{dayTitle}</h2>
      {wide ? (
        <p className="bk-day-meta" style={{ color: "var(--text-secondary)" }}>
          {countLine && <span data-qa="booking-open-count">{countLine}</span>}
          {countLine && <span aria-hidden="true"> · </span>}
          <ZoneLabel zone={zone} timezone={timezone} />
        </p>
      ) : <p className="text-sm" style={{ color: "var(--text-secondary)" }} data-qa={countLine ? "booking-open-count" : undefined}>{countLine || "\u00a0"}</p>}
    </div>
  );
  const dayNav = (
    <div className="flex gap-1.5">
      <button type="button" className="bk-icon-btn" disabled={!previousDay || loading} onClick={() => previousDay && pick(previousDay)}
        aria-label={t("bookingLayout.previousDay")} data-qa="booking-previous-day"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
      <button type="button" className="bk-icon-btn" disabled={!nextDay || loading} onClick={() => nextDay && pick(nextDay)}
        aria-label={t("bookingLayout.nextDay")} data-qa="booking-following-day"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  );

  // The open month calendar does not stick, so the group headings stick right under the page header.
  const style = { "--bk-strip-h": `${calendarOpen ? 0 : stripHeight}px` } as CSSProperties;
  const toggleCalendar = () => setCalendarOpen(!calendarOpen);
  // Opened from further down the list, the calendar (no longer sticky) comes into view under the page header.
  useLayoutEffect(() => {
    const element = strip.current;
    if (!calendarOpen || !element || wide) return;
    const headerHeight = root.current ? parseFloat(getComputedStyle(root.current).getPropertyValue("--bk-top")) * 16 || 0 : 0;
    const offset = element.getBoundingClientRect().top - headerHeight;
    if (offset < 0) window.scrollTo({ top: window.scrollY + offset });
  }, [calendarOpen, wide]);

  // Back from the next step: the chosen time comes into view once, in the list.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || loading || !selectedSlot) return;
    const button = root.current?.querySelector<HTMLElement>('[data-qa="booking-slot"][aria-pressed="true"]');
    if (!button) return;
    restored.current = true;
    // After the page's own effects (a new step starts at the top of the page).
    requestAnimationFrame(() => {
      const list = root.current?.querySelector<HTMLElement>('[data-qa="booking-slot-scroll"]');
      if (wide && list) {
        const top = button.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
        list.scrollTop = Math.max(0, top - list.clientHeight / 2 + button.offsetHeight / 2);
      } else {
        button.scrollIntoView({ block: "center" });
      }
    });
  }, [loading, selectedSlot, wide, slots]);

  useFitProbe(root);

  // Phones keep Continue at the bottom of the screen; wider screens put it in the "Your time" bar.
  const actionAtBottom = Boolean(action && !wide && phone);
  const barDetailText = barDetail ?? [serviceName, duration ? t("bookingPicker.minutes").replace("{0}", String(duration)) : ""].filter(Boolean).join(" · ");
  const yourTime = (variant: "panel" | "strip") => action && (
    <YourTime slot={chosen} timeFormat={timeFormat} timezone={timezone} detail={barDetailText} variant={variant}
      action={actionAtBottom ? undefined : action} />
  );
  const info = <BookingInfo zone={zone} side={wide ? "top" : "bottom"} />;

  return (
    <div ref={root} className="bk-picker" data-qa="booking-picker" data-wide={wide ? "true" : "false"} data-embedded={embedded ? "true" : "false"}
      data-selected={chosen ? "true" : "false"} data-bottom-action={actionAtBottom ? "true" : "false"} style={style}>
      {wide ? (
        <div className="bk-grid">
          <aside className="bk-aside" aria-label={t("bookingLayout.choices")}>
            {summaryNode}
            {extras}
            <div className="bk-card bk-cal-card">
              <Calendar selectedDate={selectedDate} displayMonth={displayMonth} onDateSelect={choose} onMonthChange={onMonthChange}
                availableDays={availableDays} minDate={minDate} maxDate={maxDate} loading={loading} />
            </div>
            <div className="bk-aside-foot" data-qa="booking-picker-footer">
              {info}
              {footer}
            </div>
          </aside>
          <section className="bk-panel bk-card" aria-labelledby={selectedDate ? "bk-day-title" : undefined} data-qa="booking-slot-panel">
            <header className="bk-panel-head">
              {dayHeading || <p className="bk-day-meta"><ZoneLabel zone={zone} timezone={timezone} /></p>}
              <div className="bk-panel-tools">
                <TimeFormatControl value={timeFormat} onChange={onTimeFormatChange} inline />
                {selectedDate && dayNav}
              </div>
            </header>
            {providerChips}
            {yourTime("panel")}
            <div className="bk-scroll" tabIndex={0} aria-label={t("bookingPicker.availableTimes")} data-qa="booking-slot-scroll">
              {slotList}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {summaryNode && <div className="space-y-4">{summaryNode}</div>}
          {extras}
          <div className="grid gap-2.5">
            <TimeFormatControl value={timeFormat} onChange={onTimeFormatChange} />
            <div className="flex items-center justify-between gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <ZoneLabel zone={zone} timezone={timezone} />
              {info}
            </div>
          </div>
          <div ref={strip} className="bk-strip" data-open={calendarOpen ? "true" : "false"} data-qa="booking-strip">
            <StripHeader month={ethiopian ? ethiopianMonthLabel(ethiopianOf(selectedDate ?? new Date()), language)
              : new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedDate ?? displayMonth)}
              open={calendarOpen} onToggle={toggleCalendar}
              onToday={() => pick(new Date())} onTomorrow={() => pick(addDays(today, 1))}
              todayOpen={!loading && selectable(today)} tomorrowOpen={!loading && selectable(addDays(today, 1))} />
            {calendarOpen ? (
              <div className="bk-card mt-1 p-3">
                <Calendar selectedDate={selectedDate} displayMonth={displayMonth} onMonthChange={onMonthChange}
                  onDateSelect={(date) => { choose(date); setCalendarOpen(false); }}
                  availableDays={availableDays} minDate={minDate} maxDate={maxDate} loading={loading} />
              </div>
            ) : (
              <DateStrip selectedDate={selectedDate} onDateSelect={pick} availableDays={availableDays} minDate={minDate} maxDate={maxDate} loading={loading} ethiopian={ethiopian} />
            )}
            {providerChips && !calendarOpen && <div className="mt-2">{providerChips}</div>}
            {!calendarOpen && yourTime("strip")}
          </div>
          <section aria-labelledby={selectedDate ? "bk-day-title" : undefined} data-qa="booking-slot-panel">
            {dayHeading && <div className="pb-1 pt-1">{dayHeading}</div>}
            {slotList}
          </section>
          {footer && <div className="pt-4" data-qa="booking-picker-footer">{footer}</div>}
          {actionAtBottom && <div className="bk-bar-space" aria-hidden="true" />}
        </div>
      )}
      {actionAtBottom && action && chosen && <PhoneContinue slot={chosen} timeFormat={timeFormat} timezone={timezone} action={action} />}
    </div>
  );
}

/**
 * "Any provider": one time per start. The time goes to one of the providers who are free then, in turn
 * by the time of day, so the bookings spread over the team. Taken only when everyone is taken.
 */
function anyProvider(list: TimeSlot[]): TimeSlot[] {
  const byStart = new Map<string, TimeSlot[]>();
  list.forEach((slot) => {
    const row = byStart.get(slot.start_time);
    if (row) row.push(slot); else byStart.set(slot.start_time, [slot]);
  });
  return Array.from(byStart.values(), (row) => {
    const open = row.filter(slotOpen);
    if (!open.length) return row[0];
    return open[Math.floor(Date.parse(row[0].start_time) / 900000) % open.length];
  });
}

/** Whether the picker's own width fits two columns; measured before paint, so there is no flash. */
export function useContainerWide(ref: RefObject<HTMLDivElement | null>, minWidth: number, allowed: boolean) {
  const [wide, setWide] = useState(() => allowed && typeof window !== "undefined" && window.innerWidth >= 1024);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWide(allowed && element.clientWidth >= minWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, minWidth, allowed]);
  return wide;
}

/** Whether a media query matches; read before paint, so the first frame is right. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useLayoutEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}

const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** "No times left today — showing Fri, Oct 16"; with Habesha time the days are Ethiopian dates. */
function noteText(note: OpeningNote, today: Date, ethiopian: boolean, language: string, locale: string, t: (key: string) => string): string {
  const day = (date: Date) => (ethiopian ? formatEthiopianDate(date, language, { weekday: "short", year: false })
    : new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(date));
  return sameDay(note.from, today)
    ? t("bookingLayout.noTimesToday").replace("{0}", day(note.to))
    : t("bookingLayout.noTimesOn").replace("{0}", day(note.from)).replace("{1}", day(note.to));
}
