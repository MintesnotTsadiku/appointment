import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Label } from '@/components/label';
import { NativeSelect } from '@/components/native-select';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';

const API = 'appointment.scheduler.resources';

interface BookingNeed {
  resource_type: string;
  type_name: string;
  resource: string | null;
  resource_name: string | null;
  options: Array<{ name: string; resource_name: string; free: boolean; capacity?: number; left?: number }>;
}

interface BookingResources {
  needs: BookingNeed[];
  can_change: boolean;
  modified: string;
}

/** The room or equipment a booking holds, with a control to move it to another free one. */
export function ResourceSection({ appointment, onChanged }: { appointment: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: BookingResources }>(`${API}.for_booking`, { booking: appointment }, `booking-resources-${appointment}`);
  const { call, loading } = useFrappePostCall<{ message: BookingResources }>(`${API}.set_resource`);
  const view = data?.message;
  if (!view || view.needs.length === 0) return null;

  async function move(need: BookingNeed, resource: string) {
    if (!view || !resource || resource === need.resource) return;
    try {
      await call({ booking: appointment, resource_type: need.resource_type, resource, expected_modified: view.modified });
      const name = need.options.find((option) => option.name === resource)?.resource_name ?? resource;
      toast.success(t('staff.resources.moved').replace('{0}', name));
      await mutate();
      onChanged();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.resources.saveFailed'));
      await mutate();
    }
  }

  return (
    <section className="space-y-3" data-qa="booking-resources">
      <h3 className="text-sm font-semibold text-foreground">{t('staff.resources.sectionTitle')}</h3>
      {view.needs.map((need) => (
        <div key={need.resource_type} className="space-y-2 rounded-lg border p-3 text-sm" data-qa="booking-resource" data-qa-state={need.resource ? 'assigned' : 'missing'}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-muted-foreground">{need.type_name}</span>
            <span className="font-medium">{need.resource_name || t('staff.resources.notAssigned')}</span>
          </div>
          {!need.resource && (
            <p className="flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('staff.resources.missingWarning').replace('{0}', need.type_name)}
            </p>
          )}
          {view.can_change && need.options.length > (need.resource ? 1 : 0) && (
            <div className="space-y-1.5">
              <Label htmlFor={`move-${need.resource_type}`}>{t('staff.resources.moveTo')}</Label>
              <NativeSelect id={`move-${need.resource_type}`} data-qa="booking-resource-move" value={need.resource || ''} disabled={loading}
                onChange={(event) => void move(need, event.target.value)}>
                {!need.resource && <option value="">{t('staff.resources.notAssigned')}</option>}
                {need.options.map((option) => (
                  <option key={option.name} value={option.name} disabled={!option.free && option.name !== need.resource}>
                    {option.free || option.name === need.resource
                      ? (option.capacity ?? 1) > 1
                        ? t('staff.resources.unitsLeft').replace('{0}', option.resource_name).replace('{1}', String(option.left ?? 0))
                        : option.resource_name
                      : t('staff.resources.busy').replace('{0}', option.resource_name)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
