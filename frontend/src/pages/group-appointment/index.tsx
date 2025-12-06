/**
 * External dependencies
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CircleAlert, Clock, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";

/**
 * Internal dependencies
 */
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/tooltip";
import Typography from "@/components/typography";
import {
  capitalizeWords,
  cn,
  convertMinutesToTimeFormat,
  convertToMinutes,
  convertToEthiopianTime,
  getAllSupportedTimeZones,
  getTimeZoneOffsetFromTimeZoneString,
  parseDateString,
  parseFrappeErrorMsg,
} from "@/lib/utils";
import { TimeFormat } from "../appointment/types";
import { Button } from "@/components/button";
import PoweredBy from "@/components/powered-by";
import { Switch } from "@/components/switch";
import TimeZoneSelect from "../appointment/components/timeZoneSelectmenu";
import Spinner from "@/components/spinner";
import GroupMeetSkeleton from "./components/groupMeetSkeleton";
import { Skeleton } from "@/components/skeleton";
import { getIconForKey, validTitle } from "./utils";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import SuccessAlert from "@/components/success-alert";
import MetaTags from "@/components/meta-tags";
import { CalendarWrapper } from "@/components/calendar-wrapper";
import { useMeetingReducer } from "./reducer";

const GroupAppointment = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date");
  const reschedule = searchParams.get("reschedule") || "";
  const event_token = searchParams.get("event_token") || "";
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");
  const [state, dispatch] = useMeetingReducer();
  const { theme, setTheme } = useTheme();

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const {
    data,
    isLoading: dataIsLoading,
    error: fetchError,
    mutate,
  } = useFrappeGetCall(
    "frappe_appointment.api.group_meet.get_time_slots",
    {
      ...Object.fromEntries(searchParams),
      appointment_group_id: groupId,
      date: new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).format(date ? parseDateString(date) : state.selectedDate),
      user_timezone_offset: String(
        getTimeZoneOffsetFromTimeZoneString(state.timeZone)
      ),
    },
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount:3,
    }
  );

  const { call: bookMeeting, loading } = useFrappePostCall(
    "frappe_appointment.api.group_meet.book_time_slot"
  );

  useEffect(() => {
    if (data) {
      dispatch({ type: "SET_MEETING_DATA", payload: data.message });
      const validData = data.message.is_invalid_date
        ? new Date(data.message.next_valid_date)
        : state.selectedDate;
      dispatch({ type: "SET_SELECTED_DATE", payload: validData });
      dispatch({ type: "SET_DISPLAY_MONTH", payload: validData });
      updateDateQuery(validData);
    }
    if (fetchError) {
      navigate("/");
    }
  }, [data, fetchError, mutate, navigate, dispatch]);

  useEffect(() => {
    if (
      state.meetingData.booked_slot &&
      Object.keys(state.meetingData.booked_slot).length > 0
    ) {
      dispatch({ type: "SET_APPOINTMENT_SCHEDULED", payload: true });
      dispatch({
        type: "SET_SELECTED_SLOT",
        payload: {
          start_time: state.meetingData.booked_slot.start_time,
          end_time: state.meetingData.booked_slot.end_time,
        },
      });
      dispatch({
        type: "SET_BOOKING_RESPONSE",
        payload: {
          meet_link: state.meetingData.booked_slot.meet_link,
          meeting_provider: state.meetingData.booked_slot.meeting_provider,
          reschedule_url: state.meetingData.booked_slot.reschedule_url,
          google_calendar_event_url:
            state.meetingData.booked_slot.google_calendar_event_url,
          message: "Event scheduled",
          event_id: state.meetingData.booked_slot.reschedule_url,
        },
      });
    }
  }, [state.meetingData.booked_slot]);

  useEffect(() => {
    const handleResize = () => {
      dispatch({ type: "SET_MOBILE_VIEW", payload: window.innerWidth <= 768 });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (date) {
      const dateObj = parseDateString(date);
      dispatch({ type: "SET_SELECTED_DATE", payload: dateObj });
      dispatch({ type: "SET_DISPLAY_MONTH", payload: dateObj });
      updateDateQuery(dateObj);
    }
  }, [date]);

  const updateDateQuery = (date: Date) => {
    const queries: Record<string, string> = {};
    searchParams.forEach((value, key) => (queries[key] = value));
    setSearchParams({
      ...queries,
      date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    });
  };

  const formatTimeSlot = (date: Date) => {
    if (timeFormat === "ethiopian") {
      const { hour, minute, period } = convertToEthiopianTime(date);
      const minuteStr = minute.toString().padStart(2, "0");
      return `ሰዓት ${hour}:${minuteStr} ${period}`;
    }
    
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: timeFormat === "12h",
      timeZone: state.timeZone,
    }).format(date);
  };

  // Helper function to check if a time slot is in the past
  const isSlotInPast = (slotStartTime: string): boolean => {
    try {
      const slotDate = new Date(slotStartTime);
      const now = new Date();
      
      // Get selected date without time
      const selectedDateObj = date ? parseDateString(date) : state.selectedDate;
      const selectedDateOnly = new Date(selectedDateObj);
      selectedDateOnly.setHours(0, 0, 0, 0);
      
      // Get today without time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Only check time if the selected date is today
      if (selectedDateOnly.getTime() === today.getTime()) {
        // Compare slot time with current time
        return slotDate.getTime() < now.getTime();
      }
      
      // For future dates, no slots are in the past
      // For past dates, calendar already prevents selection
      return false;
    } catch (err) {
      console.error("Error checking if slot is in past:", err);
      return false;
    }
  };

  const scheduleMeeting = () => {
    const meetingData = {
      ...Object.fromEntries(searchParams),
      appointment_group_id: groupId,
      date: new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).format(state.selectedDate),
      user_timezone_offset: String(
        getTimeZoneOffsetFromTimeZoneString(state.timeZone)
      ),
      start_time: state.selectedSlot!.start_time,
      end_time: state.selectedSlot!.end_time,
      time_format: timeFormat, // Store user's preferred time format
    };

    bookMeeting(meetingData)
      .then((data) => {
        dispatch({ type: "SET_BOOKING_RESPONSE", payload: data.message });
        dispatch({ type: "SET_APPOINTMENT_SCHEDULED", payload: true });
        mutate();
      })
      .catch((err) => {
        const error = parseFrappeErrorMsg(err);
        toast(error || "Something went wrong", {
          duration: 4000,
          classNames: {
            actionButton:
              "group-[.toast]:!bg-red-500 group-[.toast]:hover:!bg-red-300 group-[.toast]:!text-white",
          },
          icon: <CircleAlert className="h-5 w-5 text-red-500" />,
          action: {
            label: "OK",
            onClick: () => toast.dismiss(),
          },
        });
      });
  };

  return (
    <>
      <MetaTags
        title={`${
          capitalizeWords(validTitle(state.meetingData.appointment_group_id)) ||
          "Group"
        } | Appointment`}
        description={`Book appointment with ${validTitle(
          state.meetingData.appointment_group_id
        )}`}
        // keywords="Group appointment"
        // author={state.meetingData.appointment_group_id}
        // robots="index, follow"
        // ogTitle={`${
        //   capitalizeWords(validTitle(state.meetingData.appointment_group_id)) ||
        //   "Group"
        // } | Scheduler`}
        // ogDescription={`Book appointment with ${validTitle(
        //   state.meetingData.appointment_group_id
        // )}`}
        // twitterCard="summary_large_image"
        // twitterTitle={`${
        //   capitalizeWords(validTitle(state.meetingData.appointment_group_id)) ||
        //   "Group"
        // } | Scheduler`}
        // twitterDescription={`Book appointment with ${validTitle(
        //   state.meetingData.appointment_group_id
        // )}`}
      />
      <div 
        className="w-full min-h-screen relative"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Ambient Background Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div 
            className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'var(--glow-primary)' }}
          />
          <div 
            className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'var(--glow-secondary)' }}
          />
          <div 
            className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15"
            style={{ background: 'var(--glow-success)' }}
          />
        </div>

        {/* Sticky Header with Back Button and Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-50 w-full backdrop-blur-xl"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="w-full max-w-7xl mx-auto px-5 md:px-6 py-4 flex items-center justify-between">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="backdrop-blur-sm"
              style={{ 
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm transition-all"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)'
              }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme + "-icon"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "light" ? (
                    <Moon className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  ) : (
                    <Sun className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  )}
                </motion.div>
              </AnimatePresence>
              <span 
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {theme === "light" ? "Dark" : "Light"}
              </span>
            </motion.button>
          </div>
        </motion.div>

      <div className="w-full flex justify-center items-center">
          <div className="w-full max-w-7xl mx-auto p-5 md:p-6 lg:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-fit flex w-full max-lg:flex-col gap-6 md:gap-8"
            >
            {/* Group Meet Details */}
            {!state.meetingData.appointment_group_id ? (
              <GroupMeetSkeleton />
            ) : (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex flex-col w-full lg:w-3/4 gap-4 rounded-2xl backdrop-blur-sm p-6"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                <Typography
                  variant="h2"
                  className="text-3xl font-semibold text-left w-full capitalize"
                    style={{ color: 'var(--text-primary)' }}
                >
                  {validTitle(state.meetingData.title || state.meetingData.appointment_group_id)}
                </Typography>
                {state.meetingData && (
                    <div className="w-full flex flex-col gap-3 mt-2">
                    {state.meetingData.meeting_details &&
                      Object.entries(state.meetingData.meeting_details).map(
                          ([key, value], index) => {
                          const Icon = getIconForKey(key);
                          return (
                              <motion.div
                              key={key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.05 }}
                                className="flex cursor-default items-center gap-2 w-full"
                            >
                                <div className="w-full truncate flex items-center justify-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ 
                                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                                      opacity: 0.2
                                    }}
                                  >
                                    <Icon className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                                  </div>
                                <Tooltip>
                                  <TooltipTrigger className="text-left truncate">
                                    <Typography
                                      className={cn(
                                          "truncate font-medium",
                                          key.includes("name") && "font-semibold"
                                        )}
                                        style={{ 
                                          color: key.includes("name") 
                                            ? 'var(--text-primary)' 
                                            : 'var(--text-secondary)' 
                                        }}
                                    >
                                      {value}
                                    </Typography>
                                  </TooltipTrigger>
                                  <TooltipContent className="capitalize">
                                      <span style={{ color: 'var(--accent-primary)' }}>
                                      {validTitle(key)}
                                    </span>{" "}
                                    : {value}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              </motion.div>
                          );
                        }
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex cursor-default items-center gap-2 w-full"
                      >
                        <div className="w-full truncate flex items-center justify-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ 
                              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                              opacity: 0.2
                            }}
                          >
                            <Clock className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                          </div>
                        <Tooltip>
                          <TooltipTrigger className="text-left truncate">
                              <Typography className="truncate font-medium">
                              {convertMinutesToTimeFormat(convertToMinutes(
                                state.meetingData.duration
                              ).toString())}{" "}
                              Meeting
                            </Typography>
                          </TooltipTrigger>
                          <TooltipContent className="capitalize">
                              <span style={{ color: 'var(--accent-primary)' }}>duration</span> :{" "}
                            {convertMinutesToTimeFormat(convertToMinutes(
                              state.meetingData.duration
                            ).toString())}{" "}
                            Meeting
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      </motion.div>
                  </div>
                )}
                </motion.div>
            )}
            {(!state.isMobileView || !state.expanded) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex flex-col w-full lg:max-w-96 gap-6"
                >
                {/* Calendar View */}
                  <div className="w-full rounded-2xl backdrop-blur-sm p-6" style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}>
                  <CalendarWrapper
                    displayMonth={state.displayMonth}
                    selectedDate={state.selectedDate}
                    loading={loading}
                    setDisplayMonth={(date) =>
                      dispatch({ type: "SET_DISPLAY_MONTH", payload: date })
                    }
                    meetingData={{
                      valid_start_date: state.meetingData.valid_start_date,
                      valid_end_date: state.meetingData.valid_end_date,
                      available_days: state.meetingData.available_days,
                    }}
                    setSelectedDate={(date) =>
                      dispatch({ type: "SET_SELECTED_DATE", payload: date })
                    }
                    onDayClick={(date) => {
                      dispatch({ type: "SET_SELECTED_DATE", payload: date });
                      dispatch({ type: "SET_DISPLAY_MONTH", payload: date });
                      dispatch({ type: "SET_EXPANDED", payload: true });
                      dispatch({
                        type: "SET_SELECTED_SLOT",
                        payload: {
                          start_time: "",
                          end_time: "",
                        },
                      });
                      updateDateQuery(date);
                    }}
                      className="rounded-md w-full flex lg:px-6 lg:p-2 p-0"
                  />
                </div>
                  <div className="w-full gap-4 flex flex-col rounded-2xl backdrop-blur-sm p-6" style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}>
                  {/* Time Format Selection */}
                  <div className="flex items-center gap-3 flex-wrap">
                      <Typography className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Time Format:
                    </Typography>
                    <div className="flex gap-2 flex-wrap">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={timeFormat === "12h" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeFormat("12h")}
                        className={cn(
                              "h-8 px-3 text-xs backdrop-blur-sm transition-all",
                              timeFormat === "12h" ? "shadow-sm" : ""
                            )}
                            style={timeFormat === "12h" ? {
                              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                              color: 'white',
                              border: '1px solid transparent'
                            } : {
                              backgroundColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-default)'
                            }}
                      >
                        AM/PM
                      </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={timeFormat === "24h" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeFormat("24h")}
                        className={cn(
                              "h-8 px-3 text-xs backdrop-blur-sm transition-all",
                              timeFormat === "24h" ? "shadow-sm" : ""
                            )}
                            style={timeFormat === "24h" ? {
                              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                              color: 'white',
                              border: '1px solid transparent'
                            } : {
                              backgroundColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-default)'
                            }}
                      >
                        24H
                      </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={timeFormat === "ethiopian" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeFormat("ethiopian")}
                        className={cn(
                              "h-8 px-3 text-xs backdrop-blur-sm transition-all",
                              timeFormat === "ethiopian" ? "shadow-sm" : ""
                            )}
                            style={timeFormat === "ethiopian" ? {
                              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                              color: 'white',
                              border: '1px solid transparent'
                            } : {
                              backgroundColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-default)'
                            }}
                      >
                        Local Time
                      </Button>
                        </motion.div>
                    </div>
                  </div>
                  
                  {/* Timezone */}
                  <TimeZoneSelect
                    timeZones={getAllSupportedTimeZones()}
                    setTimeZone={(tz) =>
                      dispatch({ type: "SET_TIMEZONE", payload: tz })
                    }
                    timeZone={state.timeZone}
                    disable={loading}
                  />
                </div>
                </motion.div>
            )}
            {state.isMobileView && state.expanded && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-14 fixed bottom-0 left-0 w-screen z-10 backdrop-blur-xl flex items-center justify-between px-4"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                <Button
                  variant="link"
                    className="px-0 backdrop-blur-sm"
                    style={{ color: 'var(--accent-primary)' }}
                  onClick={() =>
                    dispatch({ type: "SET_EXPANDED", payload: false })
                  }
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 " />
                  Back
                </Button>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  disabled={
                    (state.selectedSlot?.start_time &&
                    state.selectedSlot?.end_time
                      ? false
                      : true) || loading
                  }
                      className="flex w-fit px-10 md:hidden backdrop-blur-sm shadow-sm"
                      style={{
                        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                        color: 'white',
                        border: '1px solid transparent'
                      }}
                  onClick={scheduleMeeting}
                >
                  {loading && <Spinner />}
                  {reschedule && event_token ? "Reschedule" : "Schedule"}
                </Button>
                  </motion.div>
                </motion.div>
            )}
            {/* Available Slots */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              className={cn(
                  "w-full flex flex-col lg:w-1/2 gap-4 rounded-2xl backdrop-blur-sm p-6",
                !state.expanded && "max-md:hidden"
              )}
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
            >
              <Typography
                variant="h3"
                  className="text-lg font-semibold lg:w-full truncate"
                  style={{ color: 'var(--text-primary)' }}
              >
                {format(state.selectedDate, "EEEE, d MMMM yyyy")}
              </Typography>

              {dataIsLoading ? (
                <div className="h-full flex flex-col w-full mb-3 overflow-y-auto no-scrollbar space-y-2">
                  {Array.from({ length: 5 }).map((_, key) => (
                    <Skeleton key={key} className="w-full h-10" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="lg:h-[22rem] mb-3 overflow-y-auto no-scrollbar space-y-2">
                    {state.meetingData.all_available_slots_for_data.length >
                    0 ? (
                      state.meetingData.all_available_slots_for_data.map(
                        (slot, index) => {
                          const isPast = isSlotInPast(slot.start_time);
                        const isSelected = state.selectedSlot?.start_time === slot.start_time &&
                          state.selectedSlot?.end_time === slot.end_time && !isPast;
                          return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + index * 0.05 }}
                            whileHover={!isPast && !isSelected ? { scale: 1.02 } : {}}
                            whileTap={!isPast && !isSelected ? { scale: 0.98 } : {}}
                          >
                            <Button
                              onClick={() => {
                                if (isPast) {
                                  toast("Cannot book past time slots", {
                                    duration: 3000,
                                    classNames: {
                                      actionButton:
                                        "group-[.toast]:!bg-red-500 group-[.toast]:hover:!bg-red-300 group-[.toast]:!text-white",
                                    },
                                    icon: <CircleAlert className="h-5 w-5 text-red-500" />,
                                    action: {
                                      label: "OK",
                                      onClick: () => toast.dismiss(),
                                    },
                                  });
                                  return;
                                }
                                dispatch({
                                  type: "SET_SELECTED_SLOT",
                                  payload: {
                                    start_time: slot.start_time,
                                    end_time: slot.end_time,
                                  },
                                });
                              }}
                              disabled={loading || isPast}
                              variant="outline"
                              className={cn(
                                "w-full font-normal border transition-all backdrop-blur-sm",
                                isSelected && "shadow-sm"
                              )}
                              style={isSelected ? {
                                background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                                color: 'white',
                                border: '1px solid transparent'
                              } : isPast ? {
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                                opacity: 0.4
                              } : {
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-default)'
                              }}
                            >
                              {formatTimeSlot(new Date(slot.start_time))}
                            </Button>
                          </motion.div>
                          );
                        }
                      )
                    ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="h-full max-md:h-44 w-full flex justify-center items-center"
                    >
                      <Typography className="text-center" style={{ color: 'var(--text-muted)' }}>
                          No open-time slots
                        </Typography>
                    </motion.div>
                    )}
                  </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    disabled={loading}
                    className={cn(
                      "lg:!mt-0 max-lg:w-full hidden backdrop-blur-sm shadow-sm",
                      state.selectedSlot?.start_time &&
                        state.selectedSlot.end_time &&
                        "flex",
                      "max-md:hidden"
                    )}
                    style={{
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                      color: 'white',
                      border: '1px solid transparent'
                    }}
                    onClick={scheduleMeeting}
                  >
                    {loading && <Spinner />}
                    {reschedule && event_token ? "Reschedule" : "Schedule"}
                  </Button>
                </motion.div>
                </>
              )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      <PoweredBy />
      {state.selectedSlot?.start_time && (
        <SuccessAlert
          open={state.appointmentScheduled}
          setOpen={(open) =>
            dispatch({ type: "SET_APPOINTMENT_SCHEDULED", payload: open })
          }
          selectedSlot={state.selectedSlot}
          meetingProvider={state.bookingResponse.meeting_provider}
          meetLink={state.bookingResponse.meet_link}
          rescheduleLink={state.bookingResponse.reschedule_url}
          calendarString={state.bookingResponse.google_calendar_event_url}
          disableClose={
            state.meetingData.booked_slot &&
            Object.keys(state.meetingData.booked_slot).length > 0
              ? true
              : false
          }
        />
      )}
    </>
  );
};

export default GroupAppointment;
