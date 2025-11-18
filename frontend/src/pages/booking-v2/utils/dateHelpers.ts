/**
 * Date manipulation utilities for booking system
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

/**
 * Get the start of day (00:00:00)
 */
export const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Get the end of day (23:59:59)
 */
export const endOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

/**
 * Get days in a month
 */
export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Get the first day of month
 */
export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Get the last day of month
 */
export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Get all dates in a month
 */
export const getDatesInMonth = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const dates: Date[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  
  return dates;
};

/**
 * Get calendar grid dates (including previous/next month padding)
 */
export const getCalendarDates = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  // Get the first day of the week for the month
  const startDayOfWeek = start.getDay();
  
  // Calculate dates to show from previous month
  const prevMonthDates: Date[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    prevMonthDates.push(addDays(start, -i - 1));
  }
  
  // Get all dates in current month
  const currentMonthDates = getDatesInMonth(date);
  
  // Calculate dates to show from next month
  const totalCells = 42; // 6 rows × 7 days
  const remainingCells = totalCells - prevMonthDates.length - currentMonthDates.length;
  const nextMonthDates: Date[] = [];
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDates.push(addDays(end, i));
  }
  
  return [...prevMonthDates, ...currentMonthDates, ...nextMonthDates];
};

/**
 * Format date for display
 */
export const formatDate = (date: Date, format: 'short' | 'long' | 'full' = 'short'): string => {
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'short', day: 'numeric' },
    long: { weekday: 'short', month: 'short', day: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  }[format];
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Format time for display
 */
export const formatTime = (
  date: Date,
  format: '12h' | '24h',
  timezone?: string
): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
    ...(timezone && { timeZone: timezone }),
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Get day of week name
 */
export const getDayName = (date: Date, format: 'short' | 'long' = 'short'): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: format === 'short' ? 'short' : 'long',
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Get month name
 */
export const getMonthName = (date: Date, format: 'short' | 'long' = 'long'): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: format === 'short' ? 'short' : 'long',
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Check if date is within range
 */
export const isWithinRange = (date: Date, range: DateRange): boolean => {
  const compareDate = startOfDay(date);
  const rangeStart = startOfDay(range.start);
  const rangeEnd = startOfDay(range.end);
  
  return compareDate >= rangeStart && compareDate <= rangeEnd;
};

/**
 * Get quick date shortcuts
 */
export const getQuickDates = () => {
  const today = new Date();
  return {
    today: startOfDay(today),
    tomorrow: startOfDay(addDays(today, 1)),
    nextWeek: startOfDay(addDays(today, 7)),
    nextMonth: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()),
  };
};

/**
 * Group time slots by time of day
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export const getTimeOfDay = (date: Date): TimeOfDay => {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export const getTimeOfDayLabel = (timeOfDay: TimeOfDay): string => {
  const labels = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
  };
  return labels[timeOfDay];
};

export const getTimeOfDayRange = (timeOfDay: TimeOfDay): string => {
  const ranges = {
    morning: '6:00 AM - 11:59 AM',
    afternoon: '12:00 PM - 4:59 PM',
    evening: '5:00 PM - 9:00 PM',
  };
  return ranges[timeOfDay];
};

