import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { NativeSelect } from '@/components/native-select';
import { useTranslation } from '@/lib/i18n';

interface ReceptionStateProps {
  location: string;
  state?: string;
  refresh: () => void;
}

/** Opens or closes reception at one location; the server records each change as an event. */
export function ReceptionState({ location, state, refresh }: ReceptionStateProps) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const { call, loading } = useFrappePostCall('appointment.scheduler.reception_state.set_state');

  async function change(next: string) {
    setError('');
    try {
      await call({ location, state: next });
      refresh();
    } catch {
      setError(t('staff.reception.stateError'));
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {/* Native select: QA drives it with selectOption by the "Open" / "Closed" values. */}
      <NativeSelect
        data-qa="reception-state"
        aria-label={t('staff.reception.receptionState')}
        value={state || 'Unconfigured'}
        disabled={loading}
        onChange={(e) => void change(e.target.value)}
        wrapperClassName="w-auto"
        className="h-8 text-xs"
      >
        <option value="Unconfigured" disabled>{t('staff.reception.stateUnconfigured')}</option>
        <option value="Open">{t('staff.reception.stateOpen')}</option>
        <option value="Closed">{t('staff.reception.stateClosed')}</option>
      </NativeSelect>
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </span>
  );
}
