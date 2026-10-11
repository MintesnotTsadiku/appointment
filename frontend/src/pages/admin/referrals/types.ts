import type { ReferralStatus } from '@/pages/grow/sections/referrals/types';

export interface AdminReferral {
  name: string;
  referred_name: string;
  referrer_name: string | null;
  referrer_kind: 'Business' | 'Partner';
  referral_code: string;
  source: string | null;
  status: ReferralStatus;
  qualifying_bookings: number;
  threshold: number;
  joined_on: string;
}

export interface SourceCount {
  source: string;
  count: number;
}

export type PartnerStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Partner {
  name: string;
  partner_name: string;
  organization_name: string | null;
  email: string;
  phone: string | null;
  kind: 'association' | 'school' | 'trainer' | 'telegram' | 'other';
  message: string | null;
  status: PartnerStatus;
  referral_code: string | null;
  applied_on: string | null;
  qualified_businesses: number;
}

export interface ReferralAdminOverview {
  settings: { business_referrals_enabled: boolean; partner_program_enabled: boolean; threshold: number; reward: number; partner_reward: number };
  totals: {
    pending: number;
    qualified: number;
    rewarded: number;
    credited_free_bookings: number;
    partner_payout_owed: number;
    pending_partners: number;
  };
  referrals: AdminReferral[];
  sources: Record<'30' | '90', SourceCount[]>;
  partners: Partner[];
}

export const PARTNER_STATUS_VARIANT: Record<PartnerStatus, 'warning' | 'success' | 'muted'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'muted',
};
