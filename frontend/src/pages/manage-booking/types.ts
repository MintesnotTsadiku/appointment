import type { LocationType, OnlineSession } from '@/lib/online-session';
import { amharicOr, type LocalNames } from '@/lib/local-names';

/** Shapes returned by appointment.scheduler.self_service. */
export const SELF_SERVICE_API = 'appointment.scheduler.self_service';

export interface ManageRules {
  hours_left: number;
  can_reschedule: boolean;
  reschedule_block: 'closed' | 'limit' | 'window' | null;
  reschedule_window_hours: number;
  reschedules_left: number;
  can_cancel: boolean;
  cancel_late: boolean;
  cancellation_window_hours: number;
  fee: number;
  amount_paid: number;
  refund: number;
  refund_policy: string;
}

export interface ManageView {
  valid: true;
  token: string;
  business: {
    /** Organization name, or `Provider:<name>` for an independent provider. */
    id: string;
    name: string;
    slug: string | null;
    phone?: string | null;
    email?: string | null;
    kind?: 'organization' | 'provider';
    book_path?: string;
    my_bookings_path?: string;
    /** `/<slug>/booking` or `/schedule/individual/booking`; the token follows. */
    manage_root?: string;
  };
  booking: {
    reference: string;
    offering: string;
    service: string | null;
    provider: string | null;
    /** Rooms or equipment the booking holds. */
    resources?: string[];
    /** Party size; 1 unless the service lets customers choose. */
    quantity?: number;
    location: string | null;
    address: string | null;
    starts_at: string;
    ends_at: string;
    timezone: string;
    status: 'Pending' | 'Confirmed';
    duration_minutes: number;
    location_type?: LocationType;
    /** This customer's own online session (private link and join window); null in person. */
    online?: OnlineSession | null;
  };
  /** The business, provider, place and address as `{en, am}`; read the view through `localizeManageView`. */
  local_names?: { business?: LocalNames; provider?: LocalNames; location?: LocalNames; address?: LocalNames };
  rules: ManageRules;
  currency: string;
  payment: PaymentView | null;
}

/** The view with the business, provider, place and address in Amharic on Amharic pages (when the business named them). */
export function localizeManageView(view: ManageView, language: string): ManageView {
  const local = view.local_names;
  if (!local || language !== 'am') return view;
  const { booking } = view;
  return {
    ...view,
    business: { ...view.business, name: amharicOr(local.business, language, view.business.name) },
    booking: {
      ...booking,
      provider: booking.provider ? amharicOr(local.provider, language, booking.provider) : booking.provider,
      location: booking.location ? amharicOr(local.location, language, booking.location) : booking.location,
      address: booking.address ? amharicOr(local.address, language, booking.address) : booking.address,
    },
  };
}

export interface PaymentView {
  method: 'Bank transfer' | 'Chapa';
  status: 'Awaiting payment' | 'Submitted' | 'Paid' | 'Rejected' | 'Expired' | 'Refunded';
  amount: number;
  service_price: number;
  balance_due: number;
  currency: string;
  hold_expires_at: string | null;
  accounts: { bank: string; account_name: string; account_number: string; note?: string | null }[];
  reject_reason: string | null;
  reference_submitted: boolean;
  receipts?: { name: string; receipt_number: string; kind: 'Payment' | 'Refund' }[];
}

/** How the server checks the route: by organization slug, or as an independent provider's booking. */
export function ownerParams(view: ManageView): { slug: string } | { independent: 1 } {
  return view.business.kind === 'provider' ? { independent: 1 } : { slug: view.business.slug ?? '' };
}

export type ManageResponse = ManageView | { valid: false; message?: string; cancelled?: boolean; fee?: number; refund?: number };
