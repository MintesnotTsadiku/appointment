import type { ReactNode } from 'react';
import { Building2, CalendarCheck, UserRound } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import type { AvailabilityLevel } from '../lib/schedule';

const LEVELS: Array<{ value: AvailabilityLevel; icon: typeof Building2 }> = [
  { value: 'location', icon: Building2 },
  { value: 'service', icon: CalendarCheck },
  { value: 'provider', icon: UserRound },
];

interface ScopeTabsProps {
  value: AvailabilityLevel;
  onChange: (level: AvailabilityLevel) => void;
  children: ReactNode;
}

/** Location / Service / Provider switch; only the active panel is mounted. */
export function ScopeTabs({ value, onChange, children }: ScopeTabsProps) {
  const { t } = useTranslation();
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as AvailabilityLevel)}>
      <TabsList className="grid w-full grid-cols-3 sm:inline-grid sm:w-auto" aria-label={t('staff.availability.scopeLabel')}>
        {LEVELS.map(({ value: level, icon: Icon }) => (
          <TabsTrigger key={level} value={level} data-qa={`availability-tab-${level}`} className="min-w-0 sm:px-4">
            <Icon aria-hidden="true" />
            <span className="truncate">{t(`staff.availability.levels.${level}`)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {LEVELS.map(({ value: level }) => (
        <TabsContent key={level} value={level} className="mt-6 space-y-6">
          {level === value && children}
        </TabsContent>
      ))}
    </Tabs>
  );
}
