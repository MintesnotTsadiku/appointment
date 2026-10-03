import { useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';

const API = 'appointment.scheduler.payments';

interface StaffPayment {
  name: string;
  method: string;
  collector: 'Business' | 'Platform';
  status: 'Awaiting payment' | 'Submitted' | 'Paid' | 'Rejected' | 'Expired' | 'Refunded';
  amount: number;
  balance_due: number;
  currency: string;
  hold_expires_at: string | null;
  reference: string | null;
  proof: string | null;
  reject_reason: string | null;
  refund_amount: number | null;
  refund_reference: string | null;
  refund_proof: string | null;
}

const STATUS: Record<StaffPayment['status'], { key: string; variant: 'info' | 'warning' | 'success' | 'destructive' | 'muted' }> = {
  'Awaiting payment': { key: 'payments.statusAwaiting', variant: 'info' },
  Submitted: { key: 'payments.statusSubmitted', variant: 'warning' },
  Paid: { key: 'payments.statusPaid', variant: 'success' },
  Rejected: { key: 'payments.statusRejected', variant: 'destructive' },
  Expired: { key: 'payments.statusExpired', variant: 'muted' },
  Refunded: { key: 'payments.statusRefunded', variant: 'muted' },
};

const money = (amount: number, currency: string) => `${currency} ${Number(amount || 0).toFixed(2)}`;
const proofUrl = (payment: string, kind = 'proof') => `/api/method/${API}.download_proof?payment=${encodeURIComponent(payment)}&kind=${kind}`;

/** Payment for one booking: review a bank transfer, then record a refund. */
export function PaymentSection({ appointment, onChanged }: { appointment: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: StaffPayment[] }>(`${API}.for_appointment`, { appointment }, `booking-payments-${appointment}`);
  const payment = data?.message?.[0];
  if (!payment) return null;
  const status = STATUS[payment.status];
  const refresh = async () => {
    await mutate();
    onChanged();
  };

  return (
    <section className="space-y-3" data-qa="booking-payment" data-qa-state={payment.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{t('payments.title')}</h3>
        <Badge variant={status.variant}>{t(status.key)}</Badge>
      </div>
      <div className="space-y-1 rounded-lg border p-3 text-sm">
        <p className="font-medium tabular-nums">
          {money(payment.amount, payment.currency)} · {payment.method}
        </p>
        {payment.balance_due > 0 && (
          <p className="text-muted-foreground">
            {t('payments.balance')}: {money(payment.balance_due, payment.currency)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {payment.collector === 'Platform' ? t('staff.payments.collectedByPlatform') : t('staff.payments.collectedByBusiness')}
          {payment.hold_expires_at && (payment.status === 'Awaiting payment' || payment.status === 'Rejected') && (
            <> · {t('staff.payments.holdEnds').replace('{0}', `${payment.hold_expires_at.slice(0, 16)} UTC`)}</>
          )}
        </p>
        {payment.reference && <p>{t('staff.payments.referenceLine').replace('{0}', payment.reference)}</p>}
        {payment.reject_reason && <p className="text-destructive">{payment.reject_reason}</p>}
        {payment.proof && (
          <a data-qa="booking-payment-proof" href={proofUrl(payment.name)} target="_blank" rel="noreferrer" className="inline-block text-primary underline-offset-4 hover:underline">
            {t('staff.payments.viewProof')}
          </a>
        )}
        {payment.refund_amount ? (
          <p>
            {t('staff.payments.refundedLine').replace('{0}', money(payment.refund_amount, payment.currency))}
            {payment.refund_reference ? ` · ${payment.refund_reference}` : ''}
          </p>
        ) : null}
      </div>
      {(payment.status === 'Submitted' || payment.status === 'Awaiting payment') && <Review payment={payment} onDone={refresh} />}
      {payment.status === 'Paid' && <Refund payment={payment} onDone={refresh} />}
    </section>
  );
}

function Review({ payment, onDone }: { payment: StaffPayment; onDone: () => Promise<void> }) {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const { call: confirm, loading: confirming } = useFrappePostCall(`${API}.confirm`);
  const { call: reject, loading: rejectingNow } = useFrappePostCall(`${API}.reject`);
  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await onDone();
    } catch (error) {
      toast.error(serverErrorMessage(error) || t('staff.payments.actionFailed'));
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" data-qa="booking-payment-confirm" disabled={confirming} onClick={() => void run(() => confirm({ payment: payment.name }))}>
          {t('staff.payments.confirm')}
        </Button>
        {payment.status === 'Submitted' && !rejecting && (
          <Button size="sm" variant="outline" data-qa="booking-payment-reject" onClick={() => setRejecting(true)}>
            {t('staff.payments.reject')}
          </Button>
        )}
      </div>
      {rejecting && (
        <div className="space-y-2">
          <Label htmlFor="payment-reject-reason">{t('staff.payments.rejectReason')}</Label>
          <Input id="payment-reject-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Button size="sm" variant="destructive" disabled={rejectingNow || !reason.trim()} onClick={() => void run(() => reject({ payment: payment.name, reason }))}>
            {t('staff.payments.rejectConfirm')}
          </Button>
        </div>
      )}
    </div>
  );
}

function Refund({ payment, onDone }: { payment: StaffPayment; onDone: () => Promise<void> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(payment.amount));
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { call, loading } = useFrappePostCall(`${API}.record_refund`);
  if (!open)
    return (
      <Button size="sm" variant="outline" data-qa="booking-payment-refund" onClick={() => setOpen(true)}>
        {t('staff.payments.recordRefund')}
      </Button>
    );
  async function save() {
    try {
      const fileData = file ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }) : undefined;
      await call({ payment: payment.name, amount, reference, file_name: file?.name, file_data: fileData });
      await onDone();
    } catch (error) {
      toast.error(serverErrorMessage(error) || t('staff.payments.actionFailed'));
    }
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="refund-amount">{t('staff.payments.refundAmount')}</Label>
        <Input id="refund-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refund-reference">{t('staff.payments.refundReference')}</Label>
        <Input id="refund-reference" value={reference} onChange={(event) => setReference(event.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="refund-proof">{t('staff.payments.refundProof')}</Label>
        <Input id="refund-proof" type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </div>
      <Button size="sm" className="sm:col-span-2 sm:w-fit" disabled={loading} onClick={() => void save()}>
        {t('staff.payments.saveRefund')}
      </Button>
    </div>
  );
}
