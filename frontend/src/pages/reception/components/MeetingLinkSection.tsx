import { useEffect, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { ExternalLink, Lock, Video } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useOnlineLabel } from '@/components/online-session/JoinSession';
import { useTranslation } from '@/lib/i18n';
import { isMeetingLink } from '@/lib/online-session';
import { serverErrorMessage } from '@/lib/utils';
import { notificationNotice } from './notificationNotice';

const API = 'appointment.scheduler.online_meeting';

interface MeetingView {
  is_online: boolean;
  platform: string;
  mode: 'Fixed link' | 'Per booking';
  meeting_link: string;
  can_change: boolean;
  modified: string;
  notification_status?: string;
}

/** The private meeting link of an online booking: staff of this business see it and can set or change it. */
export function MeetingLinkSection({ appointment, onChanged }: { appointment: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const onlineLabel = useOnlineLabel();
  const { data, mutate } = useFrappeGetCall<{ message: MeetingView }>(`${API}.for_booking`, { booking: appointment }, `meeting-link-${appointment}`);
  const { call, loading } = useFrappePostCall<{ message: MeetingView }>(`${API}.set_link`);
  const view = data?.message;
  const [link, setLink] = useState('');
  const [problem, setProblem] = useState('');
  useEffect(() => setLink(view?.meeting_link ?? ''), [view?.meeting_link]);
  if (!view?.is_online) return null;

  const changed = link.trim() !== (view.meeting_link || '');
  async function save() {
    if (!view) return;
    setProblem('');
    if (!isMeetingLink(link)) {
      setProblem(t('staff.locations.errors.link'));
      return;
    }
    try {
      const result = await call({ booking: appointment, meeting_link: link.trim(), expected_modified: view.modified });
      const notice = notificationNotice(result?.message?.notification_status);
      toast.success(t('staff.online.saved'));
      if (notice) toast.info(t(notice));
      await mutate();
      onChanged();
    } catch (err) {
      setProblem(serverErrorMessage(err) || t('staff.locations.saveFailed'));
      await mutate();
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-4" data-qa="booking-meeting-link" data-qa-state={view.meeting_link ? 'set' : 'missing'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Video className="h-4 w-4 text-info" aria-hidden="true" />
          {t('staff.online.sectionTitle')}
        </h3>
        <span className="text-xs text-muted-foreground">{onlineLabel(view.platform)}</span>
      </div>
      {view.meeting_link ? (
        <a href={view.meeting_link} target="_blank" rel="noopener noreferrer" data-qa="booking-meeting-link-open"
          className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{view.meeting_link}</span>
        </a>
      ) : (
        <p className="text-sm text-muted-foreground" data-qa="booking-meeting-link-missing">{t('staff.online.noLink')}</p>
      )}
      {view.can_change ? (
        <div className="space-y-2">
          <Label htmlFor={`meeting-link-${appointment}`}>{t('staff.online.linkLabel')}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id={`meeting-link-${appointment}`} data-qa="booking-meeting-link-input" type="url" inputMode="url" value={link}
              placeholder="https://" aria-invalid={Boolean(problem)} onChange={(event) => { setLink(event.target.value); setProblem(''); }}
              onKeyDown={(event) => {
                // The edit dialog is a form: Enter saves the link, not the whole booking.
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (changed && link.trim()) void save();
              }} />
            <Button type="button" data-qa="booking-meeting-link-save" className="shrink-0" disabled={loading || !link.trim() || !changed} onClick={() => void save()}>
              {t('staff.online.save')}
            </Button>
          </div>
          {problem ? (
            <p role="alert" className="text-sm text-destructive">{problem}</p>
          ) : (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t(view.mode === 'Fixed link' ? 'staff.online.fixedNote' : 'staff.online.perBookingNote')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('staff.online.closed')}</p>
      )}
    </section>
  );
}
