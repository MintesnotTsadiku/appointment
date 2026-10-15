/**
 * The slot list of one day, grouped into morning, afternoon and evening (with Habesha time: the Habesha
 * periods of the labels, see `groups.ts`).
 * Group headings stick to the top of the scrolling list. Each slot is a toggle button;
 * choosing one does not leave the page, the bottom bar shows it with the next step.
 */

import { ArrowRight, Star } from "lucide-react";
import { formatInstant } from "@/lib/time";
import { intlLocale, useTranslation } from "@/lib/i18n";
import { BookingState, SlotListSkeleton } from "@/components/booking-states";
import type { TimeFormat, TimeSlot } from "../../../types";
import { groupSlots } from "./groups";

/** The person's name from a provider label such as "Selam Movement Practice — Selam Bekele". */
export function shortProviderName(name?: string | null): string {
  const value = (name || "").trim();
  const parts = value.split(/\s+[—–]\s+/);
  return parts[parts.length - 1] || value;
}

/** Whether a slot is the chosen one. Pages that rebuild the chosen slot keep its start and provider. */
export function isSameSlot(chosen: TimeSlot | null, slot: TimeSlot): boolean {
  if (!chosen) return false;
  if (chosen.id === slot.id) return true;
  if (chosen.start_time !== slot.start_time) return false;
  return !chosen.provider?.id || chosen.provider.id === slot.provider?.id;
}

export const slotOpen = (slot: TimeSlot) => !slot.isPast && !slot.booked && slot.available !== false;

interface TimeSlotsPanelProps {
  date: Date;
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  timeFormat: TimeFormat;
  timezone: string;
  loading?: boolean;
  /** The next open day, for the empty state's action. */
  onNextDay?: () => void;
}

export function TimeSlotsPanel({ date, slots, selectedSlot, onSlotSelect, timeFormat, timezone, loading = false, onNextDay }: TimeSlotsPanelProps) {
  const { t, language } = useTranslation();

  if (loading) return <SlotListSkeleton />;

  const openCount = slots.filter(slotOpen).length;
  if (slots.length === 0) {
    const day = date.toLocaleDateString(intlLocale(language), { weekday: "long", month: "long", day: "numeric" });
    return (
      <BookingState kind="empty" compact headingLevel={3} qa="booking-slots-empty"
        title={t("bookingPicker.noSlots")}
        description={t("bookingPicker.noSlotsFor").replace("{0}", day)}
        actions={onNextDay ? [{ label: t("bookingLayout.nextOpenDay"), onClick: onNextDay, icon: ArrowRight, qa: "booking-next-day" }] : []} />
    );
  }

  const groups = groupSlots(slots, timeFormat, timezone);
  const formatSlot = (slot: TimeSlot) => formatInstant(slot.start_time, timeFormat, timezone, { language });

  return (
    <div className="w-full" data-qa="booking-slots" data-qa-open={openCount}>
      {groups.map((group) => {
        const open = group.slots.filter(slotOpen).length;
        const headingId = `bk-group-${group.key}`;
        return (
          <section key={group.key} aria-labelledby={headingId}>
            <h3 id={headingId} className="bk-group-head" data-qa="booking-slot-group" data-group={group.key}>
              <span>{t(`bookingPicker.${group.key}`)}</span>
              <span className="font-medium normal-case tracking-normal" style={{ color: "var(--text-muted)" }}>
                {open === 1 ? t("bookingPicker.oneSlot") : t("bookingPicker.slotsAvailable").replace("{0}", String(open))}
              </span>
            </h3>
            <div className="bk-slot-grid pb-4">
              {group.slots.map((slot) => {
                const disabled = !slotOpen(slot);
                const chosen = isSameSlot(selectedSlot, slot);
                const who = slot.provider?.name ? shortProviderName(slot.provider.name) : "";
                const time = formatSlot(slot);
                const state = slot.booked ? t("bookingLayout.taken") : disabled ? t("bookingLayout.unavailable") : "";
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className="bk-slot"
                    data-qa="booking-slot"
                    data-qa-start={slot.start_time}
                    disabled={disabled}
                    aria-pressed={chosen}
                    aria-label={[
                      t("bookingPicker.slotLabel").replace("{0}", time),
                      who && t("bookingPicker.with").replace("{0}", who),
                      slot.recommended && t("bookingLayout.bestFit"),
                      state,
                    ].filter(Boolean).join(" · ")}
                    onClick={() => !disabled && onSlotSelect(slot)}
                  >
                    <span className="bk-slot-time">{time}</span>
                    {who && <span className="bk-slot-who">{who}</span>}
                    {slot.recommended && !disabled && (
                      <span className="bk-slot-best" aria-hidden="true"><Star className="h-2.5 w-2.5 fill-current" />{t("bookingPicker.best")}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
