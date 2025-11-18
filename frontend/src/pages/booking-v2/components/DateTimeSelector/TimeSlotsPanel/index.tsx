/**
 * Modern Time Slots Panel - Grouped by time of day
 * Mobile-first, scannable, beautiful
 */

import { Clock, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import {
  getTimeOfDay,
  getTimeOfDayLabel,
  getTimeOfDayRange,
  formatTime,
} from "../../../utils/dateHelpers";
import { formatEthiopianTime } from "../../../utils/ethiopianTime";
import type { TimeSlotsProps, TimeSlot, TimeSlotGroup } from "../../../types";

export function TimeSlotsPanel({
  date,
  slots,
  selectedSlot,
  onSlotSelect,
  timeFormat,
  timezone,
  loading = false,
  groupByTimeOfDay = true,
  className,
}: TimeSlotsProps) {
  // Group slots by time of day
  const groupedSlots: TimeSlotGroup[] = groupByTimeOfDay
    ? groupSlotsByTimeOfDay(slots)
    : [
        {
          timeOfDay: "morning",
          label: "All Slots",
          range: "",
          slots,
        },
      ];

  // Format time based on user preference
  const formatSlotTime = (timeString: string): string => {
    const date = new Date(timeString);

    switch (timeFormat) {
      case "ethiopian":
        return formatEthiopianTime(date);
      case "24h":
        return formatTime(date, "24h", timezone);
      case "12h":
      default:
        return formatTime(date, "12h", timezone);
    }
  };

  // Check if slot is selected
  const isSelected = (slot: TimeSlot): boolean => {
    return selectedSlot?.id === slot.id;
  };

  // Get slot button styling
  const getSlotButtonClasses = (slot: TimeSlot) => {
    const selected = isSelected(slot);
    const past = slot.isPast;

    return cn(
      // Base styles
      "relative w-full h-14 md:h-16 rounded-xl font-medium transition-all duration-200",
      "flex items-center justify-between px-4 md:px-5",
      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
      "group",

      // Default state
      "border-2 border-gray-200 dark:border-gray-700",
      "bg-white dark:bg-gray-800",
      "text-gray-900 dark:text-gray-100",

      // Hover state
      !past &&
        !selected && [
          "hover:border-primary-400 dark:hover:border-primary-500",
          "hover:bg-primary-50 dark:hover:bg-primary-900/20",
          "hover:shadow-md",
          "hover:scale-[1.02]",
          "active:scale-[0.98]",
        ],

      // Selected state
      selected && [
        "border-primary-500 dark:border-primary-400",
        "bg-primary-500 dark:bg-primary-600",
        "text-white dark:text-white",
        "shadow-lg",
        "scale-[1.02]",
      ],

      // Past/disabled state
      past && [
        "opacity-40",
        "cursor-not-allowed",
        "hover:border-gray-200 dark:hover:border-gray-700",
        "hover:bg-white dark:hover:bg-gray-800",
        "hover:shadow-none",
        "hover:scale-100",
      ]
    );
  };

  if (loading) {
    return <TimeSlotsLoading />;
  }

  if (slots.length === 0) {
    return <EmptySlots date={date} />;
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Available Times
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {slots.length} slot{slots.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Clock className="h-4 w-4" />
          <span>{timezone.split("/")[1]?.replace("_", " ")}</span>
        </div>
      </div>

      {/* Grouped Time Slots */}
      <div className="space-y-6">
        {groupedSlots.map((group) => {
          if (group.slots.length === 0) return null;

          return (
            <div key={group.timeOfDay} className="space-y-3">
              {/* Group Header */}
              <div className="flex items-baseline justify-between">
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {group.label}
                </h4>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {group.range}
                </span>
              </div>

              {/* Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {group.slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => !slot.isPast && onSlotSelect(slot)}
                    disabled={slot.isPast || !slot.available}
                    aria-label={`Time slot ${formatSlotTime(slot.start_time)}${
                      slot.provider ? ` with ${slot.provider.name}` : ""
                    }${slot.recommended ? " (Recommended)" : ""}${
                      slot.isPast ? " (Past)" : ""
                    }`}
                    className={getSlotButtonClasses(slot)}
                  >
                    {/* Time Display */}
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-base md:text-lg font-semibold">
                        {formatSlotTime(slot.start_time)}
                      </span>
                      {slot.provider && (
                        <span
                          className={cn(
                            "text-xs flex items-center gap-1",
                            isSelected(slot)
                              ? "text-white/90 dark:text-white/90"
                              : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          <User className="h-3 w-3" />
                          {slot.provider.name}
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {slot.recommended && (
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                            isSelected(slot)
                              ? "bg-white/20 text-white"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          <span>Best</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to group slots by time of day
function groupSlotsByTimeOfDay(slots: TimeSlot[]): TimeSlotGroup[] {
  const groups: Record<string, TimeSlot[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  slots.forEach((slot) => {
    const timeOfDay = getTimeOfDay(new Date(slot.start_time));
    groups[timeOfDay].push(slot);
  });

  return [
    {
      timeOfDay: "morning",
      label: getTimeOfDayLabel("morning"),
      range: getTimeOfDayRange("morning"),
      slots: groups.morning,
    },
    {
      timeOfDay: "afternoon",
      label: getTimeOfDayLabel("afternoon"),
      range: getTimeOfDayRange("afternoon"),
      slots: groups.afternoon,
    },
    {
      timeOfDay: "evening",
      label: getTimeOfDayLabel("evening"),
      range: getTimeOfDayRange("evening"),
      slots: groups.evening,
    },
  ];
}

// Loading skeleton component
function TimeSlotsLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-3">
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
                style={{ animationDelay: `${slot * 100}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state component
function EmptySlots({ date }: { date: Date }) {
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center text-center space-y-4 p-6">
      <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Clock className="h-8 w-8 text-gray-500 dark:text-gray-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No available time slots
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 max-w-xs">
          There are no available appointments for{" "}
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <p className="text-xs text-gray-600 dark:text-gray-400">Try:</p>
        <div className="flex gap-2 text-sm">
          <span className="text-primary-600 dark:text-primary-400">• Select another date</span>
          <span className="text-primary-600 dark:text-primary-400">• View next available</span>
        </div>
      </div>
    </div>
  );
}

