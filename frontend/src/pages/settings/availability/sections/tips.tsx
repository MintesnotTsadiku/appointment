import { Lightbulb } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { AvailabilityLevel } from '../lib/schedule';

export function AvailabilityTips({ level }: { level: AvailabilityLevel }) {
  const { t } = useTranslation();
  const tips = [
    t('staff.availability.tips.breaks'),
    t(`staff.availability.levelDescription.${level}`),
    t('staff.availability.tips.withinParent'),
    t('staff.availability.tips.gaps'),
  ];
  return (
    <aside className="rounded-xl border bg-muted/40 p-5" aria-labelledby="availability-tips-title">
      <h2 id="availability-tips-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lightbulb aria-hidden="true" className="h-4 w-4 text-primary" />
        {t('staff.availability.tips.title')}
      </h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/60">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}
