/**
 * Hook to submit bookings to Frappe API
 * Connects to: appointment.api.personal_meet.book_time_slot
 */

import { useRef } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { getTimeZoneOffsetFromTimeZoneString, parseFrappeErrorMsg } from "@/lib/utils";
import type { BookingFormData, BookingResponse, TimeSlot } from "../types";

interface SubmitBookingParams {
  durationId: string;
  date: Date;
  timeSlot: TimeSlot;
  formData: BookingFormData;
  timezone: string;
  timeFormat: "12h" | "24h" | "ethiopian";
  organizationId?: string;
  serviceId?: string;
  reschedule?: string;
  eventToken?: string;
}

interface BookingApiResponse {
  message: {
    success: boolean;
    message: string;
    booking_id?: string;
    meet_link?: string;
    google_calendar_event_url?: string;
    reschedule_url?: string;
    meeting_provider?: string;
  };
}

export function useBookingSubmit() {
  const attempt = useRef<{ payload: string; key: string }>();
  const { call: bookMeeting, loading, error, reset } = useFrappePostCall<BookingApiResponse>(
    "appointment.api.personal_meet.book_time_slot"
  );

  const submitBooking = async (
    params: SubmitBookingParams
  ): Promise<BookingResponse> => {
    const {
      durationId,
      date,
      timeSlot,
      formData,
      timezone,
      timeFormat,
      organizationId,
      serviceId,
      reschedule,
      eventToken,
    } = params;

    // Format date for API (YYYY-M-D format)
    const formattedDate = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(date);

    // Build API payload
    const meetingData: Record<string, any> = {
      duration_id: durationId,
      date: formattedDate,
      user_timezone_offset: String(
        getTimeZoneOffsetFromTimeZoneString(timezone)
      ),
      start_time: timeSlot.start_time,
      end_time: timeSlot.end_time,
      user_name: formData.userName,
      user_email: formData.userEmail,
      other_participants: formData.otherParticipants || "",
      notes: formData.notes || "",
      time_format: timeFormat,
    };

    // Add phone if provided
    if (formData.userPhone) {
      meetingData.user_phone = formData.userPhone;
    }

    // Add organization/service info if provided
    if (organizationId) {
      meetingData.organization_id = organizationId;
    }
    if (serviceId) {
      meetingData.service_id = serviceId;
    }

    // Add provider info if slot has a provider (multi-provider booking)
    if (timeSlot.provider?.id) {
      meetingData.provider_id = timeSlot.provider.id;
    }

    // Add reschedule info if provided
    if (reschedule) {
      meetingData.reschedule = reschedule;
    }
    if (eventToken) {
      meetingData.event_token = eventToken;
    }

    const payloadIdentity = JSON.stringify(meetingData);
    if (!attempt.current || attempt.current.payload !== payloadIdentity) {
      attempt.current = { payload: payloadIdentity, key: crypto.randomUUID() };
    }
    meetingData.request_id = attempt.current.key;
    try {
      // Submit booking
      const response = await bookMeeting(meetingData);

      // Transform response to BookingResponse format
      const bookingResponse: BookingResponse = {
        success: response.message.success,
        message: response.message.message,
        bookingId: response.message.booking_id,
        meetLink: response.message.meet_link,
        calendarEventUrl: response.message.google_calendar_event_url,
        rescheduleUrl: response.message.reschedule_url,
        meetingProvider: response.message.meeting_provider,
      };

      return bookingResponse;
    } catch (err) {
      // Parse Frappe error message
      const errorMessage = parseFrappeErrorMsg(err);

      // Throw error with parsed message
      throw new Error(errorMessage || "Failed to book appointment");
    }
  };

  return {
    submitBooking,
    loading,
    error,
    reset,
  };
}
