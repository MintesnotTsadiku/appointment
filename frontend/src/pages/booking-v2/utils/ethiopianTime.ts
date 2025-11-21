/**
 * Ethiopian time conversion utilities
 * Ethiopian time is 6 hours behind/ahead of standard time
 * 12:00 AM (midnight) = ሰዓት 6 (6 at night)
 * 6:00 AM = ሰዓት 12 (12 in the morning) 
 * 12:00 PM (noon) = ሰዓት 6 (6 in the day)
 * 6:00 PM = ሰዓት 12 (12 at night)
 */

export interface EthiopianTime {
  hour: number;
  minute: number;
  period: 'ጠዋት' | 'ከሰዓት' | 'ማታ' | 'ለሊት'; // Morning/Day/Evening/Night
  formatted: string;
}

/**
 * Convert standard time to Ethiopian time
 * 
 * Ethiopian time periods:
 * - ጠዋት (tewat): Before 6 ሰዓት (6 AM - 12 PM standard)
 * - ከሰዓት (keseat): 6-12 ሰዓት (12 PM - 6 PM standard)
 * - ማታ (mata): After 12 ሰዓት / Before midnight (6 PM - 12 AM standard)
 * - ለሊት (lelit): Midnight onwards (12 AM - 6 AM standard)
 */
export const toEthiopianTime = (date: Date): EthiopianTime => {
  let hour = date.getHours();
  const minute = date.getMinutes();
  
  // Convert hour to Ethiopian time (shift by 6 hours)
  let ethiopianHour = hour - 6;
  if (ethiopianHour < 0) ethiopianHour += 12;
  if (ethiopianHour === 0) ethiopianHour = 12;
  if (ethiopianHour > 12) ethiopianHour -= 12;
  
  // Determine period based on Ethiopian hour
  let period: 'ጠዋት' | 'ከሰዓት' | 'ማታ' | 'ለሊት';
  
  if (hour >= 6 && hour < 12) {
    // 6 AM - 12 PM standard = Ethiopian morning (before 6 ሰዓት)
    period = 'ጠዋት';
  } else if (hour >= 12 && hour < 18) {
    // 12 PM - 6 PM standard = Ethiopian day (6-12 ሰዓት)
    period = 'ከሰዓት';
  } else if (hour >= 18 && hour < 24) {
    // 6 PM - 12 AM standard = Ethiopian evening (after 12 ሰዓት)
    period = 'ማታ';
  } else {
    // 12 AM - 6 AM standard = Ethiopian night
    period = 'ለሊት';
  }
  
  const formatted = `${ethiopianHour}:${minute.toString().padStart(2, '0')} ${period}`;
  
  return {
    hour: ethiopianHour,
    minute,
    period,
    formatted,
  };
};

/**
 * Format Ethiopian time for display
 */
export const formatEthiopianTime = (date: Date): string => {
  const { hour, minute, period } = toEthiopianTime(date);
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
};

/**
 * Format time with both standard and Ethiopian time
 */
export const formatDualTime = (
  date: Date,
  standardFormat: '12h' | '24h' = '12h'
): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: standardFormat === '12h',
  };
  
  const standardTime = new Intl.DateTimeFormat('en-US', options).format(date);
  const ethiopianTime = formatEthiopianTime(date);
  
  return `${standardTime} (${ethiopianTime})`;
};

/**
 * Get Ethiopian period label in English
 */
export const getEthiopianPeriodLabel = (date: Date): string => {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 12) {
    return 'Morning'; // ጠዋት
  } else if (hour >= 12 && hour < 18) {
    return 'Day'; // ከሰዓት
  } else if (hour >= 18 && hour < 24) {
    return 'Evening'; // ማታ
  } else {
    return 'Night'; // ለሊት
  }
};

/**
 * Check if Ethiopian time format is supported
 */
export const isEthiopianTimeSupported = (): boolean => {
  // Check if Ethiopic locale is supported
  try {
    const locale = 'am-ET'; // Amharic - Ethiopia
    new Intl.DateTimeFormat(locale);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format time with Ethiopian numerals
 */
export const formatWithEthiopicNumerals = (date: Date): string => {
  const { hour, minute, period } = toEthiopianTime(date);
  
  // Ethiopian numerals (1-12)
  const ethiopicNumerals: { [key: number]: string } = {
    1: '፩',
    2: '፪',
    3: '፫',
    4: '፬',
    5: '፭',
    6: '፮',
    7: '፯',
    8: '፰',
    9: '፱',
    10: '፲',
    11: '፲፩',
    12: '፲፪',
  };
  
  const hourStr = ethiopicNumerals[hour] || hour;
  const minuteStr = minute.toString().padStart(2, '0');
  
  return `${hourStr}:${minuteStr} ${period}`;
};

/**
 * Get time format example for UI
 */
export const getTimeFormatExample = (format: '12h' | '24h' | 'ethiopian'): string => {
  const exampleDate = new Date();
  exampleDate.setHours(14, 30); // 2:30 PM
  
  switch (format) {
    case '12h':
      return '2:30 PM';
    case '24h':
      return '14:30';
    case 'ethiopian':
      return formatEthiopianTime(exampleDate);
    default:
      return '';
  }
};

/**
 * Get Ethiopian calendar date
 * Note: This is a simplified version. Full Ethiopian calendar conversion
 * would require a more complex algorithm.
 */
export const getEthiopianDateInfo = (date: Date): {
  year: number;
  month: number;
  day: number;
  monthName: string;
} => {
  // Ethiopian calendar is approximately 7-8 years behind Gregorian
  const gregorianYear = date.getFullYear();
  const ethiopianYear = gregorianYear - 7;
  
  // Ethiopian months
  const ethiopianMonths = [
    'መስከረም', // Meskerem
    'ጥቅምት',  // Tikimt
    'ኅዳር',   // Hidar
    'ታኅሣሥ',  // Tahsas
    'ጥር',    // Tir
    'የካቲት',  // Yekatit
    'መጋቢት',  // Megabit
    'ሚያዝያ',  // Miazia
    'ግንቦት',   // Ginbot
    'ሰኔ',    // Sene
    'ሐምሌ',   // Hamle
    'ነሐሴ',   // Nehase
    'ጳጉሜን',  // Pagumen
  ];
  
  const month = date.getMonth();
  const day = date.getDate();
  
  return {
    year: ethiopianYear,
    month: month + 1,
    day: day,
    monthName: ethiopianMonths[month] || '',
  };
};

