import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Link2Off, Lock, Video } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { clockForLanguage, formatInstant } from '@/lib/time';
import { joinState, nextChangeIn, onlineLabel, type JoinState, type OnlineSession } from '@/lib/online-session';
import { cn } from '@/lib/utils';

/** "Online video" or "Online video · Zoom" in the page language. */
export function useOnlineLabel() {
  const { t } = useTranslation();
  return (platform?: string | null) => onlineLabel(t('onlineSession.label'), t('onlineSession.labelWith'), platform);
}

/** Re-render when the join window opens or the session ends. */
function useNow(session: OnlineSession) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const wait = nextChangeIn(session, now);
    if (wait === null) return;
    // Timers above about 24 days overflow; check again at least once an hour.
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(wait + 500, 3_600_000));
    return () => window.clearTimeout(timer);
  }, [session, now]);
  return now;
}

/**
 * The customer's own online session: "Join session" from 15 minutes before the start until the end,
 * a waiting line before that, and a "link will appear here" line while staff have not set the link.
 * Only private pages (manage page, My bookings) render it.
 */
export function JoinSession({ session, timezone, compact = false }: { session: OnlineSession; timezone: string; compact?: boolean }) {
  const { t, language } = useTranslation();
  const now = useNow(session);
  const state = joinState(session, now);
  const opens = formatInstant(session.join_opens_at, clockForLanguage(language, '12h'), timezone);
  const copy: Record<JoinState, { title: string; hint: string; icon: typeof Video }> = {
    open: { title: t('onlineSession.openTitle'), hint: t('onlineSession.openNow'), icon: Video },
    waiting: { title: t('onlineSession.opensAt').replace('{0}', opens), hint: t('onlineSession.prepare'), icon: Clock3 },
    'no-link': { title: t('onlineSession.noLink'), hint: t('onlineSession.noLinkEmail'), icon: Link2Off },
    ended: { title: t('onlineSession.ended'), hint: t('onlineSession.endedHint'), icon: CheckCircle2 },
  };
  const { title, hint, icon: Icon } = copy[state];
  return (
    <section data-qa="online-join" data-qa-state={state} aria-live="polite"
      className={cn('rounded-xl border border-theme-default', compact ? 'p-3' : 'p-4 sm:p-5')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-60 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-hidden="true"
            style={{ color: 'var(--accent-primary)', backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium" data-qa="online-join-status">{title}</p>
            {(!compact || state === 'open') && <p className="text-sm text-theme-secondary">{hint}</p>}
          </div>
        </div>
        {state === 'open' && session.meeting_link && (
          <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
            <a data-qa="online-join-link" href={session.meeting_link} target="_blank" rel="noopener noreferrer">
              <Video className="h-4 w-4" aria-hidden="true" />
              {t('onlineSession.join')}
            </a>
          </Button>
        )}
      </div>
      {state === 'open' && session.meeting_link && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-theme-secondary">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('onlineSession.private')}
        </p>
      )}
    </section>
  );
}
