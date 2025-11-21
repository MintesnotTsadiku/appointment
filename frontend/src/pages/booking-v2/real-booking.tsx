/**
 * Real Booking Page - Connected to Frappe API
 * For organization bookings: /schedule/org/:orgSlug/:serviceSlug
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ServiceSelector } from "./components/ServiceSelector";
import { DateTimeSelector } from "./components/DateTimeSelector";
import { BookingForm } from "./components/BookingForm";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { useBookingState } from "./hooks/useBookingState";
import { useOrganizationData } from "./hooks/useOrganizationData";
import { useTimeSlots } from "./hooks/useTimeSlots";
import { useBookingSubmit } from "./hooks/useBookingSubmit";
import { getTimeOfDay } from "./utils/dateHelpers";
import type { Service, TimeSlot, BookingFormData } from "./types";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";

export default function RealBooking() {
  const { orgSlug, serviceSlug } = useParams<{
    orgSlug: string;
    serviceSlug?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [displayMonth, setDisplayMonth] = useState(new Date());

  const {
    state,
    setOrganization,
    setService,
    setDate,
    setSlot,
    setTimeFormat,
    goToPhase,
    dispatch,
    resetBooking,
  } = useBookingState();

  // Get reschedule params from URL
  const reschedule = searchParams.get("reschedule") || undefined;
  const eventToken = searchParams.get("event_token") || undefined;

  // Fetch organization data
  const {
    organization,
    services,
    selectedService,
    organizationId,
    serviceId,
    durations,
    isLoading: orgLoading,
    error: orgError,
  } = useOrganizationData({
    orgSlug: orgSlug || "",
    serviceSlug,
  });

  // Fetch time slots (only when we have a service and date)
  const shouldFetchSlots = !!(
    state.service &&
    state.selectedDate &&
    durations.length > 0
  );

  const {
    slots,
    availableDays,
    validStartDate,
    validEndDate,
    isLoading: slotsLoading,
    error: slotsError,
  } = useTimeSlots({
    durationId: durations[0]?.id || "",
    date: state.selectedDate,
    timezone: state.timezone,
    organizationId,
    serviceId,
    enabled: shouldFetchSlots,
  });

  // Booking submission
  const { submitBooking, loading: bookingLoading } = useBookingSubmit();

  // Set organization data when loaded
  useEffect(() => {
    if (organization) {
      setOrganization(organization);
    }
  }, [organization, setOrganization]);

  // Handle service selection or auto-select if coming directly to service
  useEffect(() => {
    if (serviceSlug && selectedService && !state.service) {
      setService(selectedService);
      goToPhase("select");
    }
  }, [serviceSlug, selectedService, state.service, setService, goToPhase]);

  // Show errors
  useEffect(() => {
    if (orgError) {
      toast.error("Failed to load organization data", {
        description: orgError.message || "Please try again later",
      });
    }
  }, [orgError]);

  useEffect(() => {
    if (slotsError) {
      toast.error("Failed to load available time slots", {
        description: slotsError.message || "Please try again later",
      });
    }
  }, [slotsError]);

  // Handle service selection from ServiceSelector
  const handleServiceSelect = (service: Service) => {
    // Navigate to service-specific URL
    navigate(`/schedule/org/${orgSlug}/${service.slug}`);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setDate(date);
  };

  // Handle time slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    setSlot(slot);
    goToPhase("confirm");
  };

  // Handle booking submission
  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!state.service || !state.selectedDate || !state.selectedSlot) {
      toast.error("Missing booking information");
      return;
    }

    try {
      const response = await submitBooking({
        durationId: durations[0]?.id || "",
        date: state.selectedDate,
        timeSlot: state.selectedSlot,
        formData,
        timezone: state.timezone,
        timeFormat: state.timeFormat,
        organizationId,
        serviceId,
        reschedule,
        eventToken,
      });

      // Store booking response and show confirmation
      dispatch({ type: "SET_BOOKING_RESPONSE", payload: response });
      goToPhase("complete");

      // Show success toast
      toast.success("Booking confirmed!", {
        description: "Check your email for the calendar invite",
      });
    } catch (error) {
      toast.error("Booking failed", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        icon: <CircleAlert className="h-5 w-5" />,
      });
    }
  };

  // Loading state
  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading booking page...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (orgError && !organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CircleAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Booking Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The booking page you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Convert available days from strings to numbers
  const availableDaysNumbers = availableDays
    .map((day) => {
      // Backend returns days like "Monday", "Tuesday", etc.
      const dayMap: { [key: string]: number } = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      return dayMap[day];
    })
    .filter((day) => day !== undefined);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      {/* Phase 1: Service Selection */}
      {state.phase === "discover" && organization && services.length > 0 && (
        <ServiceSelector
          organization={organization}
          services={services}
          onServiceSelect={handleServiceSelect}
          loading={false}
        />
      )}

      {/* Phase 2: Date & Time Selection */}
      {state.phase === "select" && state.service && (
        <DateTimeSelector
          selectedDate={state.selectedDate}
          displayMonth={displayMonth}
          onDateSelect={handleDateSelect}
          onMonthChange={setDisplayMonth}
          availableDays={availableDaysNumbers}
          minDate={validStartDate}
          maxDate={validEndDate}
          availableSlots={slots}
          selectedSlot={state.selectedSlot}
          onSlotSelect={handleSlotSelect}
          timeFormat={state.timeFormat}
          onTimeFormatChange={setTimeFormat}
          timezone={state.timezone}
          loading={slotsLoading}
          serviceName={state.service.name}
          providerName={state.service.provider?.name}
          duration={state.service.duration}
          onBack={() => {
            // Go back to service selection or homepage
            if (services.length > 1) {
              goToPhase("discover");
              navigate(`/schedule/org/${orgSlug}`);
            } else {
              navigate("/");
            }
          }}
        />
      )}

      {/* Phase 3: Booking Form */}
      {state.phase === "confirm" &&
        state.service &&
        state.selectedDate &&
        state.selectedSlot && (
          <BookingForm
            service={state.service}
            selectedDate={state.selectedDate}
            selectedSlot={state.selectedSlot}
            timeFormat={state.timeFormat}
            timezone={state.timezone}
            initialData={state.formData}
            onSubmit={handleBookingSubmit}
            onBack={() => goToPhase("select")}
            loading={bookingLoading}
          />
        )}

      {/* Phase 4: Confirmation Modal */}
      {state.phase === "complete" &&
        state.bookingResponse &&
        state.service &&
        state.selectedDate &&
        state.selectedSlot && (
          <ConfirmationModal
            open={true}
            onClose={() => {
              resetBooking();
              navigate(`/schedule/org/${orgSlug}`);
            }}
            bookingResponse={state.bookingResponse}
            service={state.service}
            selectedDate={state.selectedDate}
            selectedSlot={state.selectedSlot}
            timeFormat={state.timeFormat}
            timezone={state.timezone}
            userEmail={state.formData.userEmail || ""}
          />
        )}
    </div>
  );
}

