/**
 * External dependencies.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Error } from "frappe-js-sdk/lib/frappe_app/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSiteName = () => {
  // eslint-disable-next-line
  // @ts-expect-error
  return window.frappe?.boot?.sitename ?? import.meta.env.VITE_SITE_NAME;
};

export const getErrorMessages = (error: Error) => {
  let eMessages = error?._server_messages
    ? JSON.parse(error?._server_messages)
    : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eMessages = eMessages.map((m: any) => {
    try {
      return JSON.parse(m);
    } catch (e) {
      return e;
    }
  });

  if (eMessages.length === 0) {
    // Get the message from the exception by removing the exc_type
    const index = error?.exception?.indexOf(":");
    if (index) {
      const exception = error?.exception?.slice(index + 1);
      if (exception) {
        eMessages = [
          {
            message: exception,
            title: "Error",
          },
        ];
      }
    }

    if (eMessages.length === 0) {
      eMessages = [
        {
          message: error?.message,
          title: "Error",
        },
      ];
    }
  }
  return eMessages;
};

export function removeHtmlString(data: string) {
  return data.replace(/<\/?[^>]+(>|$)/g, "");
}

export function parseFrappeErrorMsg(error: Error) {
  const messages = getErrorMessages(error);
  let message = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages.forEach((m: any) => {
    message += `${m.message}\n`;
  });
  if (message) {
    return removeHtmlString(message);
  } else {
    return "Something went wrong. Please try again later.";
  }
}

export function getTimeZoneOffsetFromTimeZoneString(timezone: string) {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });

  const offsetString = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetString) {
    throw new Error("Unable to determine timezone offset");
  }

  // Handle cases where offsetString is just "GMT"
  if (offsetString === "GMT") {
    return 0;
  }

  const match = offsetString.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error(`Unexpected timezone format: ${offsetString}`);
  }

  const [, sign, hours, minutes] = match;
  return (
    (sign === "+" ? 1 : -1) * (parseInt(hours, 10) * 60 + parseInt(minutes, 10))
  );
}

export const getAllSupportedTimeZones = () => {
  return Intl.supportedValuesOf("timeZone") || [];
};

export const convertToMinutes = (duration: number) => {
  return duration / 60;
};

export const getLocalTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const capitalizeWords = (str: string) => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Map days to numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export const dayMapping: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Convert available days to disabled days
export const disabledDays = (availableDays?: string[]) => {
  if (!availableDays) return []; // Return an empty array if data isn't loaded yet

  return Object.values(dayMapping).filter(
    (dayNumber) => !availableDays.includes(Object.keys(dayMapping)[dayNumber])
  );
};

export const parseDateString = (dateString: string): Date => {
  const datePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (!datePattern.test(dateString)) {
    return new Date();
  }
  const [, year, month, day] = dateString.match(datePattern)!;
  // Create a Date object using the extracted values
  // Note: JavaScript months are 0-based, so we subtract 1 from the month
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  ) {
    return date;
  } else {
    return new Date();
  }
};

// Converts Minute string to Hours and Minutes Format (HH:MM)
export const convertMinutesToTimeFormat = (
  minutes: number | string,
  useAbbr: boolean = false
): string => {
  try {
    const totalMinutes =
      typeof minutes === "string" ? parseInt(minutes, 10) : minutes;
      
    if (isNaN(totalMinutes)) {
      console.warn("Invalid input: Cannot convert to number", minutes);
      return "";
    }

    // If minutes less than 60, return as is with "Minute" suffix
    if (totalMinutes < 60) {
      return `${totalMinutes} ${useAbbr ? "min" : "Minute"}`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    const hoursStr = hours.toString().padStart(2, "0");
    const minutesStr = mins.toString().padStart(2, "0");

    return `${hoursStr}:${minutesStr} ${useAbbr ? "hr" : "Hour"}`;
  } catch (error) {
    console.error("Error in convertMinutesToTimeFormat:", error);
    return "";
  }
};

/**
 * Convert standard time to Ethiopian time format
 * Ethiopian time starts at 6 AM (sunrise) as 12:00
 * 6 AM - 12 PM = ጠዋት (morning)
 * 12 PM - 6 PM = ከሰዓት (afternoon, "from hour")
 * 6 PM - 12 AM = ምሽት (evening)
 * 12 AM - 6 AM = ሌሊት (night)
 */
export const convertToEthiopianTime = (date: Date): { hour: number; minute: number; period: string } => {
  const standardHour = date.getHours();
  const minute = date.getMinutes();
  
  // Ethiopian time calculation
  let ethiopianHour = standardHour - 6;
  if (ethiopianHour < 0) {
    ethiopianHour += 12;
  }
  
  // If ethiopianHour is 0, make it 12 (Ethiopian convention)
  if (ethiopianHour === 0) {
    ethiopianHour = 12;
  } else if (ethiopianHour > 12) {
    ethiopianHour -= 12;
  }
  
  // Determine period based on standard time
  let period = "";
  if (standardHour >= 0 && standardHour < 6) {
    period = "ሌሊት"; // Night (12 AM - 6 AM)
  } else if (standardHour >= 6 && standardHour < 12) {
    period = "ጠዋት"; // Morning (6 AM - 12 PM)
  } else if (standardHour >= 12 && standardHour < 18) {
    period = "ከሰዓት"; // Afternoon (12 PM - 6 PM) - literally "from hour"
  } else {
    period = "ምሽት"; // Evening (6 PM - 12 AM)
  }
  
  return { hour: ethiopianHour, minute, period };
};