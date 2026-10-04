import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { addDays } from 'date-fns';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { DateTimeSelector } from '@/pages/booking-v2/components/DateTimeSelector';
import type { TimeSlot } from '@/pages/booking-v2/types';
import { fill } from './format';
import { SELF_SERVICE_API, type ManageView } from './types';
import { useOfferingSlots } from './useOfferingSlots';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** The scheduler's date and time picker for the same offering, then one confirm. */
export function ReschedulePanel({ view, onMoved, onCancel }: { view: ManageView; onMoved: (next: ManageView) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date | null>(null);
  const [month, setMonth] = useState(new Date());
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h' | 'ethiopian'>('12h');
  const [problem, setProblem] = useState('');
  const { slots, loading } = useOfferingSlots(view.booking.offering, view.business.id, date, view.booking.quantity ?? 1);
  const { call, loading: saving } = useFrappePostCall<{ message: ManageView }>(`${SELF_SERVICE_API}.reschedule`);

  async function confirm() {
    if (!slot) return;
    setProblem('');
    try {
      const result = await call({ token: view.token, start_time: slot.start_time, slug: view.business.slug });
      onMoved(result.message);
    } catch (error) {
      setProblem(serverErrorMessage(error) || t('customerManage.failed'));
    }
  }

  return (
    <section data-qa="manage-reschedule" className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">{t('customerManage.rescheduleHint')}</p>
      <DateTimeSelector
        selectedDate={date}
        displayMonth={month}
        onDateSelect={(next) => {
          setDate(next);
          setSlot(null);
        }}
        onMonthChange={setMonth}
        availableDays={ALL_DAYS}
        minDate={new Date()}
        maxDate={addDays(new Date(), 90)}
        availableSlots={slots}
        selectedSlot={slot}
        onSlotSelect={setSlot}
        timeFormat={timeFormat}
        onTimeFormatChange={setTimeFormat}
        timezone={view.booking.timezone}
        loading={loading}
        serviceName={view.booking.service ?? undefined}
        embedded
      />
      {problem && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {problem}
        </p>
      )}
      <p className="text-xs text-[var(--text-secondary)]">{fill(t('customerManage.reschedulesLeft'), view.rules.reschedules_left)}</p>
      <div className="flex flex-wrap gap-2">
        <Button data-qa="manage-reschedule-confirm" disabled={!slot || saving} onClick={() => void confirm()}>
          {t('customerManage.rescheduleConfirm')}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t('customerManage.keep')}
        </Button>
      </div>
    </section>
  );
}
