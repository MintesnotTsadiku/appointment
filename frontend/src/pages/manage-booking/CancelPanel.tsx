import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { fill, formatMoney } from './format';
import { SELF_SERVICE_API, type ManageView } from './types';

export interface CancelResult {
  fee: number;
  refund: number;
  amount_paid: number;
}

/** Shows what a cancel costs under the business's policy before the customer confirms. */
export function CancelPanel({ view, onCancelled, onKeep }: { view: ManageView; onCancelled: (result: CancelResult) => void; onKeep: () => void }) {
  const { t } = useTranslation();
  const { rules, currency } = view;
  const [accepted, setAccepted] = useState(false);
  const [problem, setProblem] = useState('');
  const { call, loading } = useFrappePostCall<{ message: CancelResult }>(`${SELF_SERVICE_API}.cancel`);
  const needsConsent = rules.fee > 0;

  async function confirm() {
    setProblem('');
    try {
      const result = await call({ token: view.token, accept_fee: accepted ? 1 : 0, slug: view.business.slug });
      onCancelled(result.message);
    } catch (error) {
      setProblem(serverErrorMessage(error) || t('customerManage.failed'));
    }
  }

  return (
    <section data-qa="manage-cancel" className="space-y-4">
      <div data-qa="manage-cancel-terms" data-qa-state={rules.cancel_late ? 'late' : 'free'} className="space-y-2 rounded-xl border border-[var(--border-default)] p-4 text-sm">
        <p className="font-medium text-[var(--text-primary)]">
          {rules.cancel_late
            ? fill(t('customerManage.cancelLate'), rules.cancellation_window_hours, formatMoney(rules.fee, currency))
            : t('customerManage.cancelFree')}
        </p>
        {rules.amount_paid > 0 && (
          <p className="text-[var(--text-secondary)]">
            {rules.refund > 0
              ? fill(t('customerManage.refundLine'), formatMoney(rules.amount_paid, currency), formatMoney(rules.refund, currency))
              : fill(t('customerManage.refundNone'), formatMoney(rules.amount_paid, currency))}
          </p>
        )}
      </div>
      {needsConsent && (
        <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            data-qa="manage-accept-fee"
            className="mt-0.5 h-4 w-4 accent-[var(--accent-primary,currentColor)]"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          {t('customerManage.acceptFee')}
        </label>
      )}
      {problem && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button data-qa="manage-cancel-confirm" variant="destructive" disabled={loading || (needsConsent && !accepted)} onClick={() => void confirm()}>
          {t('customerManage.cancelConfirm')}
        </Button>
        <Button variant="outline" onClick={onKeep}>
          {t('customerManage.keep')}
        </Button>
      </div>
    </section>
  );
}
