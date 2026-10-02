import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarCheck, CalendarDays, CheckCircle2, Info, Link2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { SettingsPage, SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type CalendarType = 'builtin' | 'google';

// Calendar choice is local UI state only; there is no sync backend yet.
const CalendarSettings = () => {
  const { t } = useTranslation();
  const [calendarType, setCalendarType] = useState<CalendarType>('builtin');

  return (
    <SettingsPage title={t('staff.settings.calendar.title')} description={t('staff.settings.calendar.description')}>
      <div className="space-y-6">
        <SettingsSection title={t('staff.calendarSync.providersTitle')} description={t('staff.calendarSync.providersDescription')}>
          <div role="radiogroup" aria-label={t('staff.calendarSync.providersTitle')} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProviderCard
              icon={CalendarCheck}
              title={t('staff.calendarSync.builtinTitle')}
              description={t('staff.calendarSync.builtinDescription')}
              selected={calendarType === 'builtin'}
              onSelect={() => setCalendarType('builtin')}
              badge={<Badge variant="success"><CheckCircle2 aria-hidden="true" />{t('staff.calendarSync.active')}</Badge>}
            />
            <ProviderCard
              icon={CalendarDays}
              title={t('staff.calendarSync.googleTitle')}
              description={t('staff.calendarSync.googleDescription')}
              selected={calendarType === 'google'}
              onSelect={() => setCalendarType('google')}
              badge={<Badge variant="muted">{t('staff.calendarSync.notConnected')}</Badge>}
            >
              {calendarType === 'google' && (
                <Button type="button" size="sm" className="self-start">
                  <Link2 aria-hidden="true" />
                  {t('staff.calendarSync.connectGoogle')}
                </Button>
              )}
            </ProviderCard>
          </div>
        </SettingsSection>

        <Alert variant="info">
          <Info aria-hidden="true" />
          <AlertTitle className="font-semibold">{t('staff.calendarSync.aboutTitle')}</AlertTitle>
          <AlertDescription className="text-muted-foreground">{t('staff.calendarSync.aboutDescription')}</AlertDescription>
        </Alert>
      </div>
    </SettingsPage>
  );
};

interface ProviderCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  badge: ReactNode;
  children?: ReactNode;
}

function ProviderCard({ icon: Icon, title, description, selected, onSelect, badge, children }: ProviderCardProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-card transition-colors sm:p-5', selected && 'border-primary ring-1 ring-primary')}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
      <Button type="button" role="radio" aria-checked={selected} variant={selected ? 'secondary' : 'outline'} size="sm" className="self-start" onClick={onSelect} aria-label={title}>
        {selected ? t('staff.calendarSync.selected') : t('staff.calendarSync.use')}
      </Button>
    </div>
  );
}

export default CalendarSettings;
