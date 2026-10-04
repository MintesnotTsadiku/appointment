import { Armchair, MapPin, User, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import type { Location, Provider } from '../types';

interface DeskFiltersProps {
  locations: Location[];
  providers: Provider[];
  selectedLocation: string | null;
  selectedProvider: string | null;
  onLocationChange: (location: string | null) => void;
  onProviderChange: (provider: string | null) => void;
  /** Rooms and equipment; the filter shows only when the business has some. */
  resources?: Array<{ name: string; resource_name: string }>;
  selectedResource?: string | null;
  onResourceChange?: (resource: string | null) => void;
}

const ALL = '__all__';

export const DeskFilters = ({ locations, providers, selectedLocation, selectedProvider, onLocationChange, onProviderChange, resources = [], selectedResource = null, onResourceChange }: DeskFiltersProps) => {
  const { t } = useTranslation();
  const hasFilters = selectedLocation || selectedProvider || selectedResource;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        qa="desk-filter-location"
        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        label={t('staff.reception.location')}
        allLabel={t('staff.reception.allLocations')}
        value={selectedLocation}
        options={locations.map((l) => ({ value: l.name, label: l.location_name }))}
        onChange={onLocationChange}
      />
      <FilterSelect
        qa="desk-filter-provider"
        icon={<User className="h-4 w-4 text-muted-foreground" />}
        label={t('staff.reception.provider')}
        allLabel={t('staff.reception.allProviders')}
        value={selectedProvider}
        options={providers.map((p) => ({ value: p.name, label: p.provider_name }))}
        onChange={onProviderChange}
      />
      {resources.length > 0 && onResourceChange && (
        <FilterSelect
          qa="desk-filter-resource"
          icon={<Armchair className="h-4 w-4 text-muted-foreground" />}
          label={t('staff.resources.sectionTitle')}
          allLabel={t('staff.resources.filterAll')}
          value={selectedResource}
          options={resources.map((r) => ({ value: r.name, label: r.resource_name }))}
          onChange={onResourceChange}
        />
      )}
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => { onLocationChange(null); onProviderChange(null); onResourceChange?.(null); }}>
          <X />
          {t('staff.reception.clearFilters')}
        </Button>
      )}
    </div>
  );
};

interface FilterSelectProps {
  qa: string;
  icon: React.ReactNode;
  label: string;
  allLabel: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
}

function FilterSelect({ qa, icon, label, allLabel, value, options, onChange }: FilterSelectProps) {
  return (
    <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger data-qa={qa} aria-label={label} className="h-9 w-full justify-start gap-2 sm:w-52 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left">
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
