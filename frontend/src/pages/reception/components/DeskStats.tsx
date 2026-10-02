import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface DeskStatsProps {
  visible: number;
  confirmed: number;
  pending: number;
  providers: number;
}

/** Inline counters for the visible range; dots pair with labels so color is never alone. */
export function DeskStats({ visible, confirmed, pending, providers }: DeskStatsProps) {
  const { t } = useTranslation();
  const items = [
    { key: 'visible', label: t('staff.reception.visible'), value: visible, dot: 'bg-foreground/60' },
    { key: 'confirmed', label: t('staff.status.confirmed'), value: confirmed, dot: 'bg-success' },
    { key: 'pending', label: t('staff.status.pending'), value: pending, dot: 'bg-info' },
    { key: 'providers', label: t('staff.reception.providersActive'), value: providers, dot: 'bg-primary' },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5" data-qa="desk-stats">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 sm:bg-transparent sm:p-0">
          <span className={cn('h-2 w-2 rounded-full', item.dot)} aria-hidden="true" />
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
