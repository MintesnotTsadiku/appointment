/**
 * Modern Calendar Component - Redesigned from first principles
 * Mobile-first, accessible, beautiful
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import {
  getDayName,
  getMonthName,
  getCalendarDates,
  isToday,
  isSameDay,
  isPast,
  startOfDay,
  addDays,
} from "../../../utils/dateHelpers";
import type { CalendarProps } from "../../../types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPanel({
  selectedDate,
  displayMonth,
  onDateSelect,
  onMonthChange,
  availableDays = [0, 1, 2, 3, 4, 5, 6], // All days available by default
  minDate,
  maxDate,
  loading = false,
  className,
}: CalendarProps) {
  const calendarDates = getCalendarDates(displayMonth);
  const today = startOfDay(new Date());
  const effectiveMinDate = minDate && minDate > today ? minDate : today;

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(displayMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(displayMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onMonthChange(nextMonth);
  };

  // Check if a date is selectable
  const isDateSelectable = (date: Date): boolean => {
    if (loading) return false;

    const dateTime = startOfDay(date).getTime();
    const minDateTime = effectiveMinDate.getTime();
    const maxDateTime = maxDate ? startOfDay(maxDate).getTime() : Infinity;

    // Check if date is in valid range
    if (dateTime < minDateTime || dateTime > maxDateTime) return false;

    // Check if day of week is available
    if (!availableDays.includes(date.getDay())) return false;

    return true;
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === displayMonth.getMonth();
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;
    onDateSelect(date);
  };

  // Get date button styling
  const getDateButtonClasses = (date: Date) => {
    const selectable = isDateSelectable(date);
    const selected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    const inCurrentMonth = isCurrentMonth(date);

    // Debug logging for selected date
    if (selected) {
      console.log('Selected date styling:', {
        date: date.getDate(),
        selected,
        isCurrentDay,
        inCurrentMonth,
        selectable
      });
    }

    return cn(
      // Base styles
      "relative h-12 w-12 md:h-14 md:w-14 rounded-xl font-medium transition-all duration-200",
      "flex items-center justify-center",
      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",

      // Current month vs other months (only when not selected)
      !selected && inCurrentMonth && "text-gray-900 dark:text-gray-100",
      !selected && !inCurrentMonth && "text-gray-400 dark:text-gray-600",

      // Selectable states
      selectable && [
        "cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20",
        "hover:scale-105 active:scale-95",
      ],

      // Selected state
      selected && [
        "bg-primary-500 dark:bg-primary-600",
        "!text-white dark:!text-white",
        "hover:!bg-primary-600 dark:hover:!bg-primary-700",
        "hover:!text-white dark:hover:!text-white",
        "shadow-md",
        "scale-105",
        "font-bold",
      ],

      // Today indicator (when not selected)
      isCurrentDay && !selected && [
        "ring-2 ring-primary-500 dark:ring-primary-400",
        "font-bold",
      ],

      // Non-selectable states
      !selectable && [
        "cursor-not-allowed opacity-40",
        "hover:bg-transparent hover:scale-100",
      ]
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          disabled={loading}
          className="h-10 w-10 p-0 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {getMonthName(displayMonth)} {displayMonth.getFullYear()}
        </h2>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          disabled={loading}
          className="h-10 w-10 p-0 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="h-10 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        role="grid"
        aria-label={`Calendar for ${getMonthName(displayMonth)} ${displayMonth.getFullYear()}`}
        className="grid grid-cols-7 gap-1"
      >
        {calendarDates.map((date, index) => {
          const selectable = isDateSelectable(date);
          const selected = selectedDate && isSameDay(date, selectedDate);
          const isCurrentDay = isToday(date);

          return (
            <button
              key={index}
              role="gridcell"
              onClick={() => handleDateClick(date)}
              disabled={!selectable || loading}
              aria-label={`${date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                weekday: 'long' 
              })}${!selectable ? ' (unavailable)' : ''}`}
              aria-selected={selected}
              aria-current={isCurrentDay ? 'date' : undefined}
              className={getDateButtonClasses(date)}
              style={selected ? { 
                backgroundColor: 'var(--primary-color, #3b82f6)',
                color: '#ffffff'
              } : undefined}
            >
              {selected ? (
                <span 
                  className="relative z-10 font-bold !text-white"
                  style={{ 
                    color: '#ffffff',
                    WebkitTextFillColor: '#ffffff',
                    textShadow: 'none'
                  }}
                  ref={(el) => {
                    if (el) {
                      const computed = window.getComputedStyle(el);
                      const parent = el.parentElement;
                      const parentComputed = parent ? window.getComputedStyle(parent) : null;
                      
                      console.log('🔍 Selected span DEBUG:', {
                        // Text color
                        color: computed.color,
                        webkitTextFillColor: computed.webkitTextFillColor,
                        // Other properties that might hide text
                        opacity: computed.opacity,
                        visibility: computed.visibility,
                        display: computed.display,
                        fontSize: computed.fontSize,
                        zIndex: computed.zIndex,
                        // Background (might be covering text)
                        backgroundColor: computed.backgroundColor,
                        // Parent button background
                        parentBackground: parentComputed?.backgroundColor,
                        // Position
                        position: computed.position,
                        transform: computed.transform
                      });
                      
                      console.log('📝 Actual element:', el);
                      console.log('🎨 Parent button:', parent);
                    }
                  }}
                >
                  {date.getDate()}
                </span>
              ) : (
                <span className="relative z-10">
                  {date.getDate()}
                </span>
              )}

              {/* Today badge */}
              {isCurrentDay && !selected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary-500 dark:bg-primary-400" />
              )}

              {/* Availability indicator */}
              {selectable && !selected && !isCurrentDay && isCurrentMonth(date) && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Jump Actions */}
      <div className="mt-6 flex gap-2 justify-center flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            onDateSelect(today);
            onMonthChange(today);
          }}
          disabled={loading || !isDateSelectable(today)}
          className="h-9 px-4 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const tomorrow = addDays(today, 1);
            onDateSelect(tomorrow);
            onMonthChange(tomorrow);
          }}
          disabled={loading || !isDateSelectable(addDays(today, 1))}
          className="h-9 px-4 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700"
        >
          Tomorrow
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const nextWeek = addDays(today, 7);
            onDateSelect(nextWeek);
            onMonthChange(nextWeek);
          }}
          disabled={loading || !isDateSelectable(addDays(today, 7))}
          className="h-9 px-4 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700"
        >
          Next Week
        </Button>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-primary-500 dark:border-primary-400" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

