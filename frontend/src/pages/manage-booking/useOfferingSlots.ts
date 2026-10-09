import { useMemo } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import type { TimeSlot } from '@/pages/booking-v2/types';
import { SELF_SERVICE_API, ownerParams, type ManageView } from './types';

interface SlotsResponse {
  all_available_slots_for_data: { start_time: string; end_time: string; available: boolean }[];
}

/** Free slots for the booking's own offering on one day. The manage token authorizes it, so an unpublished offering still has times. */
export function useOfferingSlots(view: ManageView, date: Date | null) {
  const day = date ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : null;
  const quantity = view.booking.quantity ?? 1;
  const { data, isLoading } = useFrappeGetCall<{ message: SlotsResponse }>(
    `${SELF_SERVICE_API}.slots`,
    day ? { token: view.token, date: day, ...ownerParams(view), ...(quantity > 1 ? { quantity } : {}) } : undefined,
    day ? `manage-slots-${view.token}-${day}-${quantity}` : null,
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
