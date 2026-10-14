import { Link } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';
import { TEMPLATE_CHOICE_API, websiteSetupPath } from '@/lib/template-choice';

interface ChosenTemplate {
  key: string | null;
  label?: string;
  image?: string | null;
}

/** After business setup: the website template the owner chose in the landing gallery, one step away. */
export function GalleryTemplateNext({ qa }: { qa: string }) {
  const { t } = useTranslation();
  const { data } = useFrappeGetCall<{ message: ChosenTemplate }>(`${TEMPLATE_CHOICE_API}.chosen_template`, undefined, 'gallery-template-choice', {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const chosen = data?.message;
  if (!chosen?.key || !chosen.label) return null;
  return (
    <div data-qa={`${qa}-gallery-template`} className="mt-8 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
      {chosen.image && <img src={chosen.image} alt="" className="aspect-[16/10] w-full shrink-0 rounded-lg border object-cover object-top sm:w-36" />}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground">{fill(t('staff.website.templateChoice.nextTitle'), chosen.label)}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('staff.website.templateChoice.nextBody')}</p>
      </div>
      <Button asChild className="min-h-11 shrink-0">
        <Link to={websiteSetupPath(chosen.key)} data-qa={`${qa}-gallery-template-start`}>
          {t('staff.website.templateChoice.nextAction')}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
