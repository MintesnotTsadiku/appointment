import { useState, useEffect } from 'react';
import { Input } from '@/components/input';
import { formatEthiopianTime } from '@/pages/booking-v2/utils/ethiopianTime';
import type { TimeFormat } from '@/pages/booking-v2/types';

export type { TimeFormat };

interface TimeInputProps {
  value: string; // Always in 24-hour format (HH:MM) for storage
  onChange: (value: string) => void; // Returns 24-hour format (HH:MM)
  timeFormat: TimeFormat;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Convert 24-hour format (HH:MM) to 12-hour format (HH:MM AM/PM)
 */
const to12Hour = (time24: string): string => {
  if (!time24 || time24 === '') return '';
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '';
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Convert 12-hour format (HH:MM AM/PM) to 24-hour format (HH:MM)
 */
const from12Hour = (time12: string): string => {
  if (!time12 || time12 === '') return '';
  
  // Remove extra spaces and parse
  const cleaned = time12.trim().toUpperCase();
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  
  if (!match) return '';
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert 24-hour format (HH:MM) to Ethiopian format
 */
const toEthiopian = (time24: string): string => {
  if (!time24 || time24 === '') return '';
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '';
  
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatEthiopianTime(date);
};

/**
 * Convert Ethiopian format to 24-hour format (HH:MM)
 * Ethiopian time: 6 AM standard = 12:00 Ethiopian
 */
const fromEthiopian = (timeEth: string): string => {
  if (!timeEth || timeEth === '') return '';
  
  // Parse Ethiopian time format: "hour:minute period" or "ሰዓት hour:minute period"
  // Example: "3:00 ጠዋት" or "ሰዓት 3:00 ጠዋት" or "8:30 ከሰዓት"
  const cleaned = timeEth.trim();
  
  // Try to match pattern: optional "ሰዓት" number:number period
  const match = cleaned.match(/(?:ሰዓት\s*)?(\d{1,2}):(\d{2})\s*([ጠዋትከሰዓትማታለሊት]+)/);
  if (!match) return '';
  
  const ethiopianHour = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  
  // Convert Ethiopian hour to standard hour
  // Ethiopian time calculation: standardHour = ethiopianHour + 6 (with wraparound)
  // Ethiopian periods:
  // ጠዋት (morning): 6 AM - 12 PM standard (Ethiopian 12-6)
  // ከሰዓት (day): 12 PM - 6 PM standard (Ethiopian 6-12)
  // ማታ (evening): 6 PM - 12 AM standard (Ethiopian 12-6)
  // ለሊት (night): 12 AM - 6 AM standard (Ethiopian 6-12)
  
  let standardHour = 0;
  
  if (period.includes('ጠዋት')) {
    // Morning: 6 AM - 12 PM
    // Ethiopian 12 = 6 AM, Ethiopian 1-6 = 7 AM - 12 PM
    if (ethiopianHour === 12) {
      standardHour = 6;
    } else {
      standardHour = ethiopianHour + 6;
    }
  } else if (period.includes('ከሰዓት')) {
    // Day: 12 PM - 6 PM
    // Ethiopian 6 = 12 PM, Ethiopian 7-12 = 1 PM - 6 PM
    if (ethiopianHour === 12) {
      standardHour = 18; // 6 PM
    } else if (ethiopianHour >= 6) {
      standardHour = ethiopianHour + 6;
    } else {
      standardHour = ethiopianHour + 6;
    }
  } else if (period.includes('ማታ')) {
    // Evening: 6 PM - 12 AM
    // Ethiopian 12 = 6 PM, Ethiopian 1-6 = 7 PM - 12 AM
    if (ethiopianHour === 12) {
      standardHour = 18; // 6 PM
    } else {
      standardHour = ethiopianHour + 6;
      if (standardHour >= 24) standardHour -= 12;
    }
  } else if (period.includes('ለሊት')) {
    // Night: 12 AM - 6 AM
    // Ethiopian 6 = 12 AM, Ethiopian 7-12 = 1 AM - 6 AM
    if (ethiopianHour === 12) {
      standardHour = 0; // 12 AM (midnight)
    } else if (ethiopianHour >= 6) {
      standardHour = ethiopianHour - 6;
    } else {
      standardHour = ethiopianHour + 6;
      if (standardHour >= 6) standardHour -= 12;
    }
  }
  
  // Ensure valid hour range
  if (standardHour < 0) standardHour += 24;
  if (standardHour >= 24) standardHour -= 24;
  
  return `${standardHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Format time for display based on user's preferred format
 */
const formatForDisplay = (time24: string, format: TimeFormat): string => {
  if (!time24 || time24 === '') return '';
  
  switch (format) {
    case '12h':
      return to12Hour(time24);
    case '24h':
      return time24;
    case 'ethiopian':
      return toEthiopian(time24);
    default:
      return time24;
  }
};

/**
 * Parse user input and convert to 24-hour format
 */
const parseInput = (input: string, format: TimeFormat): string => {
  if (!input || input === '') return '';

  // Forgiving fallback: accept a bare 24-hour HH:MM regardless of the display
  // format, so staff can type the stored value without a period suffix.
  const bare = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (bare) {
    const hours = parseInt(bare[1], 10);
    const minutes = parseInt(bare[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  switch (format) {
    case '12h':
      return from12Hour(input);
    case '24h':
      // Validate 24-hour format
      {
        const match24 = input.match(/^(\d{1,2}):(\d{2})$/);
        if (match24) {
          const hours = parseInt(match24[1], 10);
          const minutes = parseInt(match24[2], 10);
          if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
        }
        return '';
      }
    case 'ethiopian':
      return fromEthiopian(input);
    default:
      return '';
  }
};

export const TimeInput = ({
  value, // 24-hour format (HH:MM)
  onChange,
  timeFormat,
  disabled = false,
  className = '',
  placeholder,
  id,
}: TimeInputProps) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  // Update display value when value or format changes
  useEffect(() => {
    setDisplayValue(formatForDisplay(value, timeFormat));
  }, [value, timeFormat]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Parse and convert to 24-hour format
    const time24 = parseInput(inputValue, timeFormat);
    if (time24) {
      onChange(time24);
    }
  };

  const handleBlur = () => {
    // Validate and reformat on blur
    const time24 = parseInput(displayValue, timeFormat);
    if (time24) {
      setDisplayValue(formatForDisplay(time24, timeFormat));
      onChange(time24);
    } else if (displayValue) {
      // If invalid, revert to last valid value
      setDisplayValue(formatForDisplay(value, timeFormat));
    }
  };

  // Determine placeholder based on format
  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;
    
    switch (timeFormat) {
      case '12h':
        return '08:00 AM';
      case '24h':
        return '08:00';
      case 'ethiopian':
        return 'ሰዓት 2:00 ጠዋት';
      default:
        return '08:00';
    }
  };

  return (
    <Input
      type="text"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={getPlaceholder()}
      className={className}
    />
  );
};

