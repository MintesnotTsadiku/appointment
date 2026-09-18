/**
 * Modern Time Slots Panel - Premium Design System
 * Mobile-first, scannable, beautiful with glass-morphism
 */

import { Clock, Star, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { motion } from "framer-motion";
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
  location,
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
  const getSlotButtonStyles = (slot: TimeSlot) => {
    const selected = isSelected(slot);
    const past = Boolean(slot.isPast);
    const booked = Boolean(slot.booked);
    const available = slot.available !== false;
    const disabled = past || booked || !available;

    if (selected) {
      return {
        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
        color: 'white',
        border: '1px solid transparent',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      };
    }

    if (disabled) {
      return {
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        opacity: 0.4
      };
    }

    return {
      backgroundColor: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
    };
  };

  const getSlotButtonClasses = (slot: TimeSlot) => {
    const selected = isSelected(slot);
    const past = Boolean(slot.isPast);
    const booked = Boolean(slot.booked);
    const available = slot.available !== false;
    const disabled = past || booked || !available;

    return cn(
      // Base styles
      "relative w-full h-14 md:h-16 rounded-xl font-medium transition-all duration-200",
      "flex items-center justify-between px-4 md:px-5",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 backdrop-blur-sm",
      "focus:ring-offset-transparent",
      "group",

      // Selectable states
      !disabled && !selected && [
        "cursor-pointer",
        "hover:scale-[1.02] active:scale-[0.98]",
      ],

      // Selected state
      selected && [
        "shadow-lg scale-[1.02]",
      ],

      // Non-selectable states
      disabled && [
        "cursor-not-allowed",
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
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Available Times
          </h3>
          <p 
            className="text-sm mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {slots.length} slot{slots.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <div 
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Clock className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span>{timezone.split("/")[1]?.replace("_", " ")}</span>
        </div>
      </div>

      {/* Location Info */}
      {location && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-3 p-3 rounded-lg backdrop-blur-sm"
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div 
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
              opacity: 0.2
            }}
          >
            <MapPin className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {location.is_online ? (
                <span className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--accent-success)' }}
                  />
                  Online Meeting
                </span>
              ) : (
                location.location_name
              )}
            </p>
            {location.address && !location.is_online && (
              <p 
                className="text-xs mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {location.address}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Grouped Time Slots */}
      <div className="space-y-6">
        {groupedSlots.map((group, groupIndex) => {
          if (group.slots.length === 0) return null;

          return (
            <motion.div
              key={group.timeOfDay}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
              className="space-y-3"
            >
              {/* Group Header */}
              <div className="flex items-baseline justify-between">
                <h4 
                  className="text-base font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {group.label}
                </h4>
                <span 
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {group.range}
                </span>
              </div>

              {/* Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {group.slots.map((slot, slotIndex) => {
                  const past = Boolean(slot.isPast);
                  const booked = Boolean(slot.booked);
                  const available = slot.available !== false;
                  const disabled = past || booked || !available;
                  const selected = isSelected(slot);

                  return (
                  <motion.button
                    key={slot.id}
                    data-qa="booking-slot"
                    onClick={() => !disabled && onSlotSelect(slot)}
                    disabled={disabled}
                    whileHover={!disabled && !selected ? { scale: 1.02 } : {}}
                    whileTap={!disabled && !selected ? { scale: 0.98 } : {}}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (groupIndex * 0.1) + (slotIndex * 0.05) }}
                    aria-label={`Time slot ${formatSlotTime(slot.start_time)}${
                      slot.provider ? ` with ${slot.provider.name}` : ""
                    }${slot.recommended ? " (Recommended)" : ""}${
                      slot.isPast ? " (Past)" : ""
                    }${slot.booked ? " (Booked)" : ""}`}
                    className={getSlotButtonClasses(slot)}
                    style={getSlotButtonStyles(slot)}
                  >
                    {/* Time Display */}
                    <div className="flex flex-col items-start gap-1">
                      <span 
                        className="text-base md:text-lg font-semibold"
                        style={{ color: selected ? 'white' : 'var(--text-primary)' }}
                      >
                        {formatSlotTime(slot.start_time)}
                      </span>
                      {slot.provider && (
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: selected ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)' }}
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
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm"
                          style={selected ? {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white'
                          } : {
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--border-default)'
                          }}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          <span>Best</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                  );
                })}
              </div>
            </motion.div>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-64 flex flex-col items-center justify-center text-center space-y-4 p-6"
    >
      <div 
        className="h-16 w-16 rounded-full flex items-center justify-center backdrop-blur-sm"
        style={{ 
          background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
          opacity: 0.2
        }}
      >
        <Clock className="h-8 w-8" style={{ color: 'var(--accent-primary)' }} />
      </div>
      <div className="space-y-2">
        <h3 
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          No available time slots
        </h3>
        <p 
          className="text-sm max-w-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          There are no available appointments for{" "}
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try:</p>
        <div className="flex gap-2 text-sm">
          <span style={{ color: 'var(--accent-primary)' }}>• Select another date</span>
          <span style={{ color: 'var(--accent-primary)' }}>• View next available</span>
        </div>
      </div>
    </motion.div>
  );
}
