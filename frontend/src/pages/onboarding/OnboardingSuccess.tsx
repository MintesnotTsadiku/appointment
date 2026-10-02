import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';

export interface CreatedBusiness {
  business_name: string;
  public_path: string;
}

export function OnboardingSuccess({ business }: { business: CreatedBusiness }) {
  const { t } = useTranslation();
  return (
    <section data-qa="onboarding-success" className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-card sm:p-8">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success" aria-hidden="true">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">{t('staff.onboarding.successTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{business.business_name}</span> {t('staff.onboarding.successDescription')}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/settings/business">{t('staff.onboarding.review')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={business.public_path}>{t('staff.onboarding.preview')}</Link>
        </Button>
      </div>
    </section>
  );
}
