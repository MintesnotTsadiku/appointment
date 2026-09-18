/**
 * Individual Appointment V2 - Drop-in Replacement
 * Uses new redesigned UI with exact same API integration as old version
 * Compatible with existing AppContext and URL structure
 * For routes: /schedule/in/:meetId
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useAppContext } from "@/context/app";
import { getLocalTimezone } from "@/lib/utils";
import { Info, Moon, Sun, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/button";
import MetaTags from "@/components/meta-tags";
import PoweredBy from "@/components/powered-by";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import Typography from "@/components/typography";
import { Skeleton } from "@/components/skeleton";

// Import new V2 components
import { DateTimeSelector } from "@/pages/booking-v2/components/DateTimeSelector";
import { BookingForm } from "@/pages/booking-v2/components/BookingForm";
import { ConfirmationModal } from "@/pages/booking-v2/components/ConfirmationModal";
import { useTimeSlots } from "@/pages/booking-v2/hooks/useTimeSlots";
import { useBookingSubmit } from "@/pages/booking-v2/hooks/useBookingSubmit";
import type { Service, TimeSlot as V2TimeSlot, BookingFormData } from "@/pages/booking-v2/types";

// Import old components for compatibility
import { MeetingCardSkeleton, ProfileSkeleton } from "@/pages/appointment/components/skeletons";
import MeetingCard from "@/pages/appointment/components/meetingCard";
import SocialProfiles from "@/pages/appointment/components/socialProfiles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";

const AppointmentV2 = () => {
  const { meetId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Use existing AppContext (important for compatibility!)
  const {
    setMeetingId,
    setUserInfo,
    userInfo,
    setDuration,
    setTimeZone,
    timeZone,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    meetingDurationCards,
    setMeetingDurationCards,
  } = useAppContext();

  // Local state
  const [friendlyError, setFriendlyError] = useState<string>("");
  const [resolvedType, setResolvedType] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'selection' | 'datetime' | 'form' | 'success'>('selection');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h' | 'ethiopian'>('12h');
  const [bookingResponse, setBookingResponse] = useState<any>(null);
  const { theme, setTheme } = useTheme();

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  // Get type from URL
  const type = searchParams.get("type");

  const updateTypeQuery = (type: string) => {
    setSearchParams({ type });
  };

  // EXACT SAME API call as old implementation
  const { data, isLoading, error } = useFrappeGetCall(
    "appointment.api.personal_meet.get_meeting_windows",
    { slug: meetId },
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 3,
    }
  );

  // Initialize (same as old implementation)
  useEffect(() => {
    if (meetId) {
      setMeetingId(meetId);
    }
    setTimeZone(getLocalTimezone());
  }, [meetId]);

  // Sync resolvedType with URL type
  useEffect(() => {
    if (type && type !== "default") {
      setResolvedType(type);
      setCurrentPhase('datetime');
    } else if (type === "default") {
      setResolvedType(null);
      setCurrentPhase('selection');
    }
  }, [type]);

  // Process API response (same as old implementation)
  useEffect(() => {
    if (data) {
      setUserInfo({
        name: data?.message?.full_name,
        designation: data?.message?.position,
        organizationName: data?.message?.company,
        userImage: data?.message?.profile_pic,
        socialProfiles: [],
        meetingProvider: data?.message?.meeting_provider,
        banner_image: data?.message?.banner_image,
      });
      setMeetingDurationCards(data?.message?.durations);
      setFriendlyError("");
      
      const durations = data?.message?.durations || [];
      if (!type || type === "default") {
        setResolvedType(null);
        setCurrentPhase('selection');
      }
    }
    if (error) {
      const errMsg = error?.response?.data?.message?.error || error?.message || "This booking link is not available.";
      setFriendlyError(errMsg);
    }
  }, [data, error]);

  // Fetch time slots using new hook
  const shouldFetchSlots = !!(
    type &&
    type !== "default" &&
    selectedDate &&
    meetingDurationCards.length > 0
  );

  const {
    slots,
    availableDays,
    validStartDate,
    validEndDate,
    isLoading: slotsLoading,
  } = useTimeSlots({
    durationId: type || "",
    date: shouldFetchSlots ? selectedDate : null,
    timezone: timeZone,
    enabled: shouldFetchSlots,
  });

  // Booking submission
  const { submitBooking, loading: bookingLoading } = useBookingSubmit();

  // Convert available days to numbers
  const availableDaysNumbers = availableDays?.map((day: string) => {
    const dayMap: { [key: string]: number } = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    return dayMap[day];
  }).filter((d: number | undefined) => d !== undefined) || [];

  // Current service based on selected type
  const currentService: Service | null = resolvedType ? {
    id: resolvedType,
    slug: resolvedType,
    name: meetingDurationCards.find(c => c.id === resolvedType)?.label || "",
    duration: meetingDurationCards.find(c => c.id === resolvedType)?.duration / 60 || 30,
    type: "individual",
  } : null;

  // Handlers
  const handleDurationSelect = (card: any) => {
    setDuration(card.duration / 60);
    updateTypeQuery(card.id);
    setResolvedType(card.id);
    setCurrentPhase('datetime');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (slot: V2TimeSlot) => {
    setSelectedSlot({
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    setCurrentPhase('form');
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!currentService || !selectedDate || !selectedSlot) return;

    try {
      const response = await submitBooking({
        durationId: resolvedType || "",
        date: selectedDate,
        timeSlot: {
          id: "temp",
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          available: true,
        },
        formData,
        timezone: timeZone,
        timeFormat,
      });

      setBookingResponse(response);
      setCurrentPhase('success');
    } catch (error) {
      console.error("Booking error:", error);
    }
  };

  // Error state
  if (friendlyError) {
    return (
      <>
        <MetaTags title="Error | Appointment" description="Error loading booking page" />
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="max-w-xl w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-1">Booking link not available</h2>
                <p className="text-sm">{friendlyError}</p>
                <p className="text-sm mt-3">
                  <a href="/" className="underline">Go to home</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MetaTags
        title={userInfo.name ? `${userInfo.name} | Appointment` : "Appointment"}
        description={`Book appointment with ${userInfo.name}`}
      />
      {/* Sticky Header with Back Button and Theme Toggle (only show in selection phase, not datetime/form) */}
      {currentPhase === 'selection' && (
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
          <div className="w-full max-w-7xl mx-auto px-5 md:px-6 py-4 flex items-center justify-end">
            {/* No back button in selection phase - only theme toggle */}

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
      )}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Phase 1: Duration Selection */}
        {currentPhase === 'selection' && (
          <div className="w-full h-full max-md:h-fit flex justify-center py-8">
            <div className="container max-w-[74rem] mx-auto md:p-4 md:py-8 lg:py-16 grid md:gap-12">
              <div className="grid lg:grid-cols-[360px,1fr] md:gap-8 max-md:gap-10 items-start relative rounded-lg">
                {/* Profile Section */}
                {isLoading ? (
                  <ProfileSkeleton />
                ) : (
                  <div className="w-full flex flex-col gap-4 p-4 md:p-6 max-lg:md:pt-10 md:px-4 justify-center items-center bg-gradient-to-b from-blue-100 to-transparent dark:bg-gradient-to-b dark:from-zinc-800 md:rounded-2xl">
                    <Avatar className="md:h-32 md:w-32 h-24 w-24 object-cover mb-4 md:mb-0 hover:outline outline-blue-300 dark:outline-blue-400/80 transition-all duration-100">
                      <AvatarImage
                        src={userInfo.userImage}
                        alt="Profile picture"
                        className="bg-blue-50 dark:bg-zinc-800"
                      />
                      <AvatarFallback className="text-4xl">
                        {userInfo?.name?.toString()[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="w-full flex flex-col gap-1">
                      <Typography variant="h2" className="text-3xl font-semibold">
                        <Tooltip>
                          <TooltipTrigger className="truncate w-full">
                            {userInfo.name}
                          </TooltipTrigger>
                          <TooltipContent>{userInfo.name}</TooltipContent>
                        </Tooltip>
                      </Typography>
                      {userInfo.designation && userInfo.organizationName && (
                        <Tooltip>
                          <TooltipTrigger className="w-full">
                            <Typography className="text-base text-muted-foreground">
                              {userInfo.designation} at {userInfo.organizationName}
                            </Typography>
                          </TooltipTrigger>
                          <TooltipContent>
                            {userInfo.designation} at {userInfo.organizationName}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <SocialProfiles profiles={userInfo.socialProfiles} />
                  </div>
                )}

                {/* Meeting Options */}
                <div className="space-y-6 p-4 md:p-6 md:pt-0">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-6 md:w-56" />
                      <Skeleton className="h-4 md:w-72" />
                    </>
                  ) : (
                    <div>
                      <h2 className="text-xl font-semibold mb-2">
                        Select Meeting Duration
                      </h2>
                      <p className="text-muted-foreground">
                        You will receive a calendar invite with meeting link.
                      </p>
                    </div>
                  )}
                  {/* meeting cards */}
                  <div className="grid sm:grid-cols-2 gap-4 h-full lg:pb-5 overflow-y-auto py-3">
                    {isLoading ? (
                      <>
                        <MeetingCardSkeleton />
                        <MeetingCardSkeleton />
                        <MeetingCardSkeleton />
                      </>
                    ) : (
                      meetingDurationCards.map((card) => (
                        <MeetingCard
                          key={card.id}
                          title={card.label}
                          duration={card.duration / 60}
                          onClick={() => handleDurationSelect(card)}
                        />
                      ))
                    )}
                  </div>
                  <div className="mt-4 p-3 md:hidden bg-gray-50 dark:bg-card rounded-2xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <Info className="text-amber-500 size-10" />
                      <p>
                        All times are in your local timezone. Meetings can be
                        rescheduled if needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Date & Time Selection */}
        {currentPhase === 'datetime' && currentService && (
          <div className="py-8 px-4">
            <DateTimeSelector
              selectedDate={selectedDate}
              displayMonth={displayMonth}
              onDateSelect={handleDateSelect}
              onMonthChange={setDisplayMonth}
              availableDays={availableDaysNumbers}
              minDate={validStartDate}
              maxDate={validEndDate}
              availableSlots={slots}
              selectedSlot={selectedSlot ? {
                id: "temp",
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                available: true,
              } : null}
              onSlotSelect={handleSlotSelect}
              timeFormat={timeFormat}
              onTimeFormatChange={setTimeFormat}
              timezone={timeZone}
              loading={slotsLoading}
              serviceName={currentService.name}
              duration={currentService.duration}
              onBack={() => {
                setCurrentPhase('selection');
                navigate(`/schedule/in/${meetId}`);
              }}
            />
          </div>
        )}

        {/* Phase 3: Booking Form */}
        {currentPhase === 'form' && currentService && selectedSlot && (
          <div className="py-8 px-4">
            <BookingForm
              service={currentService}
              selectedDate={selectedDate}
              selectedSlot={{
                id: "temp",
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                available: true,
              }}
              timeFormat={timeFormat}
              timezone={timeZone}
              onSubmit={handleBookingSubmit}
              onBack={() => setCurrentPhase('datetime')}
              loading={bookingLoading}
            />
          </div>
        )}

        {/* Phase 4: Confirmation Modal */}
        {currentPhase === 'success' && bookingResponse && currentService && selectedSlot && (
          <ConfirmationModal
            open={true}
            onClose={() => {
              setCurrentPhase('selection');
              navigate(`/schedule/in/${meetId}`);
            }}
            bookingResponse={bookingResponse}
            service={currentService}
            selectedDate={selectedDate}
            selectedSlot={{
              id: "temp",
              start_time: selectedSlot.start_time,
              end_time: selectedSlot.end_time,
              available: true,
            }}
            timeFormat={timeFormat}
            timezone={timeZone}
            userEmail={bookingResponse.userEmail || ""}
          />
        )}

        {/* Powered By Footer */}
        <div className="mt-8 pb-16">
          <PoweredBy />
        </div>
      </div>
    </>
  );
};

export default AppointmentV2;

