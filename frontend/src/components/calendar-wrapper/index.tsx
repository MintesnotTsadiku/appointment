/**
 * Internal dependencies.
 */
import { Calendar } from "@/components/calendar";
import { Button } from "@/components/button";
import { cn, disabledDays } from "@/lib/utils";

type CalendarWrapperProps = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  displayMonth: Date;
  setDisplayMonth: (date: Date) => void;
  meetingData: {
    valid_start_date: string;
    valid_end_date: string;
    available_days: string[];
  };
  loading: boolean;
  onDayClick: (date: Date) => void;
  className?: string;
};

export const CalendarWrapper = ({
  selectedDate,
  displayMonth,
  setDisplayMonth,
  meetingData,
  loading,
  className,
  onDayClick,
}: CalendarWrapperProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Parse valid_start_date from backend
  let validStartDate = new Date(meetingData.valid_start_date || today);
  validStartDate.setHours(0, 0, 0, 0);
  
  // If date is invalid, use today
  if (isNaN(validStartDate.getTime())) {
    validStartDate = new Date(today);
  }
  
  // CRITICAL: Use the LATER of today or valid_start_date
  // This ensures past dates are always disabled, even if backend allows them
  if (validStartDate.getTime() < today.getTime()) {
    validStartDate = new Date(today);
  }
  
  // Check if today is selectable (not in the past and not a disabled day)
  const disabledDaysList = disabledDays(meetingData.available_days);
  const isTodaySelectable = today >= validStartDate && !disabledDaysList.includes(today.getDay());
  
  // Helper function to check if a date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (loading) return true;
    const dateTime = date.getTime();
    const validStartTime = validStartDate.getTime();
    
    // Handle valid_end_date (might be empty)
    let validEndTime = Infinity; // Default to no end date limit
    if (meetingData.valid_end_date) {
      const endDate = new Date(meetingData.valid_end_date);
      if (!isNaN(endDate.getTime())) {
        validEndTime = endDate.setHours(0, 0, 0, 0);
      }
    }
    
    const isPastDate = dateTime < validStartTime;
    const isNextDate = validEndTime !== Infinity && dateTime > validEndTime;
    const isDisabledDay = disabledDaysList.includes(date.getDay());
    
    return isPastDate || isDisabledDay || isNextDate;
  };
  
  const handleTodayClick = () => {
    if (!loading && isTodaySelectable) {
      onDayClick(today);
      setDisplayMonth(today);
    }
  };
  
  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    
    // Validate date before allowing click
    if (isDateDisabled(date)) {
      // Date is disabled, don't process the click
      // Check if it's a past date to show appropriate message
      const dateTime = date.getTime();
      const validStartTime = validStartDate.getTime();
      if (dateTime < validStartTime) {
        // This is a past date - the calendar should prevent this, but handle gracefully
        console.warn("Attempted to select a past date:", date);
      }
      return;
    }
    
    // Date is valid, proceed with click handler
    onDayClick(date);
  };
  
  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={selectedDate}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        weekStartsOn={1}
        fromMonth={validStartDate}
        toMonth={meetingData.valid_end_date ? new Date(meetingData.valid_end_date) : undefined}
        disableNavigation={loading}
        disabled={(date) => {
          if (loading) return true;
          const dateTime = date.getTime();
          const validStartTime = validStartDate.getTime();
          
          const isPastDate = dateTime < validStartTime;
          
          // Handle valid_end_date (might be empty)
          let isNextDate = false;
          if (meetingData.valid_end_date) {
            const endDate = new Date(meetingData.valid_end_date);
            if (!isNaN(endDate.getTime())) {
              isNextDate = dateTime > endDate.setHours(0, 0, 0, 0);
            }
          }
          
          return (
            isPastDate || disabledDaysList.includes(date.getDay()) || isNextDate
          );
        }}
        onDayClick={handleDayClick}
        className={cn("[&_*_table]:flex-1 [&_*_table]:h-fit",className)}
        classNames={{
          months:
            "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
          month: "space-y-4 w-full flex flex-col",
          table: "w-full h-full border-collapse space-y-1",
          head_row: "",
          row: "w-full mt-2",
          caption_label: "md:text-xl text-sm",
        }}
      />
      
      {/* Today Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTodayClick}
          disabled={loading || !isTodaySelectable}
          className="text-sm"
        >
          Today
        </Button>
      </div>
    </div>
  );
};
