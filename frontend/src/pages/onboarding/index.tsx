import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { StaffShell } from '@/components/staff-shell';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { validateWindow, type ClockFormat } from '@/lib/time';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { BusinessSection, ServiceSection } from './DetailSections';
import { HoursSection } from './HoursSection';
import { DAYS, type SetupForm } from './types';
import { OnboardingSuccess, type CreatedBusiness } from './OnboardingSuccess';
import SoloSetup from './solo-setup';

export default function Onboarding() {
  const navigate = useNavigate();
  const { reload } = useSession();
  const { t } = useTranslation();
  const { call: create, loading } = useFrappePostCall('appointment.scheduler.workspace.create');
  const { call: setOnboardingType } = useFrappePostCall('appointment.onboarding.set_onboarding_type');
  const request = useRef<{ payload: string; key: string }>();
  const [clockFormat, setClockFormat] = useState<ClockFormat>('12h');
  const [selectedDays, setSelectedDays] = useState(DAYS.slice(0, 5));
  const [problem, setProblem] = useState('');
  const [structure, setStructure] = useState('organization');
  const [done, setDone] = useState<CreatedBusiness | null>(null);
  const [form, setForm] = useState<SetupForm>({
    business_name: '',
    location_name: '',
    service_name: '',
    timezone: 'Africa/Addis_Ababa',
    duration: '30',
    opens_at: '09:00',
    closes_at: '17:00',
  });

  const windowError = validateWindow(form.opens_at, form.closes_at);
  const update = (patch: Partial<SetupForm>) => setForm({ ...form, ...patch });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    if (windowError) {
      setProblem(windowError);
      return;
    }
    if (!selectedDays.length) {
      setProblem('Choose at least one operating day.');
      return;
    }
    const payload = { ...form, weekdays: selectedDays };
    const serialized = JSON.stringify(payload);
    // Reuse the request id for an identical retry so the server can deduplicate it.
    if (!request.current || request.current.payload !== serialized) {
      request.current = { payload: serialized, key: crypto.randomUUID() };
    }
    try {
      // Record the onboarding type first so a new signup is treated as a
      // prospective owner (creates the provider record and capability).
      await setOnboardingType({ onboarding_type: 'organization' });
      const result = await create({ ...payload, request_id: request.current.key });
      setDone(result?.message ?? null);
      const next = await reload();
      if (next?.state === 'workspace') {
        navigate('/home', { replace: false });
      }
    } catch (error) {
      setProblem(parseFrappeErrorMsg(error as Parameters<typeof parseFrappeErrorMsg>[0]));
    }
  }

  if (done) {
    return (
      <StaffShell width="default">
        <OnboardingSuccess business={done} />
      </StaffShell>
    );
  }

  return (
    <StaffShell
      width="default"
      eyebrow={t('staff.onboarding.eyebrow')}
      title={t('staff.onboarding.title')}
      description={t('staff.onboarding.description')}
      headingQa="onboarding-heading"
    >
      <Tabs value={structure} onValueChange={setStructure} className="mx-auto max-w-3xl space-y-6">
        <TabsList aria-label={t('staff.onboarding.structure.label')} data-qa="onboarding-structure">
          <TabsTrigger value="organization">{t('staff.onboarding.structure.organization')}</TabsTrigger>
          <TabsTrigger value="individual">{t('staff.onboarding.structure.individual')}</TabsTrigger>
        </TabsList>
        <TabsContent value="individual">
          <SoloSetup />
        </TabsContent>
        <TabsContent value="organization">
          <form onSubmit={submit} className="space-y-6">
            {problem && (
              <Alert variant="destructive" role="alert" data-qa="onboarding-error">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{problem}</AlertDescription>
              </Alert>
            )}
            <BusinessSection form={form} onChange={update} />
            <ServiceSection form={form} onChange={update} />
            <HoursSection
              form={form}
              onChange={update}
              clockFormat={clockFormat}
              onClockFormat={setClockFormat}
              windowError={windowError}
              selectedDays={selectedDays}
              onDays={setSelectedDays}
            />
            <div className="flex flex-col-reverse items-stretch gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{t('staff.onboarding.privateNote')}</p>
              <Button type="submit" data-qa="onboarding-submit" disabled={loading || Boolean(windowError)}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {loading ? t('staff.onboarding.creating') : t('staff.onboarding.submit')}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </StaffShell>
  );
}
