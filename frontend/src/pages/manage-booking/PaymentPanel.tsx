import { useEffect, useRef, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Check, Copy, CreditCard, Download, Landmark } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { fill, formatMoney, formatWhen } from './format';
import type { ManageView, PaymentView } from './types';

const PAYMENTS = 'appointment.scheduler.payments';
const CHAPA = 'appointment.scheduler.payments_chapa';
const STATUS_KEY: Record<PaymentView['status'], string> = {
  'Awaiting payment': 'payments.statusAwaiting',
  Submitted: 'payments.statusSubmitted',
  Paid: 'payments.statusPaid',
  Rejected: 'payments.statusRejected',
  Expired: 'payments.statusExpired',
  Refunded: 'payments.statusRefunded',
};

/** Download links for the booking's payment and refund receipts. */
export function ReceiptLinks({ view }: { view: ManageView }) {
  const { t } = useTranslation();
  const receipts = view.payment?.receipts ?? [];
  if (!receipts.length) return null;
  return (
    <ul className="space-y-1 text-sm" data-qa="manage-receipts">
      {receipts.map((receipt) => (
        <li key={receipt.name}>
          <a
            data-qa="manage-receipt"
            download
            className="inline-flex items-center gap-1.5 font-medium text-[var(--accent-primary)] underline-offset-4 hover:underline"
            href={`/api/method/appointment.scheduler.receipts.download?${new URLSearchParams({ token: view.token, slug: view.business.slug ?? '', receipt: receipt.name })}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {fill(t(receipt.kind === 'Refund' ? 'payments.refundReceipt' : 'payments.receipt'), receipt.receipt_number)}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Payment for a held booking: bank accounts and proof, or Chapa checkout. */
export function PaymentPanel({ view, onPayment }: { view: ManageView; onPayment: (payment: PaymentView) => void }) {
  const { t, language } = useTranslation();
  const payment = view.payment!;
  const open = payment.status === 'Awaiting payment' || payment.status === 'Rejected';
  return (
    <section data-qa="manage-payment" data-qa-state={payment.status} className="space-y-4 rounded-xl border border-[var(--border-default)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          {payment.method === 'Chapa' ? <CreditCard className="h-4 w-4" aria-hidden="true" /> : <Landmark className="h-4 w-4" aria-hidden="true" />}
          {t('payments.title')}
        </h2>
        <span data-qa="manage-payment-status" className="rounded-full border border-[var(--border-default)] px-2.5 py-0.5 text-xs">
          {t(STATUS_KEY[payment.status])}
        </span>
      </div>
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{formatMoney(payment.amount, payment.currency)}</span>
        {payment.balance_due > 0 && (
          <span className="text-[var(--text-secondary)]"> · {t('payments.balance')}: {formatMoney(payment.balance_due, payment.currency)}</span>
        )}
      </p>
      {open && payment.hold_expires_at && (
        <p className="text-sm text-[var(--text-secondary)]">{fill(t('payments.heldUntil'), formatWhen(payment.hold_expires_at, view.booking.timezone, language))}</p>
      )}
      {payment.status === 'Rejected' && payment.reject_reason && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {fill(t('payments.rejected'), payment.reject_reason)}
        </p>
      )}
      {payment.status === 'Submitted' && <p className="text-sm">{t('payments.submitted')}</p>}
      {open && payment.method === 'Bank transfer' && <BankTransfer view={view} payment={payment} onPayment={onPayment} />}
      {open && payment.method === 'Chapa' && <ChapaPay view={view} payment={payment} onPayment={onPayment} />}
    </section>
  );
}

function BankTransfer({ view, payment, onPayment }: { view: ManageView; payment: PaymentView; onPayment: (payment: PaymentView) => void }) {
  const { t } = useTranslation();
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState('');
  const { call, loading } = useFrappePostCall<{ message: PaymentView }>(`${PAYMENTS}.submit_proof`);

  async function submit() {
    setProblem('');
    if (!reference.trim() && !file) return setProblem(t('paymentsServer.needDetails'));
    if (file && file.size > 5 * 1024 * 1024) return setProblem(t('paymentsServer.fileSize'));
    try {
      const fileData = file ? await readAsDataUrl(file) : undefined;
      const result = await call({ token: view.token, slug: view.business.slug, reference, file_name: file?.name, file_data: fileData });
      onPayment(result.message);
    } catch (error) {
      setProblem(serverErrorMessage(error) || t('customerManage.failed'));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">{fill(t('payments.payTo'), formatMoney(payment.amount, payment.currency))}</p>
      <ul data-qa="manage-bank-accounts" className="space-y-2">
        {payment.accounts.map((account) => (
          <li key={account.account_number} className="rounded-lg bg-[var(--bg-secondary,transparent)] p-3 text-sm">
            <p className="font-medium">{account.bank}</p>
            <p className="text-[var(--text-secondary)]">{account.account_name}</p>
            <p className="flex items-center gap-2 font-mono">
              {account.account_number}
              <CopyButton value={account.account_number} />
            </p>
            {account.note && <p className="text-xs text-[var(--text-secondary)]">{account.note}</p>}
          </li>
        ))}
      </ul>
      <p className="text-sm text-[var(--text-secondary)]">
        {fill(t('payments.referenceHint'), view.booking.reference)} <CopyButton value={view.booking.reference} />
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="payment-reference">{t('payments.referenceLabel')}</Label>
        <Input id="payment-reference" data-qa="manage-payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-proof">{t('payments.proofLabel')}</Label>
        <Input id="payment-proof" data-qa="manage-payment-proof" type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </div>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
      <Button data-qa="manage-payment-submit" disabled={loading} onClick={() => void submit()}>
        {t('payments.submitProof')}
      </Button>
    </div>
  );
}

function ChapaPay({ view, payment, onPayment }: { view: ManageView; payment: PaymentView; onPayment: (payment: PaymentView) => void }) {
  const { t } = useTranslation();
  const [problem, setProblem] = useState('');
  const [checking, setChecking] = useState(false);
  const started = useRef(false);
  const { call: start, loading } = useFrappePostCall<{ message: { checkout_url: string } }>(`${CHAPA}.start`);
  const { call: confirmReturn } = useFrappePostCall<{ message: PaymentView }>(`${CHAPA}.confirm_return`);

  async function pay() {
    setProblem('');
    try {
      const result = await start({ token: view.token, slug: view.business.slug });
      window.location.assign(result.message.checkout_url);
    } catch (error) {
      setProblem(serverErrorMessage(error) || t('customerManage.failed'));
    }
  }

  // Back from Chapa (?payment=chapa) the server verifies; ?pay=chapa starts checkout right after booking.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'chapa') {
      setChecking(true);
      confirmReturn({ token: view.token, slug: view.business.slug })
        .then((result) => {
          if (result.message.status === 'Paid') onPayment(result.message);
          else setProblem(t('payments.chapaPending'));
        })
        .catch(() => setProblem(t('payments.chapaPending')))
        .finally(() => setChecking(false));
    } else if (params.get('pay') === 'chapa') {
      void pay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {checking && <p className="text-sm">{t('payments.chapaChecking')}</p>}
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
      <Button data-qa="manage-pay-chapa" disabled={loading || checking} onClick={() => void pay()}>
        {fill(t('payments.payChapa'), formatMoney(payment.amount, payment.currency))}
      </Button>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      {copied ? t('customerBooking.copied') : t('customerBooking.copy')}
    </button>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
