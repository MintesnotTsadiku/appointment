/**
 * Hook to fetch time slots from Frappe API
 * Connects to: appointment.api.personal_meet.get_time_slots
 */

import { useFrappeGetCall } from "frappe-react-sdk";
import { useEffect, useState } from "react";
import { getTimeZoneOffsetFromTimeZoneString } from "@/lib/utils";
import type { TimeSlot } from "../types";

interface UseTimeSlotsParams {
  durationId: string;
  date: Date | null;
  timezone: string;
  organizationId?: string;
  serviceId?: string;
  enabled?: boolean;
}

interface TimeSlotsResponse {
  all_available_slots_for_data: Array<{
    start_time: string;
    end_time: string;
    provider_id?: string;
    provider_name?: string;
    booked?: boolean; // Support for booked status from backend
    available?: boolean; // Support for availability from backend
  }>;
  available_days: string[];
  valid_start_date: string;
  valid_end_date?: string;
  duration: string;
  is_invalid_date: boolean;
  next_valid_date?: string;
  total_slots_for_day: number;
  is_organization?: boolean;
  provider_count?: number;
  debug_messages?: string[];
  booking_config?: {
    disable_past_slots_by: string;
    minimum_booking_notice: number;
    show_booked_slots: boolean;
  };
}

export function useTimeSlots({
  durationId,
  date,
  timezone,
  organizationId,
  serviceId,
  enabled = true,
}: UseTimeSlotsParams) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  // Format date for API (YYYY-M-D format that backend expects)
  const formattedDate = date
    ? new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).format(date)
    : null;

  // Build API parameters
  const apiParams = formattedDate && durationId
    ? {
        duration_id: durationId,
        date: formattedDate,
        user_timezone_offset: String(
          getTimeZoneOffsetFromTimeZoneString(timezone || "UTC")
        ),
        ...(organizationId && serviceId
          ? {
              organization_id: organizationId,
              service_id: serviceId,
            }
          : {}),
      }
    : null;

  // Fetch time slots from API
  const { data, isLoading, error, mutate } = useFrappeGetCall<{
    message: TimeSlotsResponse;
  }>(
    "appointment.api.personal_meet.get_time_slots",
    apiParams,
    apiParams ? undefined : null, // Don't make call if params are null
    {
      revalidateOnFocus: false,
      errorRetryCount: 3,
      shouldRetryOnError: true,
    }
  );

  // Transform API response to TimeSlot format
  useEffect(() => {
    if (data?.message?.all_available_slots_for_data) {
      const now = new Date();
      
      // Get booking configuration from backend
      const config = data.message.booking_config || {
        disable_past_slots_by: "start_time",
        minimum_booking_notice: 0,
        show_booked_slots: true,
      };
      
      // Apply minimum booking notice
      const minimumBookingTime = new Date(now.getTime() + (config.minimum_booking_notice * 60 * 1000));
      
      const transformedSlots: TimeSlot[] =
        data.message.all_available_slots_for_data.map((slot, index) => {
          // Check if slot is in the past
          // Parse the slot time (backend sends ISO format with timezone)
          const slotStartTime = new Date(slot.start_time);
          const slotEndTime = new Date(slot.end_time);
          
          // Apply configuration for past slot detection
          // Check against minimum booking time (now + minimum_booking_notice)
          const isPast = config.disable_past_slots_by === "start_time"
            ? slotStartTime < minimumBookingTime
            : slotEndTime <= minimumBookingTime;
          
          // Check if slot is booked (from backend) or explicitly marked as unavailable
          const isBooked = slot.booked === true;
          const isAvailableFromBackend = slot.available !== undefined ? slot.available : true;
          
          // All debugging moved to Debug Panel - no console clutter
          
          // Slot is available only if:
          // 1. Not in the past (hasn't ended yet)
          // 2. Not booked
          // 3. Backend says it's available
          const isAvailable = !isPast && !isBooked && isAvailableFromBackend;

          return {
            id: `slot-${index}-${slot.start_time}`,
            start_time: slot.start_time,
            end_time: slot.end_time,
            provider: slot.provider_id && slot.provider_name ? {
              id: slot.provider_id,
              name: slot.provider_name,
            } : undefined,
            available: isAvailable,
            isPast,
            booked: isBooked,
            // Mark some slots as recommended (first available slot)
            recommended: index === 2 && isAvailable, // 3rd available slot as recommended
          };
        });

      setSlots(transformedSlots);
    } else if (data && !data.message?.all_available_slots_for_data) {
      // Only clear slots if we explicitly got an empty response
      // Don't clear during loading/refetch when data is undefined
      setSlots([]);
    }
    // If data is undefined (loading/refetch), keep previous slots - don't clear!
  }, [data]);

  return {
    slots,
    availableDays: data?.message?.available_days || [],
    validStartDate: data?.message?.valid_start_date
      ? new Date(data.message.valid_start_date)
      : undefined,
    validEndDate: data?.message?.valid_end_date
      ? new Date(data.message.valid_end_date)
      : undefined,
    duration: data?.message?.duration,
    isInvalidDate: data?.message?.is_invalid_date || false,
    nextValidDate: data?.message?.next_valid_date
      ? new Date(data.message.next_valid_date)
      : undefined,
    isOrganization: data?.message?.is_organization,
    providerCount: data?.message?.provider_count,
    isLoading,
    error,
    refetch: mutate,
    // Debug data - raw API response
    rawApiData: data?.message,
    bookingConfig: data?.message?.booking_config || {
      disable_past_slots_by: "start_time",
      minimum_booking_notice: 0,
      show_booked_slots: true,
    },
  };
}
