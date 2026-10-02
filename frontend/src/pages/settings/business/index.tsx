import { FormEvent, useRef, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { validateWindow, type ClockFormat } from '@/lib/time';
import { Alert, AlertDescription } from '@/components/alert';
import { SettingsPage, SettingsSection } from '@/components/settings-layout';
import { OfferingList, type Offering } from './OfferingList';
import { CreateBusinessForm, DAYS, type BusinessForm } from './CreateBusinessForm';

export default function BusinessSettings() {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: Offering[] }>('appointment.scheduler.workspace.overview');
  const { call: create, loading } = useFrappePostCall('appointment.scheduler.workspace.create');
  const { call: publish, loading: publishing } = useFrappePostCall('appointment.scheduler.workspace.publish');
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedDays, setSelectedDays] = useState(DAYS.slice(0, 5));
  const [clockFormat, setClockFormat] = useState<ClockFormat>('12h');
  const request = useRef<{ payload: string; key: string }>();
  const [form, setForm] = useState<BusinessForm>({ business_name: '', location_name: '', service_name: '', timezone: 'Africa/Addis_Ababa', duration: '30', opens_at: '09:00', closes_at: '17:00' });
  const windowError = validateWindow(form.opens_at, form.closes_at);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    setNotice('');
    if (windowError) {
      setProblem(windowError);
      return;
    }
    const payload = { ...form, weekdays: selectedDays };
    const serialized = JSON.stringify(payload);
    // Reuse the idempotency key while the payload is unchanged so retries don't duplicate.
    if (!request.current || request.current.payload !== serialized) request.current = { payload: serialized, key: crypto.randomUUID() };
    try {
      await create({ ...payload, request_id: request.current.key });
      await mutate();
      setNotice('Business saved as a draft. Review it below, then publish when ready.');
    } catch (e) {
      setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  async function setPublished(row: Offering) {
    setProblem('');
    setNotice('');
    try {
      await publish({ organization: row.organization, published: row.published ? 0 : 1 });
      await mutate();
      setNotice(row.published ? 'Booking page unpublished. Existing bookings remain available to staff.' : 'Booking page published. Share its link to accept customers.');
    } catch (e) {
      setProblem(parseFrappeErrorMsg(e as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  return (
    <SettingsPage title={t('staff.settings.business.title')} description={t('staff.business.description')}>
      <div className="space-y-6">
        {(error || problem) && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription className="text-foreground">{problem || parseFrappeErrorMsg(error!)}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert variant="success" role="status">
            <CheckCircle2 />
            <AlertDescription className="text-foreground">{notice}</AlertDescription>
          </Alert>
        )}
        <SettingsSection title={t('staff.business.pagesTitle')} description={t('staff.business.pagesDescription')}>
          <section aria-label="Your booking pages">
            <OfferingList offerings={data?.message ?? []} loading={isLoading} publishing={publishing} onTogglePublish={(row) => void setPublished(row)} />
          </section>
        </SettingsSection>
        {!error && (
          <SettingsSection title={t('staff.business.createTitle')} description={t('staff.business.createDescription')}>
            <CreateBusinessForm
              form={form}
              onChange={setForm}
              days={selectedDays}
              onDaysChange={setSelectedDays}
              clockFormat={clockFormat}
              onClockFormatChange={setClockFormat}
              windowError={windowError}
              saving={loading}
              onSubmit={submit}
            />
          </SettingsSection>
        )}
      </div>
    </SettingsPage>
  );
}
