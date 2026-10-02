import type { FormEvent } from 'react';
import { Info, Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { FieldHint } from '@/components/settings-layout';
import { useRoleLabel } from '@/components/staff-shell';
import { ROLE_OPTIONS, type LocationOption, type ProviderOption } from './types';

export interface AssignValues {
  email: string;
  full_name: string;
  role: string;
  provider: string;
}

interface AssignFormProps {
  form: AssignValues;
  onChange: (form: AssignValues) => void;
  locations: LocationOption[];
  selectedLocations: string[];
  onLocationsChange: (names: string[]) => void;
  providers: ProviderOption[];
  assigning: boolean;
  onSubmit: (event: FormEvent) => void;
}

/** Local account assignment: email, role, optional provider and location scope. */
export function AssignForm({ form, onChange, locations, selectedLocations, onLocationsChange, providers, assigning, onSubmit }: AssignFormProps) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const scoped = form.role === 'Provider' || form.role === 'Receptionist';
  const help = ROLE_OPTIONS.find((option) => option.value === form.role)?.helpKey;
  const toggleLocation = (name: string, checked: boolean) =>
    onLocationsChange(checked ? [...selectedLocations, name] : selectedLocations.filter((value) => value !== name));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="team-email">{t('staff.team.email')}</Label>
        <Input id="team-email" data-qa="team-email" type="email" required autoComplete="off" className="mt-1.5" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="team-name">{t('staff.team.fullName')}</Label>
        <Input id="team-name" type="text" className="mt-1.5" value={form.full_name} onChange={(e) => onChange({ ...form, full_name: e.target.value })} />
        <FieldHint>{t('staff.team.fullNameHint')}</FieldHint>
      </div>
      <div>
        <Label htmlFor="team-role-trigger">{t('staff.team.role')}</Label>
        <Select value={form.role} onValueChange={(value) => onChange({ ...form, role: value, provider: '' })}>
          <SelectTrigger id="team-role-trigger" data-qa="team-role" className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{roleLabel(option.value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {help && <FieldHint>{t(help)}</FieldHint>}
      </div>
      {scoped && providers.length > 0 && (
        <div>
          <Label htmlFor="team-provider-trigger">{t('staff.team.providerScope')}</Label>
          <Select value={form.provider || '__all__'} onValueChange={(value) => onChange({ ...form, provider: value === '__all__' ? '' : value })}>
            <SelectTrigger id="team-provider-trigger" data-qa="team-provider" className="mt-1.5"><SelectValue placeholder={t('staff.reception.allProviders')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('staff.reception.allProviders')}</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider.name} value={provider.name}>{provider.provider_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {locations.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium">{t('staff.team.locationScope')}</legend>
          <div className="mt-2 space-y-2 rounded-lg border p-3">
            {locations.map((location) => (
              <label key={location.name} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  data-qa={`team-location-${location.name}`}
                  className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                  checked={selectedLocations.includes(location.name)}
                  onChange={(e) => toggleLocation(location.name, e.target.checked)}
                />
                {location.location_name}
              </label>
            ))}
          </div>
          <FieldHint>{t('staff.team.locationScopeHint')}</FieldHint>
        </fieldset>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t('staff.team.localOnly')}
      </p>
      <Button type="submit" data-qa="team-assign" disabled={assigning || !form.email} className="w-full">
        {assigning ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
        {assigning ? t('staff.team.assigning') : t('staff.team.assign')}
      </Button>
    </form>
  );
}
