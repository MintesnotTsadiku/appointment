import { Clock, Coffee, Zap } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import { formatTime, type DaySchedule } from '../lib/schedule';
import { applyTemplate, calculateEndTime, QUICK_TEMPLATES, WEEKDAYS } from '../lib/templates';
import { CollapsibleSection } from './collapsible-section';

interface QuickTemplatesProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  timeFormat: ClockFormat;
  description: string;
  defaultOpen?: boolean;
}

/** One-click Monday–Friday schedules. */
export function QuickTemplates({ schedule, onChange, timeFormat, description, defaultOpen }: QuickTemplatesProps) {
  const { t } = useTranslation();
  return (
    <CollapsibleSection icon={Zap} title={t('staff.availability.quickTemplates')} description={description} defaultOpen={defaultOpen}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_TEMPLATES.map((template) => (
          <Button
            key={`${template.startTime}-${template.includeLunch}`}
            type="button"
            variant="outline"
            onClick={() => onChange(applyTemplate(schedule, WEEKDAYS, template))}
            className="h-auto w-full justify-start whitespace-normal py-3 text-left"
          >
            <Clock aria-hidden="true" className="text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-medium tabular-nums">
                {formatTime(template.startTime, timeFormat)} – {formatTime(calculateEndTime(template.startTime, template.duration), timeFormat)}
              </span>
              {template.includeLunch && (
                <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Coffee aria-hidden="true" className="!size-3" />
                  {t('staff.availability.includesLunch')}
                </span>
              )}
            </span>
          </Button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
