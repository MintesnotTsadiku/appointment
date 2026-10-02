import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import type { AvailabilityLevel, DaySchedule } from '../lib/schedule';
import { InheritHours } from './inherit-hours';
import { PerDayTemplates } from './per-day-templates';
import { QuickTemplates } from './quick-templates';

interface ScheduleTemplatesProps {
  level: AvailabilityLevel;
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  onUseDefaultChange: (useDefault: boolean) => void;
  parentSchedule?: DaySchedule[];
  serviceName?: string;
  locationName?: string;
  timeFormat: ClockFormat;
}

/** Template helpers per level: location gets per-day presets; service/provider can inherit from their parent. */
export function ScheduleTemplates({ level, schedule, onChange, onUseDefaultChange, parentSchedule, serviceName, locationName, timeFormat }: ScheduleTemplatesProps) {
  const { t } = useTranslation();

  if (level === 'location') {
    return (
      <>
        <QuickTemplates schedule={schedule} onChange={onChange} timeFormat={timeFormat} description={t('staff.availability.quickDescription.location')} defaultOpen />
        <PerDayTemplates schedule={schedule} onChange={onChange} timeFormat={timeFormat} />
      </>
    );
  }

  // Templates on inherited levels switch off default hours, as the editor would.
  const apply = (next: DaySchedule[]) => {
    onChange(next);
    onUseDefaultChange(false);
  };
  const hasParent = parentSchedule?.some((d) => d.isOpen && d.ranges.length > 0);
  const parentKind = level === 'provider' && serviceName ? 'service' : 'location';

  return (
    <>
      {hasParent && parentSchedule && (
        <InheritHours
          level={level}
          parentSchedule={parentSchedule}
          parentKind={parentKind}
          parentName={parentKind === 'service' ? serviceName : locationName}
          timeFormat={timeFormat}
          onApply={apply}
        />
      )}
      <QuickTemplates schedule={schedule} onChange={apply} timeFormat={timeFormat} description={t(`staff.availability.quickDescription.${level}`)} />
    </>
  );
}
