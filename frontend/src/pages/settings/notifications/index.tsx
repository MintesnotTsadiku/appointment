import { useEffect, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { SettingsPage, SettingsSection, StickySaveBar } from '@/components/settings-layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { MessageRows, type CustomerMessage } from '@/pages/reception/components/CustomerMessages';
import { EventSettings, type NotificationSettings } from './EventSettings';
import { leadTimeValid } from './leadTime';

interface SettingsResponse {
  settings: NotificationSettings;
  recent: CustomerMessage[];
}

/** Per-business customer email settings and the latest messages. */
export default function NotificationSettingsPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const organization = session?.selected?.organization;
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: SettingsResponse }>(
    'appointment.scheduler.notifications.get_settings',
    organization ? { organization } : undefined,
    organization ? `notification-settings-${organization}` : null
  );
  const { call: save, loading: saving } = useFrappePostCall('appointment.scheduler.notifications.save_settings');
  const [form, setForm] = useState<NotificationSettings | null>(null);
  const saved = data?.message?.settings;

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  const dirty = Boolean(form && saved && JSON.stringify(form) !== JSON.stringify(saved));

  async function submit() {
    if (!form || !organization) return;
    try {
      await save({ organization, ...form });
      toast.success(t('staff.notifications.saved'));
      await mutate();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.notifications.saveFailed'));
    }
  }

  return (
    <SettingsPage title={t('staff.settings.notifications.title')} description={t('staff.settings.notifications.description')}>
      <div className="space-y-6" data-qa="notification-settings">
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : (
          <SettingsSection title={t('staff.notifications.eventsTitle')} description={t('staff.notifications.eventsDescription')}>
            {isLoading || !form ? <ListSkeleton count={4} /> : <EventSettings value={form} onChange={setForm} />}
          </SettingsSection>
        )}
        <SettingsSection title={t('staff.notifications.recentTitle')} description={t('staff.notifications.recentDescription')}>
          {isLoading ? (
            <ListSkeleton count={3} />
          ) : data?.message?.recent?.length ? (
            <MessageRows rows={data.message.recent} showBooking />
          ) : (
            <EmptyState compact icon={Mail} title={t('staff.notifications.empty')} />
          )}
        </SettingsSection>
        {form && (
          <StickySaveBar
            dirty={dirty}
            saving={saving}
            onSave={() => void submit()}
            onDiscard={() => saved && setForm(saved)}
            saveLabel={t('staff.notifications.save')}
            saveQa="notification-settings-save"
            disabled={!dirty || !leadTimeValid(form.reminder_lead_hours)}
          />
        )}
      </div>
    </SettingsPage>
  );
}
