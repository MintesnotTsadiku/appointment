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
  business: { id: string; name: string; slug: string; phone?: string | null; email?: string | null };
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
  };
  rules: ManageRules;
  currency: string;
  payment: PaymentView | null;
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

export type ManageResponse = ManageView | { valid: false; message?: string; cancelled?: boolean; fee?: number; refund?: number };
