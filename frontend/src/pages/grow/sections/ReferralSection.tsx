import { useBusinessKey } from '@/hooks/useBusinessKey';
import BusinessReferralCard from './referrals/BusinessReferralCard';
import CustomerOfferCard from './referrals/CustomerOfferCard';

/** Referral tools on the Grow page: invite other businesses, and "Bring a friend" for customers. */
export default function ReferralSection() {
  const { key } = useBusinessKey();
  if (!key) return null;
  return (
    <>
      <BusinessReferralCard business={key} />
      <CustomerOfferCard business={key} />
    </>
  );
}
