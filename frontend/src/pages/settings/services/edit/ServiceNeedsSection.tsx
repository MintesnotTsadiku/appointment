import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Input } from '@/components/input';
import { NativeSelect } from '@/components/native-select';
import { Switch } from '@/components/switch';
import { SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { BookingList } from '@/pages/settings/resources/BookingList';
import type { BookingRef } from '@/pages/settings/resources/types';

const API = 'appointment.scheduler.resources';

interface Need {
  resource_type: string;
  specific_resource?: string | null;
  units?: number;
}

interface NeedsResponse {
  needs: Need[];
  resource_only: number;
  allow_quantity: number;
  max_quantity: number;
  types: Array<{ name: string; type_name: string }>;
  resources: Array<{ name: string; resource_name: string; resource_type: string; location: string }>;
  unassigned: BookingRef[];
}

/** Which rooms or equipment each booking of this service reserves. Saved on its own, apart from the service form. */
export function ServiceNeedsSection({ serviceId }: { serviceId: string }) {
  const { t } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: NeedsResponse }>(`${API}.get_service_needs`, { service: serviceId }, `service-needs-${serviceId}`);
  const { call, loading } = useFrappePostCall<{ message: { unassigned: BookingRef[] } }>(`${API}.save_service_needs`);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [resourceOnly, setResourceOnly] = useState(false);
  const [allowQuantity, setAllowQuantity] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState(1);
  const saved = data?.message;
  useEffect(() => {
    if (saved) {
      setNeeds(saved.needs);
      setResourceOnly(saved.resource_only === 1);
      setAllowQuantity(saved.allow_quantity === 1);
      setMaxQuantity(saved.max_quantity || 1);
    }
  }, [saved]);
  if (!saved) return null;
  const dirty = JSON.stringify(needs) !== JSON.stringify(saved.needs) || resourceOnly !== (saved.resource_only === 1)
    || allowQuantity !== (saved.allow_quantity === 1) || maxQuantity !== (saved.max_quantity || 1);
  // Booked without staff: exactly one need, every resource of that type is offered, one unit each.
  const canBeResourceOnly = needs.length === 1 && !needs[0].specific_resource;
  const unused = saved.types.filter((type) => !needs.some((need) => need.resource_type === type.name));

  async function save() {
    try {
      const result = await call({ service: serviceId, needs: JSON.stringify(needs), resource_only: resourceOnly && canBeResourceOnly ? 1 : 0,
        allow_quantity: allowQuantity ? 1 : 0, max_quantity: maxQuantity });
      const left = result.message.unassigned.length;
      if (left) toast.warning(t('staff.resources.needsUnassigned').replace('{0}', String(left)));
      else toast.success(t('staff.resources.needsSaved'));
      await mutate();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.resources.saveFailed'));
    }
  }

  return (
    <SettingsSection id="service-needs" title={t('staff.resources.needsTitle')} description={t('staff.resources.needsHint')}>
      <div className="space-y-4" data-qa="service-needs">
        {saved.types.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('staff.resources.noTypes')}</p>
        ) : needs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('staff.resources.noNeeds')}</p>
        ) : (
          <ul className="space-y-3">
            {needs.map((need, index) => (
              <li key={need.resource_type} className="grid grid-cols-1 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_6rem_auto]" data-qa="service-need">
                <div className="space-y-1.5">
                  <Label htmlFor={`need-type-${index}`}>{t('staff.resources.resourceType')}</Label>
                  <NativeSelect id={`need-type-${index}`} data-qa="service-need-type" value={need.resource_type}
                    onChange={(event) => setNeeds(needs.map((row, i) => (i === index ? { resource_type: event.target.value, specific_resource: null } : row)))}>
                    {saved.types.filter((type) => type.name === need.resource_type || unused.includes(type)).map((type) => (
                      <option key={type.name} value={type.name}>{type.type_name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`need-which-${index}`}>{t('staff.resources.whichOne')}</Label>
                  <NativeSelect id={`need-which-${index}`} data-qa="service-need-which" value={need.specific_resource || ''}
                    onChange={(event) => setNeeds(needs.map((row, i) => (i === index ? { ...row, specific_resource: event.target.value || null } : row)))}>
                    <option value="">{t('staff.resources.anyFree')}</option>
                    {saved.resources.filter((row) => row.resource_type === need.resource_type).map((row) => (
                      <option key={row.name} value={row.name}>{row.resource_name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`need-units-${index}`}>{t('staff.resources.units')}</Label>
                  <Input id={`need-units-${index}`} data-qa="service-need-units" type="number" min={1} step={1} inputMode="numeric" value={need.units ?? 1}
                    onChange={(event) => setNeeds(needs.map((row, i) => (i === index ? { ...row, units: Math.max(1, Math.trunc(Number(event.target.value)) || 1) } : row)))} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={t('staff.resources.removeNeed')} onClick={() => setNeeds(needs.filter((_, i) => i !== index))}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {saved.unassigned.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('staff.resources.unassignedTitle')}</p>
            <BookingList rows={saved.unassigned} qa="service-needs-unassigned" />
          </div>
        )}
        {needs.length > 0 && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3" data-qa="service-resource-only">
            <div className="space-y-1">
              <Label htmlFor="service-resource-only">{t('staff.resources.resourceOnly')}</Label>
              <p className="text-xs text-muted-foreground">
                {canBeResourceOnly ? t('staff.resources.resourceOnlyHint') : t('staff.resources.resourceOnlyNeedsOne')}
              </p>
            </div>
            <Switch id="service-resource-only" data-qa="service-resource-only-switch" checked={resourceOnly && canBeResourceOnly} disabled={!canBeResourceOnly}
              onCheckedChange={setResourceOnly} />
          </div>
        )}
        <div className="space-y-3 rounded-lg border p-3" data-qa="service-quantity">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="service-allow-quantity">{t('staff.resources.quantityTitle')}</Label>
              <p className="text-xs text-muted-foreground">{t('staff.resources.quantityHint')}</p>
            </div>
            <Switch id="service-allow-quantity" data-qa="service-allow-quantity" checked={allowQuantity} onCheckedChange={setAllowQuantity} />
          </div>
          {allowQuantity && (
            <div className="space-y-1.5">
              <Label htmlFor="service-max-quantity">{t('staff.resources.maxQuantity')}</Label>
              <Input id="service-max-quantity" data-qa="service-max-quantity" type="number" min={1} step={1} inputMode="numeric" className="w-32" value={maxQuantity}
                onChange={(event) => setMaxQuantity(Math.max(1, Math.trunc(Number(event.target.value)) || 1))} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {unused.length > 0 && (
            <Button type="button" variant="outline" size="sm" data-qa="service-need-add" onClick={() => setNeeds([...needs, { resource_type: unused[0].name, specific_resource: null }])}>
              <Plus aria-hidden="true" />
              {t('staff.resources.addNeed')}
            </Button>
          )}
          <Button type="button" size="sm" data-qa="service-needs-save" disabled={!dirty || loading} onClick={() => void save()}>
            {t('staff.resources.saveNeeds')}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/settings/resources">
              {t('staff.resources.openResources')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
