import { useMemo } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import type { TimeSlot } from '@/pages/booking-v2/types';

interface SlotsResponse {
  all_available_slots_for_data: { start_time: string; end_time: string; available: boolean }[];
}

/** Free slots for one offering on one day, from the public booking API. */
export function useOfferingSlots(offering: string, organization: string, date: Date | null, quantity = 1) {
  const day = date ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : null;
  const { data, isLoading } = useFrappeGetCall<{ message: SlotsResponse }>(
    'appointment.scheduler.booking.slots',
    day ? { offering_id: offering, date: day, organization_id: organization, ...(quantity > 1 ? { quantity } : {}) } : undefined,
    day ? `manage-slots-${offering}-${day}-${quantity}` : null,
    { revalidateOnFocus: false }
  );
  const slots = useMemo<TimeSlot[]>(() => {
    const now = Date.now();
    return (data?.message?.all_available_slots_for_data ?? []).map((slot, index) => ({
      id: `slot-${index}-${slot.start_time}`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      available: slot.available && new Date(slot.start_time).getTime() > now,
    }));
  }, [data]);
  return { slots, loading: isLoading };
}
