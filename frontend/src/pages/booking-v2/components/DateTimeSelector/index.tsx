/**
 * The booking time picker shared by organization booking, independent providers and rescheduling.
 *
 * Wide container: a sticky side column (summary, calendar, time format, time zone, provider filter) and a
 * slot panel as high as the viewport whose list scrolls inside it. Narrow container: the summary, a sticky
 * strip of days (the month calendar opens in its place), then the slot list. Once a slot is chosen, a bar fixed
 * to the bottom shows it with the next step. See docs/growth/BOOKING_LAYOUT.md.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Clock3, MapPin, User, Video } from "lucide-react";
import { useOnlineLabel } from "@/components/online-session/JoinSession";
import { BookingState, previewState } from "@/components/booking-states";
import { zoneLabel } from "@/lib/time";
import { intlLocale, useTranslation } from "@/lib/i18n";
import { addDays, startOfDay } from "../../utils/dateHelpers";
import { CalendarPanel, isSelectableDay } from "./CalendarPanel";
import { TimeSlotsPanel, shortProviderName, slotOpen } from "./TimeSlotsPanel";
import { BookingSummaryCard, DateStrip, SelectionBar, StripHeader, TimeFormatControl, TimeZoneNotes, type SummaryFact } from "./parts";
import type { TimeSlot } from "../../types";
import "./layout.css";

export { BookingSummaryCard, type SummaryFact } from "./parts";

/** The next step once a slot is chosen: shown in the bottom bar. */
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
  /** Replaces the default summary card (service, duration, provider, place). */
  summary?: ReactNode;
  /** More controls for the side column, such as the quantity picker. */
  extras?: ReactNode;
  /** The next step. Without it, choosing a slot calls `onSlotSelect` only (older pages move on there). */
  action?: PickerAction;
  /** A short second line for the bottom bar, such as the service and its length. */
  barDetail?: string;
  /** Quiet links (my bookings, powered by): at the foot of the side column when wide, under the list when narrow. */
  footer?: ReactNode;

  /** @deprecated The page header owns navigation. */
  onBack?: () => void;
  /** Inside another page (manage booking): no sticky columns, no page heading. */
  embedded?: boolean;
  /** Older pages pass raw API data; the picker does not read it. */
  rawApiData?: unknown;
  bookingConfig?: unknown;
}

const WIDE_AT = 900;
const NO_SLOTS: TimeSlot[] = [];
const MAX_VISIBLE_PROVIDERS = 6;

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
  embedded = false,
}: DateTimeSelectorProps) {
  const { t, language } = useTranslation();
  const onlineLabel = useOnlineLabel();
  // Development only: `?preview-state=empty` shows a day without open times.
  const availableSlots = previewState() === "empty" ? NO_SLOTS : givenSlots;
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const wide = useContainerWide(root, WIDE_AT, !embedded);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [stripHeight, setStripHeight] = useState(0);

  // Providers present on this day, for the filter.
  const providers = useMemo(() => {
    const map = new Map<string, string>();
    availableSlots.forEach((slot) => { if (slot.provider?.id && slot.provider.name) map.set(slot.provider.id, slot.provider.name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [availableSlots]);
  const [providerId, setProviderId] = useState("all");
  const [showAllProviders, setShowAllProviders] = useState(false);
  useEffect(() => {
    if (providerId !== "all" && !providers.some((provider) => provider.id === providerId)) setProviderId("all");
  }, [providers, providerId]);
  const slots = useMemo(
    () => (providerId === "all" ? availableSlots : availableSlots.filter((slot) => slot.provider?.id === providerId)),
    [availableSlots, providerId]
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
  const pick = (date: Date) => {
    onDateSelect(date);
    if (date.getMonth() !== displayMonth.getMonth() || date.getFullYear() !== displayMonth.getFullYear()) onMonthChange(date);
  };
  const nextDay = selectedDate ? nextOpenDay(selectedDate) : null;
  const previousDay = selectedDate ? nextOpenDay(selectedDate, -1) : null;
  const firstOpen = selectable(today) ? today : nextOpenDay(today);

  const locale = intlLocale(language);
  const zone = zoneLabel(timezone, language, t("customerBooking.zoneTime"), (city) => {
    const key = `timeZoneCities.${city}`;
    const name = t(key);
    return name === key ? null : name;
  });
  const dayTitle = selectedDate ? new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(selectedDate) : "";
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
  const summaryNode = summary !== undefined ? summary
    : embedded || !serviceName ? null
    : <BookingSummaryCard title={serviceName} titleQa="booking-picker-service" facts={facts} compact={!wide} />;

  const providerFilter = providers.length > 1 && (
    <div className="space-y-2" data-qa="booking-provider-filter">
      <p className="bk-eyebrow" id="bk-provider-label">{t("bookingPicker.filterProvider")}</p>
      <div role="group" aria-labelledby="bk-provider-label" className={wide ? "flex flex-wrap gap-1.5" : "bk-days"}>
        <button type="button" className="bk-chip" aria-pressed={providerId === "all"} onClick={() => setProviderId("all")}>{t("bookingPicker.allProviders")}</button>
        {(wide && !showAllProviders ? providers.slice(0, MAX_VISIBLE_PROVIDERS) : providers).map((provider) => (
          <button key={provider.id} type="button" className="bk-chip" aria-pressed={providerId === provider.id} onClick={() => setProviderId(provider.id)}
            title={provider.name}>
            {shortProviderName(provider.name)}
          </button>
        ))}
        {wide && providers.length > MAX_VISIBLE_PROVIDERS && (
          <button type="button" className="bk-link px-2" onClick={() => setShowAllProviders(!showAllProviders)}>
            {showAllProviders ? t("bookingPicker.showFewer") : t("bookingPicker.showAll")}
          </button>
        )}
      </div>
    </div>
  );

  const slotList = selectedDate ? (
    <TimeSlotsPanel date={selectedDate} slots={slots} selectedSlot={selectedSlot} onSlotSelect={onSlotSelect}
      timeFormat={timeFormat} timezone={timezone} loading={loading} onNextDay={nextDay ? () => pick(nextDay) : undefined} />
  ) : (
    <BookingState kind="empty" compact headingLevel={3} qa="booking-pick-date" title={t("bookingPicker.pickDate")} description={t("bookingPicker.pickDateHint")}
      actions={firstOpen ? [{ label: t("bookingLayout.firstOpenDay"), onClick: () => pick(firstOpen), qa: "booking-first-day" }] : []} />
  );

  const dayHeading = selectedDate && (
    <div className="min-w-0">
      <h2 id="bk-day-title" className="truncate text-lg font-semibold sm:text-xl" style={{ color: "var(--text-primary)" }} data-qa="booking-day-title">{dayTitle}</h2>
      {!loading && availableSlots.length > 0 && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {openCount === 0 ? t("bookingPicker.noSlots") : openCount === 1 ? t("bookingPicker.oneSlot") : t("bookingPicker.slotsAvailable").replace("{0}", String(openCount))}
        </p>
      )}
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

  return (
    <div ref={root} className="bk-picker" data-qa="booking-picker" data-wide={wide ? "true" : "false"} data-embedded={embedded ? "true" : "false"}
      data-selected={chosen ? "true" : "false"} style={style}>
      {wide ? (
        <div className="bk-grid">
          <aside className="bk-aside" aria-label={t("bookingLayout.choices")}>
            {summaryNode}
            {extras}
            <div className="bk-card p-4">
              <CalendarPanel selectedDate={selectedDate} displayMonth={displayMonth} onDateSelect={onDateSelect} onMonthChange={onMonthChange}
                availableDays={availableDays} minDate={minDate} maxDate={maxDate} loading={loading} />
              <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                <TimeFormatControl value={timeFormat} onChange={onTimeFormatChange} />
                <TimeZoneNotes zone={zone} timezone={timezone} />
              </div>
            </div>
            {providerFilter && <div className="bk-card p-4">{providerFilter}</div>}
            {footer && <div className="px-1 pb-1" data-qa="booking-picker-footer">{footer}</div>}
          </aside>
          <section className="bk-panel bk-card" aria-labelledby={selectedDate ? "bk-day-title" : undefined} data-qa="booking-slot-panel">
            {selectedDate && (
              <header className="bk-panel-head">
                {dayHeading}
                <div className="flex gap-1.5">
                  <button type="button" className="bk-icon-btn" disabled={!previousDay || loading} onClick={() => previousDay && pick(previousDay)}
                    aria-label={t("bookingLayout.previousDay")} data-qa="booking-previous-day"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" className="bk-icon-btn" disabled={!nextDay || loading} onClick={() => nextDay && pick(nextDay)}
                    aria-label={t("bookingLayout.nextDay")}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </header>
            )}
            <div className="bk-scroll" tabIndex={0} aria-label={t("bookingPicker.availableTimes")} data-qa="booking-slot-scroll"
              style={chosen ? { paddingBottom: "1.5rem" } : undefined}>
              {slotList}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {summaryNode && <div className="space-y-4">{summaryNode}</div>}
          {extras}
          <div className="grid gap-3">
            <TimeFormatControl value={timeFormat} onChange={onTimeFormatChange} />
            <TimeZoneNotes zone={zone} timezone={timezone} />
          </div>
          <div ref={strip} className="bk-strip" data-open={calendarOpen ? "true" : "false"} data-qa="booking-strip">
            <StripHeader month={new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedDate ?? displayMonth)}
              open={calendarOpen} onToggle={toggleCalendar}
              onToday={() => pick(new Date())} onTomorrow={() => pick(addDays(today, 1))}
              todayOpen={!loading && selectable(today)} tomorrowOpen={!loading && selectable(addDays(today, 1))} />
            {calendarOpen ? (
              <div className="bk-card mt-1 p-3">
                <CalendarPanel selectedDate={selectedDate} displayMonth={displayMonth} onMonthChange={onMonthChange}
                  onDateSelect={(date) => { onDateSelect(date); setCalendarOpen(false); }}
                  availableDays={availableDays} minDate={minDate} maxDate={maxDate} loading={loading} />
              </div>
            ) : (
              <DateStrip selectedDate={selectedDate} onDateSelect={pick} availableDays={availableDays} minDate={minDate} maxDate={maxDate} loading={loading} />
            )}
            {providerFilter && !calendarOpen && <div className="mt-2">{providerFilter}</div>}
          </div>
          <section aria-labelledby={selectedDate ? "bk-day-title" : undefined} data-qa="booking-slot-panel">
            {dayHeading && <div className="pb-1 pt-1">{dayHeading}</div>}
            {slotList}
          </section>
          {footer && <div className="pt-4" data-qa="booking-picker-footer">{footer}</div>}
          <div className="bk-bar-space" aria-hidden="true" />
        </div>
      )}
      {action && chosen && (
        <SelectionBar slot={chosen} timeFormat={timeFormat} timezone={timezone} action={action}
          detail={barDetail ?? [serviceName, duration ? t("bookingPicker.minutes").replace("{0}", String(duration)) : ""].filter(Boolean).join(" · ")} />
      )}
    </div>
  );
}

/** Whether the picker's own width fits two columns; measured before paint, so there is no flash. */
function useContainerWide(ref: RefObject<HTMLDivElement | null>, minWidth: number, allowed: boolean) {
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
