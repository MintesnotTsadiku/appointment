import { Link } from 'react-router-dom';
import { ArrowRight, CalendarHeart } from 'lucide-react';
import { buttonVariants } from '@/components/button';
import { useAnalyticsScope } from '@/components/analytics/WorkspaceDashboard';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand } from '@/lib/platform-brand';

/** Insights entry point: a small card that opens the owner's Year in review on the Grow page. */
export default function YearReviewPromo() {
  const { t } = useTranslation();
  const brand = usePlatformBrand();
  const { organization, manager } = useAnalyticsScope();
  if (!organization || !manager || !brand.loaded || !brand.growth.yearReviewEnabled) return null;
  return (
    <section data-qa="insights-year-review" className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
        <CalendarHeart className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{t('staff.grow.yearReview.promoTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('staff.grow.yearReview.promoDescription')}</p>
      </div>
      <Link to="/grow#year-review" data-qa="insights-year-review-open" className={buttonVariants({ variant: 'outline', className: 'h-11 shrink-0 sm:h-9' })}>
        {t('staff.grow.yearReview.promoAction')}
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
