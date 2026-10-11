import { BriefcaseBusiness, Copy, Megaphone, Pin, UserRound } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { GrowCard } from '../components';

const STEPS = [
  { key: 'copy', icon: Copy },
  { key: 'post', icon: Megaphone },
  { key: 'pin', icon: Pin },
  { key: 'bio', icon: UserRound },
  { key: 'business', icon: BriefcaseBusiness },
] as const;

/** How to keep the booking link in front of a Telegram audience. */
export default function PinGuide() {
  const { t } = useTranslation();
  return (
    <GrowCard qa="grow-pin-guide" icon={Pin} title={t('staff.grow.pin.title')} description={t('staff.grow.pin.description')}>
      <ol className="space-y-4">
        {STEPS.map(({ key, icon: Icon }, index) => (
          <li key={key} data-qa={`grow-pin-step-${key}`} className="flex gap-3">
            <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-primary" aria-hidden="true">
              <Icon className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {index + 1}
              </span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground">{t(`staff.grow.pin.${key}.title`)}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t(`staff.grow.pin.${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </GrowCard>
  );
}
