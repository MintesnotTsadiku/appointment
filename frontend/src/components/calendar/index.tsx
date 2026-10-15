import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { intlLocale, TranslationContext } from "@/lib/i18n";
import { buttonVariants } from "@/components/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Outside a translation provider (or in English) the day picker's own English labels stay.
  const language = React.useContext(TranslationContext)?.language ?? "en";
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      formatters={language === "en" ? undefined : localFormatters(intlLocale(language))}
      className={cn("platform-calendar p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 md:pt-3 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 rounded-lg bg-transparent p-0 hover:bg-accent"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-11 font-normal text-sm md:text-base md:h-[26px]! h-[22px]!",
        row: "flex w-full mt-2",
        cell: "h-11 w-11 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md  first:has-aria-[selected]:rounded-l-md last:has-aria-[selected]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-11 w-11 rounded-lg p-0 font-normal aria-selected:opacity-100 text-sm md:text-base"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

/** Month caption and weekday names in the app language (date-fns has no Amharic locale). */
function localFormatters(locale: string): CalendarProps["formatters"] {
  const caption = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  return {
    formatCaption: (month) => caption.format(month),
    formatWeekdayName: (day) => weekday.format(day),
  };
}

export { Calendar };
