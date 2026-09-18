/**
 * Modern Calendar Component - Premium Design System
 * Mobile-first, accessible, beautiful with glass-morphism
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { motion } from "framer-motion";
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
  const getDateButtonStyles = (date: Date) => {
    const selectable = isDateSelectable(date);
    const selected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    const inCurrentMonth = isCurrentMonth(date);

    if (selected) {
      return {
        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
        color: 'white',
        border: '1px solid transparent',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      };
    }

    if (!selectable) {
      return {
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
        border: '1px solid var(--border-subtle)',
        opacity: 0.4
      };
    }

    if (isCurrentDay && !selected) {
      return {
        backgroundColor: 'var(--bg-elevated)',
        color: inCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
        border: '2px solid var(--accent-primary)',
      };
    }

    return {
      backgroundColor: 'var(--bg-elevated)',
      color: inCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
      border: '1px solid var(--border-subtle)',
    };
  };

  const getDateButtonClasses = (date: Date) => {
    const selectable = isDateSelectable(date);
    const selected = selectedDate && isSameDay(date, selectedDate);

    return cn(
      // Base styles
      "relative h-12 w-12 md:h-14 md:w-14 rounded-xl font-medium transition-all duration-200",
      "flex items-center justify-center backdrop-blur-sm",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      "focus:ring-offset-transparent",

      // Selectable states
      selectable && !selected && [
        "cursor-pointer",
        "hover:scale-105 active:scale-95",
      ],

      // Selected state
      selected && [
        "shadow-md",
        "scale-105",
        "font-bold",
      ],

      // Non-selectable states
      !selectable && [
        "cursor-not-allowed",
        "hover:scale-100",
      ]
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          disabled={loading}
            className="h-10 w-10 p-0 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        </motion.div>

        <h2 
          className="text-xl font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {getMonthName(displayMonth)} {displayMonth.getFullYear()}
        </h2>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          disabled={loading}
            className="h-10 w-10 p-0 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        </motion.div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="h-10 flex items-center justify-center text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
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
            <motion.button
              key={index}
              role="gridcell"
              data-qa="booking-date"
              onClick={() => handleDateClick(date)}
              disabled={!selectable || loading}
              whileHover={selectable && !selected ? { scale: 1.05 } : {}}
              whileTap={selectable && !selected ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              aria-label={`${date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                weekday: 'long' 
              })}${!selectable ? ' (unavailable)' : ''}`}
              aria-selected={selected}
              aria-current={isCurrentDay ? 'date' : undefined}
              className={getDateButtonClasses(date)}
              style={getDateButtonStyles(date)}
            >
              <span className="relative z-10" style={{ color: selected ? 'white' : undefined }}>
                  {date.getDate()}
                </span>

              {/* Today badge */}
              {isCurrentDay && !selected && (
                <span 
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                />
              )}

              {/* Availability indicator */}
              {selectable && !selected && !isCurrentDay && isCurrentMonth(date) && (
                <span 
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                  style={{ backgroundColor: 'var(--accent-success)' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Quick Jump Actions */}
      <div className="mt-6 flex gap-2 justify-center flex-wrap">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          data-qa="booking-today"
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            onDateSelect(today);
            onMonthChange(today);
          }}
          disabled={loading || !isDateSelectable(today)}
            className="h-9 px-4 text-sm backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}
        >
          Today
        </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          data-qa="booking-tomorrow"
          variant="outline"
          size="sm"
          onClick={() => {
            const tomorrow = addDays(today, 1);
            onDateSelect(tomorrow);
            onMonthChange(tomorrow);
          }}
          disabled={loading || !isDateSelectable(addDays(today, 1))}
            className="h-9 px-4 text-sm backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}
        >
          Tomorrow
        </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const nextWeek = addDays(today, 7);
            onDateSelect(nextWeek);
            onMonthChange(nextWeek);
          }}
          disabled={loading || !isDateSelectable(addDays(today, 7))}
            className="h-9 px-4 text-sm backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}
        >
          Next Week
        </Button>
        </motion.div>
      </div>

      {/* Legend */}
      <div 
        className="mt-6 pt-6 space-y-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded-full border-2"
              style={{ borderColor: 'var(--accent-primary)' }}
            />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--accent-success)' }}
            />
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
