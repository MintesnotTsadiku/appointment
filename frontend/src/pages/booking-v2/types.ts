/**
 * Type definitions for booking-v2
 */

export type TimeFormat = '12h' | '24h' | 'ethiopian';
export type BookingPhase = 'discover' | 'select' | 'confirm' | 'complete';
export type BookingType = 'individual' | 'organization' | 'group';

export interface Provider {
  id: string;
  name: string;
  avatar?: string;
  designation?: string;
  services?: string[];
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price?: number;
  currency?: string;
  type: 'individual' | 'organization' | 'group';
  provider?: Provider;
  providerCount?: number;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  banner?: string;
  description?: string;
  providers: Provider[];
  services: Service[];
}

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  provider?: Provider;
  available: boolean;
  recommended?: boolean;
  isPast?: boolean;
}

export interface TimeSlotGroup {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  label: string;
  range: string;
  slots: TimeSlot[];
}

export interface AvailabilityData {
  date: string;
  availableSlots: TimeSlot[];
  totalSlots: number;
  availableDays: string[];
  validStartDate: string;
  validEndDate?: string;
}

export interface BookingFormData {
  userName: string;
  userEmail: string;
  userPhone?: string;
  notes?: string;
  otherParticipants?: string;
}

export type PaymentGateway = 'telebirr' | 'chapa';
export type PaymentType = 'full' | 'partial';

export interface PaymentOption {
  type: PaymentType;
  label: string;
  description: string;
  amount: number;
  reservationFee?: number;
  balanceDue?: number;
}

export interface PaymentData {
  gateway: PaymentGateway;
  paymentType: PaymentType;
  amount: number;
  phoneNumber?: string; // For Telebirr
  referenceNumber?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string; // Redirect URL for payment
  message: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  bookingId?: string;
  meetLink?: string;
  calendarEventUrl?: string;
  rescheduleUrl?: string;
  meetingProvider?: string;
}

export interface BookingState {
  // Phase management
  phase: BookingPhase;
  bookingType: BookingType;
  
  // Organization/Service selection
  organization?: Organization;
  service?: Service;
  
  // Date/Time selection
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  displayMonth: Date;
  
  // User preferences
  timeFormat: TimeFormat;
  timezone: string;
  locale: string;
  
  // Form data
  formData: BookingFormData;
  
  // Payment data
  paymentData?: PaymentData;
  requiresPayment: boolean;
  
  // UI state
  loading: boolean;
  error: Error | null;
  
  // Booking result
  bookingResponse?: BookingResponse;
  paymentResponse?: PaymentResponse;
}

export type BookingAction =
  | { type: 'SET_PHASE'; payload: BookingPhase }
  | { type: 'SET_ORGANIZATION'; payload: Organization }
  | { type: 'SET_SERVICE'; payload: Service }
  | { type: 'SET_DATE'; payload: Date }
  | { type: 'SET_SLOT'; payload: TimeSlot }
  | { type: 'SET_DISPLAY_MONTH'; payload: Date }
  | { type: 'SET_TIME_FORMAT'; payload: TimeFormat }
  | { type: 'SET_TIMEZONE'; payload: string }
  | { type: 'SET_FORM_DATA'; payload: Partial<BookingFormData> }
  | { type: 'SET_PAYMENT_DATA'; payload: PaymentData }
  | { type: 'SET_REQUIRES_PAYMENT'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_BOOKING_RESPONSE'; payload: BookingResponse }
  | { type: 'SET_PAYMENT_RESPONSE'; payload: PaymentResponse }
  | { type: 'RESET_BOOKING' };

export interface CalendarProps {
  selectedDate: Date | null;
  displayMonth: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  availableDays?: number[];
  disabledDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
  loading?: boolean;
  timeFormat?: TimeFormat;
  className?: string;
}

export interface TimeSlotsProps {
  date: Date;
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  timeFormat: TimeFormat;
  timezone: string;
  loading?: boolean;
  groupByTimeOfDay?: boolean;
  className?: string;
}

export interface QuickActionsProps {
  onDateSelect: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

export interface TimeFormatToggleProps {
  value: TimeFormat;
  onChange: (format: TimeFormat) => void;
  showLabels?: boolean;
  className?: string;
}

export interface TimezoneData {
  value: string;
  label: string;
  offset: string;
}

