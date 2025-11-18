/**
 * Complete Booking Flow - All phases integrated
 * Phase 1: Discover (ServiceSelector)
 * Phase 2: Select (DateTimeSelector)
 * Phase 3: Confirm (BookingForm)
 * Phase 4: Complete (ConfirmationModal)
 */

import { useEffect } from "react";
import { useBookingState } from "./hooks/useBookingState";
import { ServiceSelector } from "./components/ServiceSelector";
import { DateTimeSelector } from "./components/DateTimeSelector";
import { BookingForm } from "./components/BookingForm";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { addDays } from "./utils/dateHelpers";
import type { Service, TimeSlot, BookingFormData, BookingResponse } from "./types";

interface BookingFlowProps {
  // Initial data (can come from URL params or props)
  organizationSlug?: string;
  serviceSlug?: string;
  meetId?: string;
  
  // Callbacks for API integration
  onFetchOrganization?: (slug: string) => Promise<any>;
  onFetchServices?: (orgSlug: string) => Promise<Service[]>;
  onFetchTimeSlots?: (params: {
    serviceId: string;
    date: string;
    timezone: string;
  }) => Promise<TimeSlot[]>;
  onSubmitBooking?: (data: {
    serviceId: string;
    date: string;
    timeSlot: TimeSlot;
    formData: BookingFormData;
  }) => Promise<BookingResponse>;
}

export default function BookingFlow({
  organizationSlug,
  serviceSlug,
  meetId,
  onFetchOrganization,
  onFetchServices,
  onFetchTimeSlots,
  onSubmitBooking,
}: BookingFlowProps) {
  const {
    state,
    setOrganization,
    setService,
    setDate,
    setSlot,
    setTimeFormat,
    setFormData,
    goToPhase,
    resetBooking,
    dispatch,
  } = useBookingState();

  // Initialize based on URL params
  useEffect(() => {
    if (organizationSlug && onFetchOrganization) {
      // Fetch organization data
      onFetchOrganization(organizationSlug).then((org) => {
        setOrganization(org);
      });
    }

    if (serviceSlug && organizationSlug && onFetchServices) {
      // Fetch specific service
      onFetchServices(organizationSlug).then((services) => {
        const service = services.find((s) => s.slug === serviceSlug);
        if (service) {
          setService(service);
        }
      });
    }
  }, [organizationSlug, serviceSlug, meetId]);

  // Handle service selection
  const handleServiceSelect = (service: Service) => {
    setService(service);
    // This will automatically transition to 'select' phase
  };

  // Handle date selection and fetch time slots
  const handleDateSelect = async (date: Date) => {
    setDate(date);
    
    if (onFetchTimeSlots && state.service) {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const slots = await onFetchTimeSlots({
          serviceId: state.service.id,
          date: date.toISOString().split("T")[0],
          timezone: state.timezone,
        });
        // Store slots in state (you may need to add this to state management)
        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: error as Error });
      }
    }
  };

  // Handle time slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    setSlot(slot);
    // This will automatically transition to 'confirm' phase
  };

  // Handle booking submission
  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!state.service || !state.selectedDate || !state.selectedSlot) {
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = onSubmitBooking
        ? await onSubmitBooking({
            serviceId: state.service.id,
            date: state.selectedDate.toISOString().split("T")[0],
            timeSlot: state.selectedSlot,
            formData,
          })
        : {
            // Mock response for demo
            success: true,
            message: "Booking confirmed successfully!",
            bookingId: `BK-${Date.now()}`,
            meetLink: "https://meet.google.com/abc-defg-hij",
            calendarEventUrl: "https://calendar.google.com/...",
            rescheduleUrl: "/reschedule/abc123",
            meetingProvider: "Google Meet",
          };

      dispatch({ type: "SET_BOOKING_RESPONSE", payload: response });
      // This will automatically transition to 'complete' phase
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error as Error });
    }
  };

  // Render based on current phase
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      {/* Phase 1: Discover - Service Selection */}
      {state.phase === "discover" && state.organization && (
        <ServiceSelector
          organization={state.organization}
          services={state.organization.services}
          onServiceSelect={handleServiceSelect}
          loading={state.loading}
        />
      )}

      {/* Phase 2: Select - Date & Time Selection */}
      {state.phase === "select" && state.service && (
        <DateTimeSelector
          selectedDate={state.selectedDate}
          displayMonth={state.displayMonth}
          onDateSelect={handleDateSelect}
          onMonthChange={(date) =>
            dispatch({ type: "SET_DISPLAY_MONTH", payload: date })
          }
          availableDays={[1, 2, 3, 4, 5]} // Monday to Friday (example)
          minDate={new Date()}
          maxDate={addDays(new Date(), 60)}
          availableSlots={[]} // Fetched slots would go here
          selectedSlot={state.selectedSlot}
          onSlotSelect={handleSlotSelect}
          timeFormat={state.timeFormat}
          onTimeFormatChange={setTimeFormat}
          timezone={state.timezone}
          loading={state.loading}
          serviceName={state.service.name}
          providerName={state.service.provider?.name}
          duration={state.service.duration}
          onBack={() => goToPhase("discover")}
        />
      )}

      {/* Phase 3: Confirm - Booking Form */}
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
            loading={state.loading}
          />
        )}

      {/* Phase 4: Complete - Confirmation Modal */}
      {state.phase === "complete" &&
        state.bookingResponse &&
        state.service &&
        state.selectedDate &&
        state.selectedSlot && (
          <ConfirmationModal
            open={true}
            onClose={() => {
              resetBooking();
              goToPhase("discover");
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

      {/* Error State */}
      {state.error && (
        <div className="max-w-2xl mx-auto mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {state.error.message}
          </p>
          <button
            onClick={() => dispatch({ type: "SET_ERROR", payload: null })}
            className="text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

