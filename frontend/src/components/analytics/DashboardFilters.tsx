import { useState } from 'react';
import { DateField } from '@/components/datetime-picker/DateField';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox/checkbox';
import { useTranslation } from '@/lib/i18n';
import { FieldSelect } from './FieldSelect';
import { basisLabel, statusLabel, translateOr } from './widgetRegistry';
import { Filters, initialFilters } from './dashboardFilterTypes';

const lists = {
  basis: ['appointment', 'creation', 'outcome', 'event'],
  segment: ['all', 'new', 'returning', 'repeat'],
  granularity: ['daily', 'weekly', 'monthly'],
} as const;
const listLabels: Record<keyof typeof lists, string> = {
  basis: 'staff.analytics.filterPanel.basisLabel',
  segment: 'staff.analytics.filterPanel.segmentLabel',
  granularity: 'staff.analytics.filterPanel.granularityLabel',
};
const optionKeys: Record<string, string> = {
  'segment.all': 'staff.customers.back',
  'segment.new': 'staff.analytics.filterPanel.segment.new',
  'segment.returning': 'staff.analytics.filterPanel.segment.returning',
  'segment.repeat': 'staff.analytics.filterPanel.segment.repeat',
  'granularity.daily': 'staff.analytics.filterPanel.granularity.daily',
  'granularity.weekly': 'world.care.weekly',
  'granularity.monthly': 'staff.calendar.viewMonth',
  'sources.online': 'staff.analytics.filterPanel.source.online',
  'sources.staff': 'staff.analytics.filterPanel.source.staff',
  'sources.walk-in': 'world.desk.walkIn',
  'sources.import': 'staff.analytics.filterPanel.source.import',
  'sources.unknown': 'staff.analytics.filterPanel.source.unknown',
};
const choiceLabels: Record<string, string> = {
  providers: 'staff.manage.sections.providers',
  locations: 'staff.manage.sections.locations',
  services: 'staff.manage.sections.services',
  statuses: 'staff.analytics.filterPanel.statuses',
  sources: 'staff.analytics.filterPanel.sources',
};

export function DashboardFilters({ filters, onChange, options, label }: {
  label?: string;
  filters: Filters;
  onChange: (filters: Filters) => void;
  options: Record<string, string[]>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const optionLabel = (list: string, value: string) => {
    if (list === 'basis') return basisLabel(t, value);
    if (list === 'statuses') return statusLabel(t, value);
    const key = optionKeys[`${list}.${value}`];
    return key ? translateOr(t, key, value) : value;
  };
  const choices = {
    providers: options.providers || [],
    locations: options.locations || [],
    services: options.services || [],
    statuses: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
    sources: ['online', 'staff', 'walk-in', 'import', 'unknown'],
  };
  return (
    <details className="home-filters rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer px-3 py-1.5 text-sm font-medium">{t('staff.analytics.filterPanel.summary').replace('{0}', label ?? t('staff.analytics.filterPanel.shared')).replace('{1}', basisLabel(t, filters.basis))}</summary>
      {open && <>
        <div className="grid gap-4 border-t p-3 sm:grid-cols-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {(['start', 'end'] as const).map(key => (
            <label key={key} className="text-sm">{key === 'start' ? t('staff.analytics.filterPanel.from') : t('staff.analytics.filterPanel.through')}
              <DateField aria-label={key === 'start' ? t('staff.analytics.filterPanel.startDate') : t('staff.analytics.filterPanel.endDate')} value={filters[key] || ''} onValueChange={value => onChange({ ...filters, [key]: value || undefined })} />
            </label>
          ))}
          {(Object.keys(lists) as Array<keyof typeof lists>).map(key => (
            <FieldSelect
              key={key}
              className="flex-col items-stretch"
              label={t(listLabels[key])}
              aria-label={t(listLabels[key])}
              value={filters[key]}
              onValueChange={value => onChange({ ...filters, [key]: value })}
              options={lists[key].map(value => ({ value, label: optionLabel(key, value) }))}
              triggerClassName="w-full"
            />
          ))}
          {Object.entries(choices).map(([key, values]) => (
            <fieldset key={key} className="max-h-36 overflow-auto rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--border-default)' }}>
              <legend>{t('staff.analytics.filterPanel.emptyMeansAll').replace('{0}', choiceLabels[key] ? t(choiceLabels[key]) : key)}</legend>
              {values.map(value => (
                <label key={value} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={(filters[key as keyof Filters] as string[]).includes(value)}
                    onCheckedChange={checked => {
                      const current = filters[key as keyof Filters] as string[];
                      onChange({ ...filters, [key]: checked ? [...current, value] : current.filter(item => item !== value) });
                    }}
                  />
                  {optionLabel(key, value)}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <Button type="button" variant="link" className="mb-1 h-auto px-3 py-2" onClick={() => onChange(initialFilters)}>{t('staff.analytics.filterPanel.clear')}</Button>
      </>}
    </details>
  );
}
