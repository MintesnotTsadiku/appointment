import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';

export interface CreatedBusiness {
  business_name: string;
  /** The first offering's booking page. */
  public_path: string;
  /** The business's public page: its published site, else `/schedule/org/<slug>` (or the provider's page). */
  business_path?: string;
  organization?: string;
  /** True when the booking page was published during setup. */
  published?: boolean;
}

/** The link to share after setup: the business page, not one service. */
export function businessPagePath(business: Pick<CreatedBusiness, 'business_path' | 'public_path'>): string {
  return business.business_path || business.public_path;
}

export function OnboardingSuccess({ business }: { business: CreatedBusiness }) {
  const { t } = useTranslation();
  const live = Boolean(business.published);
  const path = businessPagePath(business);
  const link = typeof window === 'undefined' ? path : window.location.origin + path;
  return (
    <section data-qa="onboarding-success" data-state={live ? 'published' : 'draft'} className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-card sm:p-8">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success" aria-hidden="true">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
        {live ? t('staff.onboarding.liveTitle') : t('staff.onboarding.successTitle')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{business.business_name}</span>{' '}
        {live ? t('staff.onboarding.liveDescription') : t('staff.onboarding.successDescription')}
      </p>
      {live && (
        <p className="mt-4 break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm" data-qa="onboarding-live-link">{link}</p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {live ? (
          <>
            <Button asChild>
              <Link to={path} data-qa="onboarding-open-page">
                <ExternalLink aria-hidden="true" />
                {t('staff.onboarding.openPage')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/home" data-qa="onboarding-go-home">{t('staff.onboarding.goHome')}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link to="/settings/business">{t('staff.onboarding.review')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={path}>{t('staff.onboarding.preview')}</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
