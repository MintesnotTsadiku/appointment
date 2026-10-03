import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { CalendarX2, CheckCircle2, Phone } from 'lucide-react';
import { Button } from '@/components/button';
import LanguageToggle from '@/components/language-toggle';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/lib/i18n';
import { useBookingBrand } from '@/public-experience/bookingTheme';
import { brandLogo } from '@/public-experience/templates/content';
import '@/public-experience/platform.css';
import { BookingSummary } from './BookingSummary';
import { CancelPanel, type CancelResult } from './CancelPanel';
import { fill, formatMoney } from './format';
import { PaymentPanel } from './PaymentPanel';
import { ReschedulePanel } from './ReschedulePanel';
import { SELF_SERVICE_API, type ManageResponse, type ManageView } from './types';

type Mode = 'overview' | 'reschedule' | 'cancel';

/** Public page behind the manage link in customer emails: reschedule or cancel one booking. */
export default function ManageBookingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const { theme } = useTheme();
  const brand = useBookingBrand(slug, theme === 'dark' ? 'dark' : 'light');
  const { data, isLoading } = useFrappeGetCall<{ message: ManageResponse }>(
    `${SELF_SERVICE_API}.view`,
    { token, slug },
    token ? `manage-${token}` : null,
    { revalidateOnFocus: false }
  );
  const [view, setView] = useState<ManageView | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [moved, setMoved] = useState(false);
  const [cancelled, setCancelled] = useState<CancelResult | null>(null);

  useEffect(() => {
    if (data?.message?.valid) setView(data.message);
  }, [data]);

  const businessName = view?.business.name ?? brand.config?.identity.applicationName ?? '';
  let body: ReactNode;
  if (cancelled) body = <Cancelled result={cancelled} currency={view?.currency ?? 'ETB'} slug={slug} />;
  else if (isLoading && !view) body = <p className="text-sm text-[var(--text-secondary)]">…</p>;
  else if (!view) body = <Invalid slug={slug} />;
  else
    body = (
      <div className="space-y-6">
        {moved && (
          <p role="status" data-qa="manage-moved" className="flex items-start gap-2 rounded-xl border border-[var(--border-default)] p-4 text-sm text-[var(--text-primary)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            {t('customerManage.rescheduled')}
          </p>
        )}
        <BookingSummary view={view} />
        {view.payment && view.payment.status !== 'Paid' && view.payment.status !== 'Refunded' && (
          <PaymentPanel view={view} onPayment={(payment) => setView({ ...view, payment, booking: { ...view.booking, status: payment.status === 'Paid' ? 'Confirmed' : view.booking.status } })} />
        )}
        {view.payment?.status === 'Paid' && (
          <p data-qa="manage-paid" className="text-sm font-medium">
            {fill(t('payments.paidLine'), formatMoney(view.payment.amount, view.payment.currency))}
          </p>
        )}
        <p className="text-xs text-[var(--text-secondary)]">
          {t('customerManage.reference')}: <span className="font-mono">{view.booking.reference}</span>
          {view.booking.status === 'Pending' && !view.payment && <> · {t('customerManage.statusPending')}</>}
        </p>
        {mode === 'reschedule' && (
          <ReschedulePanel
            view={view}
            onCancel={() => setMode('overview')}
            onMoved={(next) => {
              setView(next);
              setMoved(true);
              setMode('overview');
              navigate(`/${next.business.slug}/booking/${next.token}`, { replace: true });
            }}
          />
        )}
        {mode === 'cancel' && <CancelPanel view={view} onKeep={() => setMode('overview')} onCancelled={setCancelled} />}
        {mode === 'overview' && <Actions view={view} onMode={setMode} />}
        <Contact view={view} />
      </div>
    );

  return (
    <div className="booking-experience min-h-screen text-[var(--text-primary)]" data-qa="manage-booking" style={{ ...brand.style, backgroundColor: 'var(--bg-primary)' }}>
      <header className="border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href={brand.publicRoot} className="flex min-w-0 items-center gap-3 no-underline">
            {brand.config && brandLogo(brand.config.compiledDesign) ? (
              <img className="pe-brand-logo shrink-0" src={brandLogo(brand.config.compiledDesign)} alt="" />
            ) : (
              <span className="pe-brand-mark shrink-0" aria-hidden="true">✦</span>
            )}
            <span className="truncate font-semibold" style={{ fontFamily: 'var(--booking-font-display)' }}>
              {businessName}
            </span>
          </a>
          <LanguageToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold" style={{ fontFamily: 'var(--booking-font-display)' }}>
          {t('customerManage.title')}
        </h1>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary,transparent)] p-5 sm:p-6">{body}</div>
      </main>
    </div>
  );
}

function Actions({ view, onMode }: { view: ManageView; onMode: (mode: Mode) => void }) {
  const { t } = useTranslation();
  const { rules } = view;
  const blocked =
    rules.reschedule_block === 'window'
      ? fill(t('customerManage.blockWindow'), rules.reschedule_window_hours)
      : rules.reschedule_block === 'limit'
        ? t('customerManage.blockLimit')
        : '';
  return (
    <div className="space-y-3">
      {blocked && (
        <p data-qa="manage-reschedule-blocked" className="text-sm text-[var(--text-secondary)]">
          {blocked}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {rules.can_reschedule && (
          <Button data-qa="manage-start-reschedule" onClick={() => onMode('reschedule')}>
            {t('customerManage.reschedule')}
          </Button>
        )}
        {rules.can_cancel && (
          <Button data-qa="manage-start-cancel" variant="outline" onClick={() => onMode('cancel')}>
            {t('customerManage.cancel')}
          </Button>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{fill(t('customerManage.policyNote'), view.business.name)}</p>
    </div>
  );
}

function Contact({ view }: { view: ManageView }) {
  const { t } = useTranslation();
  const { phone, email, name } = view.business;
  if (!phone && !email) return null;
  return (
    <div data-qa="manage-contact" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-4 text-sm">
      <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
        <Phone className="h-4 w-4" aria-hidden="true" />
        {fill(t('customerManage.contact'), name)}
      </span>
      {phone && <a href={`tel:${phone.replace(/\s+/g, '')}`} className="underline underline-offset-4">{phone}</a>}
      {email && <a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a>}
    </div>
  );
}

function Invalid({ slug }: { slug?: string }) {
  const { t } = useTranslation();
  return (
    <div data-qa="manage-invalid" className="space-y-3 text-center">
      <CalendarX2 className="mx-auto h-10 w-10 text-[var(--text-secondary)]" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{t('customerManage.invalidTitle')}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{t('customerManage.invalidBody')}</p>
      {slug && (
        <Button asChild variant="outline">
          <a href={`/${slug}/book`}>{t('customerManage.bookAgain')}</a>
        </Button>
      )}
    </div>
  );
}

function Cancelled({ result, currency, slug }: { result: CancelResult; currency: string; slug?: string }) {
  const { t } = useTranslation();
  return (
    <div data-qa="manage-cancelled" className="space-y-3 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{t('customerManage.cancelled')}</h2>
      {result.fee > 0 && (
        <p data-qa="manage-cancelled-fee" className="text-sm text-[var(--text-secondary)]">
          {fill(t('customerManage.cancelledFee'), formatMoney(result.fee, currency), formatMoney(result.refund, currency))}
        </p>
      )}
      {slug && (
        <Button asChild variant="outline">
          <a href={`/${slug}/book`}>{t('customerManage.bookAgain')}</a>
        </Button>
      )}
    </div>
  );
}
