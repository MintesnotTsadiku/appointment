import { Link } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Globe, Rocket } from 'lucide-react';
import { Button } from '@/components/button';
import { StaffShell } from '@/components/staff-shell';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/states';
import { useBusinessKey } from '@/hooks/useBusinessKey';
import { useTranslation } from '@/lib/i18n';
import LinkPreviewSection from './sections/LinkPreviewSection';
import PinGuide from './sections/PinGuide';
import PosterSection from './sections/PosterSection';
import ShareSection from './sections/ShareSection';
import ShortLinkSection from './sections/ShortLinkSection';
import ReferralSection from './sections/ReferralSection';
import DirectorySection from './sections/DirectorySection';
import YearReviewSection from './sections/YearReviewSection';
import { GROW_API, type GrowContext } from './types';

/** Owner tools that help a business bring in new customers. */
export default function GrowPage() {
  const { t } = useTranslation();
  const business = useBusinessKey();
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: GrowContext }>(
    GROW_API,
    { business: business.key },
    business.key ? `grow-${business.key}` : null
  );
  const context = data?.message;

  return (
    <StaffShell title={t('staff.grow.title')} description={t('staff.grow.description')} headingQa="grow-heading">
      <div data-page="grow" className="space-y-6">
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading || business.loading || !context ? (
          <PageSkeleton />
        ) : !context.link.url ? (
          <EmptyState
            icon={Rocket}
            title={t('staff.grow.noLink.title')}
            description={t('staff.grow.noLink.description')}
            action={
              <Button asChild size="lg" data-qa="grow-no-link-action">
                <Link to={context.business.kind === 'provider' ? '/settings/independent-booking' : '/settings/website'}>
                  <Globe aria-hidden="true" />
                  {t('staff.grow.noLink.action')}
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-6">
                <ShareSection key={context.link.url} data={context} />
                <PinGuide />
              </div>
              <div className="min-w-0 space-y-6">
                <LinkPreviewSection data={context} />
                <ShortLinkSection key={context.link.slug ?? ''} data={context} onChanged={() => mutate()} />
              </div>
            </div>
            <PosterSection data={context} />
          </>
        )}
        <ReferralSection />
        <DirectorySection />
        <YearReviewSection />
      </div>
    </StaffShell>
  );
}
