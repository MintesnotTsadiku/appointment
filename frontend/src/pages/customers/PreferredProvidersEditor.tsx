import { useFrappeGetCall } from 'frappe-react-sdk';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { useTranslation } from '@/lib/i18n';
import type { Provider, Service } from '@/pages/reception/types';
import type { PreferredProvider } from './types';

const ANY = '__any';

/** Rows of provider plus optional service. Order is the priority. */
export function PreferredProvidersEditor({ organization, value, onChange }: { organization: string; value: PreferredProvider[]; onChange: (rows: PreferredProvider[]) => void }) {
  const { t } = useTranslation();
  // Scoped to the customer's business; a profile may prefer only its own providers.
  const { data: providerData } = useFrappeGetCall<{ message: { providers: Provider[] } }>(
    'appointment.scheduler.api.desk.get_providers_list', { organization }, `customer-providers-${organization}`
  );
  const { data: serviceData } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.scheduler.api.desk.get_services_list', { organization }, `customer-services-${organization}`
  );
  const providers = providerData?.message?.providers ?? [];
  const services = serviceData?.message?.services ?? [];
  const update = (index: number, patch: Partial<PreferredProvider>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3" data-qa="customer-preferred">
      {value.map((row, index) => (
        <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`preferred-provider-${index}`}>{t('staff.reception.provider')}</Label>
            <Select value={row.provider || undefined} onValueChange={(provider) => update(index, { provider })}>
              <SelectTrigger id={`preferred-provider-${index}`}>
                <SelectValue placeholder={t('staff.receptionDesk.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.name} value={provider.name}>
                    {provider.provider_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`preferred-service-${index}`}>{t('staff.receptionDesk.service')}</Label>
            <Select value={row.service || ANY} onValueChange={(service) => update(index, { service: service === ANY ? null : service })}>
              <SelectTrigger id={`preferred-service-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t('staff.customers.anyService')}</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.name} value={service.name}>
                    {service.service_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('staff.customers.removePreferred')}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-qa="customer-add-preferred"
        onClick={() => onChange([...value, { provider: '', service: null, priority: value.length + 1 }])}
      >
        <Plus aria-hidden="true" />
        {t('staff.customers.addPreferred')}
      </Button>
    </div>
  );
}
