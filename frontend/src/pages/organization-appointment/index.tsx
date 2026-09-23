/**
 * Organization Appointment V2 - Premium Design System
 * Uses new redesigned UI with exact same API integration as old version
 * Compatible with existing AppContext and URL structure
 * 
 * Design: Premium "100 Million Startup" aesthetic with:
 * - Dark mode foundation with ambient background glows
 * - Glass-morphism effects with backdrop-blur
 * - Smooth Framer Motion animations
 * - Gradient icons and cards
 * - Dynamic CSS variables from theme system
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/app";
import { getLocalTimezone } from "@/lib/utils";
import { Info, Moon, Sun, ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/button";
import MetaTags from "@/components/meta-tags";
import PoweredBy from "@/components/powered-by";

// Import new V2 components
import { ServiceSelector } from "@/pages/booking-v2/components/ServiceSelector";
import { DateTimeSelector } from "@/pages/booking-v2/components/DateTimeSelector";
import { BookingForm } from "@/pages/booking-v2/components/BookingForm";
import { ConfirmationModal } from "@/pages/booking-v2/components/ConfirmationModal";
import { useTimeSlots } from "@/pages/booking-v2/hooks/useTimeSlots";
import { useBookingSubmit } from "@/pages/booking-v2/hooks/useBookingSubmit";
import type { Organization, Service, TimeSlot as V2TimeSlot, BookingFormData } from "@/pages/booking-v2/types";

// Import old components for fallback
import { ProfileSkeleton } from "@/pages/appointment/components/skeletons";

const OrganizationAppointmentV2 = () => {
  const { orgSlug, serviceSlug } = useParams();
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
  const [currentPhase, setCurrentPhase] = useState<'service' | 'datetime' | 'form' | 'success'>('service');
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h' | 'ethiopian'>('12h');
  const [bookingResponse, setBookingResponse] = useState<any>(null);
  const { theme, setTheme } = useTheme();

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  // Get type from URL (this is how old implementation works)
  const type = searchParams.get("type");

  // EXACT SAME API calls as old implementation
  const apiEndpoint = orgSlug && serviceSlug 
    ? "appointment.api.personal_meet.get_organization_meeting_windows"
    : orgSlug 
    ? "appointment.api.personal_meet.get_organization_services"
    : null;
    
  const apiParams = orgSlug && serviceSlug
    ? { org_slug: orgSlug, service_slug: serviceSlug }
    : orgSlug
    ? { org_slug: orgSlug }
    : undefined;
    
  const { data, isLoading, error } = useFrappeGetCall(
    apiEndpoint,
    apiParams,
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 3,
    }
  );

  // Initialize timezone (same as old implementation)
  useEffect(() => {
    if (orgSlug && serviceSlug) {
      setMeetingId(`${orgSlug}/${serviceSlug}`);
    }
    setTimeZone(getLocalTimezone());
  }, [orgSlug, serviceSlug]);

  // Process API response (same as old implementation)
  useEffect(() => {
    if (data) {
      // Check if response contains an error
      if (data?.message?.error) {
        const errorMsg = typeof data.message.error === 'string' 
          ? data.message.error 
          : JSON.stringify(data.message.error);
        setFriendlyError(errorMsg);
        return;
      }
      
      // Only process if we have valid data
      if (!data?.message?.full_name && !data?.message?.company) {
        setFriendlyError("Invalid response from server");
        return;
      }
      
      setUserInfo({
        name: data?.message?.full_name,
        designation: data?.message?.position,
        organizationName: data?.message?.company,
        userImage: data?.message?.profile_pic,
        socialProfiles: [],
        meetingProvider: data?.message?.meeting_provider,
        banner_image: data?.message?.banner_image,
      });
      
      if (data?.message?.durations) {
        setMeetingDurationCards(data?.message?.durations);
        
        // If we have a serviceSlug and no type, auto-select the first duration
        if (serviceSlug && data?.message?.durations?.length > 0 && !type) {
          const firstDurationId = data.message.durations[0].id;
          // Update URL with type parameter
          setSearchParams({ type: firstDurationId });
        }
        
        // If we have a serviceSlug and type, move to datetime phase
        if (serviceSlug && type && data?.message?.durations?.length > 0) {
          setCurrentPhase('datetime');
        }
      }
      
      setFriendlyError("");
    }
  }, [data, serviceSlug, type]);

  useEffect(() => {
    if (error) {
      // Handle error object properly - extract string message
      let errorMessage = "Failed to load booking page";
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = String(error.message);
      } else if (error?.exception) {
        errorMessage = String(error.exception);
      } else if (typeof error === 'object' && error !== null) {
        // If error is an object, try to extract a message or stringify safely
        if ('error' in error) {
          errorMessage = String(error.error);
        } else {
          errorMessage = "An error occurred. Please try again.";
        }
      }
      setFriendlyError(errorMessage);
    }
  }, [error]);

  // Fetch time slots using new hook
  const shouldFetchSlots = !!(
    serviceSlug &&
    type &&
    selectedDate &&
    meetingDurationCards.length > 0
  );

  const {
    slots,
    availableDays,
    validStartDate,
    validEndDate,
    isLoading: slotsLoading,
    refetch: refetchSlots,
    rawApiData,
    bookingConfig,
  } = useTimeSlots({
    durationId: type || meetingDurationCards[0]?.id || "",
    date: shouldFetchSlots ? selectedDate : null,
    timezone: timeZone,
    organizationId: data?.message?.error ? undefined : data?.message?.organization_id,
    serviceId: data?.message?.error ? undefined : data?.message?.service_id,
    enabled: shouldFetchSlots && !data?.message?.error,
  });

  // Booking submission
  const { submitBooking, loading: bookingLoading } = useBookingSubmit();

  // Transform data for V2 components
  const organization: Organization | null = data && !data?.message?.error ? {
    id: orgSlug || "",
    slug: orgSlug || "",
    name: data.message.company || data.message.full_name || "",
    logo: data.message.profile_pic,
    banner: data.message.banner_image,
    description: data.message.description || "",
    providers: data.message.providers?.map((p: any) => ({
      id: p.id || p.name,
      name: p.name,
      designation: data.message.position,
      services: p.services,
    })) || [],
    services: data.message.services?.map((s: any) => ({
      id: s.service_id || s.slug || s.name, // Use slug or name as fallback
      slug: s.slug,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      currency: "ETB",
      type: s.type,
      provider: s.provider_id ? {
        id: s.provider_id,
        name: s.provider_name,
      } : undefined,
      providerCount: s.provider_id ? 1 : data.message.provider_count,
    })) || [],
  } : null;

  const currentService: Service | null = serviceSlug && data && !data?.message?.error ? {
    id: data.message.service_id || serviceSlug,
    slug: serviceSlug,
    name: data.message.service_name || serviceSlug,
    duration: meetingDurationCards[0]?.duration || 30,
    type: "organization",
    providerCount: data.message.provider_count,
    location: data.message.location, // Add location information
  } : null;

  // Convert available days to numbers
  const availableDaysNumbers = availableDays?.map((day: string) => {
    const dayMap: { [key: string]: number } = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    return dayMap[day];
  }).filter((d: number | undefined) => d !== undefined) || [];

  // Handlers
  const handleServiceSelect = (service: Service) => {
    // Navigate with service slug (same as old implementation)
    navigate(`/schedule/org/${orgSlug}/${service.slug}`);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (slot: V2TimeSlot) => {
    // Convert V2 slot format to old format (preserve provider info!)
    setSelectedSlot({
      start_time: slot.start_time,
      end_time: slot.end_time,
      provider: slot.provider, // IMPORTANT: Pass provider for multi-provider bookings
    });
    setCurrentPhase('form');
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!currentService || !selectedDate || !selectedSlot) return;

    try {
      const response = await submitBooking({
        durationId: type || meetingDurationCards[0]?.id || "",
        date: selectedDate,
        timeSlot: {
          id: "temp",
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          available: true,
          provider: selectedSlot.provider, // Pass provider from selected slot
        },
        formData,
        timezone: timeZone,
        timeFormat,
        organizationId: data?.message?.error ? undefined : data?.message?.organization_id,
        serviceId: data?.message?.error ? undefined : data?.message?.service_id,
      });

      // Re-fetch slots after successful booking to update availability
      if (refetchSlots) {
        await refetchSlots();
      }

      setBookingResponse({ ...response, userEmail: formData.userEmail });
      setCurrentPhase('success');
    } catch (error) {
      console.error("Booking error:", error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="min-h-screen text-[var(--text-primary)]"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Ambient background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--glow-primary)' }}
          />
          <div 
            className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--glow-secondary)' }}
          />
          <div 
            className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--glow-success)' }}
          />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error || friendlyError) {
    const errorMessage = typeof friendlyError === 'string' 
      ? friendlyError 
      : String(friendlyError || 'Page not found');
    
    return (
      <>
        <MetaTags title="Error | Appointment" description="Error loading booking page" />
        <div 
          className="min-h-screen text-[var(--text-primary)] flex items-center justify-center p-8"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          {/* Ambient background effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
              style={{ backgroundColor: 'var(--glow-primary)' }}
            />
            <div 
              className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
              style={{ backgroundColor: 'var(--glow-secondary)' }}
            />
            <div 
              className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
              style={{ backgroundColor: 'var(--glow-success)' }}
            />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-xl w-full rounded-2xl p-6 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="inline-flex p-2 rounded-lg bg-gradient-primary">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                  Booking link not available
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{errorMessage}</p>
                <p className="text-sm mt-3">
                  <a href="/" className="underline" style={{ color: 'var(--accent-primary)' }}>
                    Go to home
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <MetaTags
        title={`${userInfo?.name || "Book Appointment"} | Scheduler`}
        description={`Schedule an appointment with ${userInfo?.name || "us"}`}
      />
      {/* Sticky Header with Back Button and Theme Toggle (only show in service phase, not datetime/form) */}
      {currentPhase === 'service' && (
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
            {/* No back button in service phase - only theme toggle */}

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
      <div 
        className="min-h-screen text-[var(--text-primary)] pb-16"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Ambient background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--glow-primary)' }}
          />
          <div 
            className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--glow-secondary)' }}
          />
          <div 
            className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
            style={{ backgroundColor: 'var(--glow-success)' }}
          />
        </div>

        <div className="relative z-10">
        {/* Phase 1: Service Selection */}
          <AnimatePresence mode="wait">
        {currentPhase === 'service' && organization && !serviceSlug && (
              <motion.div
                key="service"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="py-8 px-4"
              >
            <ServiceSelector
              organization={organization}
              services={organization.services}
              onServiceSelect={handleServiceSelect}
              loading={false}
            />
              </motion.div>
        )}
          </AnimatePresence>

        {/* Phase 2: Date & Time Selection */}
          <AnimatePresence mode="wait">
        {currentPhase === 'datetime' && currentService && (
              <motion.div
                key="datetime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="py-8 px-4"
              >
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
              location={currentService.location}
              onBack={() => {
                if (organization?.services && organization.services.length > 1) {
                  setCurrentPhase('service');
                  navigate(`/schedule/org/${orgSlug}`);
                } else {
                  navigate("/");
                }
              }}
              rawApiData={rawApiData}
              bookingConfig={bookingConfig}
            />
              </motion.div>
        )}
          </AnimatePresence>

        {/* Phase 3: Booking Form */}
          <AnimatePresence mode="wait">
        {currentPhase === 'form' && currentService && selectedSlot && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="py-8 px-4"
              >
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
              onBack={() => {
                // Re-fetch slots when going back to datetime selection
                if (refetchSlots) {
                  refetchSlots();
                }
                setCurrentPhase('datetime');
              }}
              loading={bookingLoading}
            />
              </motion.div>
        )}
          </AnimatePresence>

        {/* Phase 4: Confirmation Modal */}
          <AnimatePresence>
        {currentPhase === 'success' && bookingResponse && currentService && selectedSlot && (
          <ConfirmationModal
            open={true}
            onClose={() => {
              // Go back to datetime phase and refetch slots to show updated availability
              if (refetchSlots) {
                refetchSlots();
              }
              setCurrentPhase('datetime');
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
          </AnimatePresence>

        {/* Powered By Footer */}
          <div className="mt-8 relative z-10">
          <PoweredBy />
          </div>
        </div>
      </div>
    </>
  );
};

export default OrganizationAppointmentV2;
