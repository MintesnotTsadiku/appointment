import type { BankAccount } from '@/pages/settings/payments/BankAccountsEditor';

export const API = 'appointment.scheduler.payments_admin';

export type CollectionMode = 'Business collects' | 'Platform collects';
export type CollectionOverride = 'Platform default' | CollectionMode;
export type FeeType = 'None' | 'Fixed' | 'Percent';
export type EntryStatus = 'Due' | 'Waived' | 'Settled';
export type EntryType = 'Platform fee' | 'Payout due';

export interface PlatformSettings {
  collection_mode: CollectionMode;
  platform_fee_type: FeeType;
  platform_fee_value: number;
  free_bookings: number;
  platform_bank_accounts: BankAccount[];
  chapa_configured: boolean;
}

export interface BusinessBalance {
  organization: string;
  organization_name: string;
  require_payment: number;
  collector: 'Business' | 'Platform';
  collection_override: CollectionOverride;
  override_platform_fee: number;
  platform_fee_override: number;
  fee_due: number;
  payout_due: number;
  settled: number;
  waived: number;
  due_entries: number;
}

export interface PaymentsOverview {
  platform: PlatformSettings;
  businesses: BusinessBalance[];
  currency: string;
}

export interface LedgerEntry {
  name: string;
  creation: string;
  organization: string;
  organization_name: string;
  entry_type: EntryType;
  amount: number;
  status: EntryStatus;
  appointment?: string | null;
  booking_reference?: string | null;
  note?: string | null;
}

const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatMoney = (amount: number, currency = 'ETB') => `${currency} ${money.format(amount || 0)}`;

export const STATUS_KEY: Record<EntryStatus, string> = {
  Due: 'staff.adminPayments.statusDue',
  Waived: 'staff.adminPayments.statusWaived',
  Settled: 'staff.adminPayments.statusSettled',
};

export const TYPE_KEY: Record<EntryType, string> = {
  'Platform fee': 'staff.adminPayments.typeFee',
  'Payout due': 'staff.adminPayments.colPayoutDue',
};

export const MODE_KEY: Record<CollectionMode, string> = {
  'Business collects': 'staff.adminPayments.modeBusiness',
  'Platform collects': 'staff.adminPayments.modePlatform',
};
