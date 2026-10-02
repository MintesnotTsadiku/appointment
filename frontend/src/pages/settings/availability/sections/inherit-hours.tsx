import { useState } from 'react';
import { ArrowDownFromLine, ArrowRight, Building2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { ClockFormat } from '@/lib/time';
import { formatTime, type DaySchedule } from '../lib/schedule';
import { MAX_OFFSET, OFFSET_PRESETS, offsetProviderSchedule, offsetServiceSchedule, previewOffset } from '../lib/templates';
import { CollapsibleSection } from './collapsible-section';

interface InheritHoursProps {
  level: 'service' | 'provider';
  parentSchedule: DaySchedule[];
  /** Which schedule is the parent: the service's (provider tab) or the location's. */
  parentKind: 'service' | 'location';
  parentName?: string;
  timeFormat: ClockFormat;
  onApply: (schedule: DaySchedule[]) => void;
}

/** Copy the parent's hours, optionally starting later and/or ending earlier. */
export function InheritHours({ level, parentSchedule, parentKind, parentName, timeFormat, onApply }: InheritHoursProps) {
  const { t } = useTranslation();
  const [startOffset, setStartOffset] = useState(0);
  const [endOffset, setEndOffset] = useState(0);
  const hasOffset = startOffset !== 0 || endOffset !== 0;
  const offset = level === 'service' ? offsetServiceSchedule : offsetProviderSchedule;
  const title = parentKind === 'service' ? t('staff.availability.inheritFromService') : t('staff.availability.inheritFromLocation');

  return (
    <CollapsibleSection icon={Building2} title={parentName ? `${title} (${parentName})` : title} description={t('staff.availability.inheritDescription')} defaultOpen>
      <div className="space-y-4">
        <Button type="button" variant="outline" onClick={() => onApply([...parentSchedule])} className="h-auto w-full justify-start whitespace-normal py-3 text-left">
          <ArrowDownFromLine aria-hidden="true" className="text-muted-foreground" />
          <span>
            <span className="block font-medium">{t('staff.availability.copyExactly')}</span>
            <span className="block text-xs font-normal text-muted-foreground">{t('staff.availability.copyExactlyHint')}</span>
          </span>
        </Button>

        <div className="space-y-5 rounded-lg border bg-muted/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">{t('staff.availability.offsetTitle')}</h3>
          <OffsetControl
            label={t('staff.availability.startLater')}
            hint={t('staff.availability.startLaterHint')}
            value={startOffset}
            onChange={setStartOffset}
          />
          <OffsetControl
            label={t('staff.availability.endEarlier')}
            hint={t('staff.availability.endEarlierHint')}
            value={endOffset}
            onChange={setEndOffset}
          />
          <Button type="button" className="w-full" disabled={!hasOffset} onClick={() => onApply(offset(parentSchedule, startOffset, endOffset))}>
            {t('staff.availability.applyOffset')}
          </Button>
          {hasOffset && <OffsetPreview parentSchedule={parentSchedule} startOffset={startOffset} endOffset={endOffset} timeFormat={timeFormat} />}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function OffsetControl({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-foreground">
        {label}: <span className="tabular-nums text-primary">{value === 0 ? t('staff.availability.noOffset') : `${value} ${t('staff.availability.minutesShort')}`}</span>
      </legend>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={t('staff.availability.decrease')} onClick={() => onChange(Math.max(0, value - 15))} disabled={value <= 0}>
          <Minus aria-hidden="true" />
        </Button>
        {OFFSET_PRESETS.map((preset) => (
          <Button key={preset} type="button" size="sm" className="h-8 px-2.5 text-xs tabular-nums" variant={value === preset ? 'default' : 'ghost'} aria-pressed={value === preset} onClick={() => onChange(preset)}>
            {preset < 60 ? `${preset} ${t('staff.availability.minutesShort')}` : `${preset / 60} ${t('staff.availability.hoursShort')}`}
          </Button>
        ))}
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label={t('staff.availability.increase')} onClick={() => onChange(Math.min(MAX_OFFSET, value + 15))} disabled={value >= MAX_OFFSET}>
          <Plus aria-hidden="true" />
        </Button>
        {value !== 0 && (
          <Button type="button" variant="link" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange(0)}>
            {t('staff.availability.reset')}
          </Button>
        )}
      </div>
    </fieldset>
  );
}

function OffsetPreview({ parentSchedule, startOffset, endOffset, timeFormat }: { parentSchedule: DaySchedule[]; startOffset: number; endOffset: number; timeFormat: ClockFormat }) {
  const { t } = useTranslation();
  const rows = previewOffset(parentSchedule, startOffset, endOffset);
  const more = parentSchedule.filter((d) => d.isOpen).length > 3;
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-foreground">{t('staff.availability.preview')}</p>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {rows.map((row) => (
          <li key={row.day} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <span>{t(`staff.availability.days.${row.day}`)}</span>
            <span className="flex flex-wrap items-center gap-1.5 tabular-nums">
              <s>{formatTime(row.from, timeFormat)} – {formatTime(row.to, timeFormat)}</s>
              <ArrowRight aria-hidden="true" className="h-3 w-3" />
              <span className="font-medium text-foreground">{formatTime(row.start, timeFormat)} – {formatTime(row.end, timeFormat)}</span>
            </span>
          </li>
        ))}
        {more && <li>{t('staff.availability.andMore')}</li>}
      </ul>
    </div>
  );
}
