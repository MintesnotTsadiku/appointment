import type { OfferTerms } from '@/lib/referral-link';

export type ReferralStatus = 'Pending' | 'Qualified' | 'Rewarded';
export type RewardStatus = 'Issued' | 'Redeemed' | 'Expired';

export interface ReferredBusiness {
  name: string;
  status: ReferralStatus;
  bookings: number;
  reward_earned: number;
  joined_on: string;
}

export interface BusinessReferralOverview {
  enabled: boolean;
  code?: string;
  link?: string;
  product_name?: string;
  threshold?: number;
  reward?: number;
  earned_free_bookings?: number;
  referrals?: ReferredBusiness[];
}

export interface CustomerOffer extends OfferTerms {
  enabled: boolean;
  ends_on: string | null;
  friend_gets_offer: boolean;
}

export interface CustomerReward {
  name: string;
  customer_profile: string;
  customer_name: string;
  role: 'Referrer' | 'Friend';
  status: RewardStatus;
  reward_label: string;
  expires_on: string | null;
  redeemed_at: string | null;
  appointment: string | null;
  creation: string;
}

export interface CustomerOfferState {
  available: boolean;
  offer: CustomerOffer;
  issued: number;
  redeemed: number;
  rewards: CustomerReward[];
}

export const REFERRAL_STATUS_VARIANT: Record<ReferralStatus, 'muted' | 'info' | 'success'> = {
  Pending: 'muted',
  Qualified: 'info',
  Rewarded: 'success',
};

export const REWARD_STATUS_VARIANT: Record<RewardStatus, 'info' | 'success' | 'muted'> = {
  Issued: 'info',
  Redeemed: 'success',
  Expired: 'muted',
};
