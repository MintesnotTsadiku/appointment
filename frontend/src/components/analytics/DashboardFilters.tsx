import { useState } from 'react';
import { DateField } from '@/components/datetime-picker/DateField';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox/checkbox';
import { FieldSelect } from './FieldSelect';
import { Filters, initialFilters } from './dashboardFilterTypes';

const lists = {
  basis: ['appointment', 'creation', 'outcome', 'event'],
  segment: ['all', 'new', 'returning', 'repeat'],
  granularity: ['daily', 'weekly', 'monthly'],
} as const;

export function DashboardFilters({ filters, onChange, options, label = 'Shared filters' }: {
  label?: string;
  filters: Filters;
  onChange: (filters: Filters) => void;
  options: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const choices = {
    providers: options.providers || [],
    locations: options.locations || [],
    services: options.services || [],
    statuses: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
    sources: ['online', 'staff', 'walk-in', 'import', 'unknown'],
  };
  return (
    <details className="home-filters rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer px-3 py-1.5 text-sm font-medium">{label} · {filters.basis} date</summary>
      {open && <>
        <div className="grid gap-4 border-t p-3 sm:grid-cols-3" style={{ borderColor: 'var(--border-subtle)' }}>
          {(['start', 'end'] as const).map(key => (
            <label key={key} className="text-sm">{key === 'start' ? 'From' : 'Through'}
              <DateField aria-label={key === 'start' ? 'Start date' : 'End date'} value={filters[key] || ''} onValueChange={value => onChange({ ...filters, [key]: value || undefined })} />
            </label>
          ))}
          {(Object.keys(lists) as Array<keyof typeof lists>).map(key => (
            <FieldSelect
              key={key}
              className="flex-col items-stretch"
              label={key}
              aria-label={key}
              value={filters[key]}
              onValueChange={value => onChange({ ...filters, [key]: value })}
              options={lists[key].map(value => ({ value, label: value }))}
              triggerClassName="w-full"
            />
          ))}
          {Object.entries(choices).map(([key, values]) => (
            <fieldset key={key} className="max-h-36 overflow-auto rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--border-default)' }}>
              <legend className="capitalize">{key} · empty means all</legend>
              {values.map(value => (
                <label key={value} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={(filters[key as keyof Filters] as string[]).includes(value)}
                    onCheckedChange={checked => {
                      const current = filters[key as keyof Filters] as string[];
                      onChange({ ...filters, [key]: checked ? [...current, value] : current.filter(item => item !== value) });
                    }}
                  />
                  {value}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <Button type="button" variant="link" className="mb-1 h-auto px-3 py-2" onClick={() => onChange(initialFilters)}>Clear filters</Button>
      </>}
    </details>
  );
}
