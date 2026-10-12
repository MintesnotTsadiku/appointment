import { FormEvent, useState, type ReactNode } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { AlertCircle, CalendarClock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { FieldHint, SettingsSection } from '@/components/settings-layout';
import { Switch } from '@/components/switch';
import { TimeZoneSelect } from '@/components/timezone-select';
import { useSession } from '@/context/session';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { CreatedBusiness } from './OnboardingSuccess';

interface SoloResult {
  provider: string;
  business_name: string;
  business_path: string;
  published: boolean;
}

/** An independent provider's setup: name, first service and publish, in one step. */
export default function SoloSetup({ onCreated }: { onCreated: (business: CreatedBusiness) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa');
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState('');
  const { call, loading } = useFrappePostCall<{ message: SoloResult }>('appointment.public_experience.solo_setup.create');
  const { reload } = useSession();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const result = await call({ business_name: name, service_name: service, timezone, publish: publishNow ? 1 : 0 });
      await reload();
      onCreated({ ...result.message });
    } catch (reason) {
      setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-qa="solo-setup">
      {error && (
        <Alert variant="destructive" role="alert" data-qa="solo-error">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <SettingsSection title={t('staff.onboarding.solo.title')} description={t('staff.onboarding.solo.introLive')}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="solo_business_name" label={t('staff.onboarding.solo.name')} hint={t('staff.onboarding.businessNameHint')}>
            <Input id="solo_business_name" data-qa="solo-business-name" required maxLength={100} autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} aria-describedby="solo_business_name-hint" />
          </Field>
          <Field id="solo_service_name" label={t('staff.onboarding.solo.service')} hint={t('staff.onboarding.solo.serviceHint')}>
            <Input id="solo_service_name" data-qa="solo-service-name" required maxLength={100} placeholder={t('staff.onboarding.solo.servicePlaceholder')} value={service} onChange={(e) => setService(e.target.value)} aria-describedby="solo_service_name-hint" />
          </Field>
          <div className="sm:col-span-2" data-qa="solo-timezone">
            <TimeZoneSelect id="solo_timezone" value={timezone} onChange={setTimezone} label={t('staff.reception.timezone')} />
            <FieldHint>{t('staff.onboarding.timezoneHint')}</FieldHint>
          </div>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('staff.onboarding.solo.defaults')}
        </p>
      </SettingsSection>
      <div className="flex flex-col items-stretch gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm" data-qa="solo-publish-now">
          <Switch checked={publishNow} onCheckedChange={setPublishNow} aria-describedby="solo-publish-hint" className="mt-0.5" />
          <span>
            <span className="font-medium text-foreground">{t('staff.onboarding.publishNow')}</span>
            <span id="solo-publish-hint" className="block text-xs text-muted-foreground">
              {publishNow ? t('staff.onboarding.publishHint') : t('staff.onboarding.privateNote')}
            </span>
          </span>
        </label>
        <Button type="submit" size="lg" data-qa="solo-submit" disabled={loading}>
          {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {loading ? t('staff.onboarding.creating') : t('staff.onboarding.solo.create')}
        </Button>
      </div>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {children}
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}
