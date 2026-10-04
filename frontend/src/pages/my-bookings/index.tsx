import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { CalendarClock, CalendarX2, LogOut, MailCheck } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import LanguageToggle from '@/components/language-toggle';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { useBookingBrand } from '@/public-experience/bookingTheme';
import { brandLogo } from '@/public-experience/templates/content';
import { fill, formatWhen } from '@/pages/manage-booking/format';
import '@/public-experience/platform.css';

const API = 'appointment.scheduler.my_bookings';

interface BookingRow {
  reference: string;
  service: string;
  provider: string | null;
  resources: string[];
  starts_at: string;
  timezone: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';
  quantity: number;
  payment_status: string | null;
  upcoming: boolean;
  manage_path: string | null;
}

interface Listing {
  valid: boolean;
  email?: string;
  upcoming?: BookingRow[];
  past?: BookingRow[];
}

interface StoredSession {
  session: string;
  email: string;
}

const STATUS_KEY: Record<BookingRow['status'], string> = {
  Pending: 'staff.status.pending',
  Confirmed: 'staff.status.confirmed',
  Completed: 'staff.status.completed',
  Cancelled: 'staff.status.cancelled',
  'No Show': 'staff.status.noShow',
};

const storageKey = (slug: string) => `appointment.myBookings.${slug}`;

/**
 * One exchange per one-time token for the whole page lifetime. The page can mount twice
 * while translations load; a second request would find the link already used.
 */
const exchanges = new Map<string, Promise<StoredSession>>();

function readSession(slug: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(slug: string, value: StoredSession | null) {
  try {
    if (value) window.localStorage.setItem(storageKey(slug), JSON.stringify(value));
    else window.localStorage.removeItem(storageKey(slug));
  } catch {
    // The page still works for this visit without storage.
  }
}

type Stage = 'loading' | 'form' | 'sent' | 'invalid' | 'list';

/** A customer's bookings with one business, opened by an emailed one-time link. */
export default function MyBookingsPage() {
  const { t, language } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const { theme } = useTheme();
  const brand = useBookingBrand(slug, theme === 'dark' ? 'dark' : 'light');
  const [stage, setStage] = useState<Stage>('loading');
  const [listing, setListing] = useState<Listing | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const { call: openLink } = useFrappePostCall<{ message: StoredSession }>(`${API}.open_link`);

  const load = useCallback(async (value: StoredSession) => {
    const query = new URLSearchParams({ slug, session: value.session, email: value.email });
    const response = await fetch(`/api/method/${API}.bookings?${query}`, { headers: { Accept: 'application/json' } });
    const data = (await response.json())?.message as Listing | undefined;
    if (!data?.valid) {
      writeSession(slug, null);
      setSession(null);
      setStage('form');
      return;
    }
    setListing(data);
    setStage('list');
  }, [slug]);

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      if (!exchanges.has(token)) exchanges.set(token, openLink({ slug, token }).then((result) => result.message));
      exchanges.get(token)!
        .then((value) => {
          writeSession(slug, value);
          setSession(value);
          // The link is spent; drop it from the address bar.
          setParams({}, { replace: true });
          return load(value);
        })
        .catch(() => {
          setParams({}, { replace: true });
          setStage('invalid');
        });
      return;
    }
    const stored = readSession(slug);
    if (stored) {
      setSession(stored);
      void load(stored);
    } else {
      setStage('form');
    }
    // Run once per visit; the token is consumed above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const businessName = brand.config?.identity.applicationName ?? '';
  const signOut = () => {
    writeSession(slug, null);
    setSession(null);
    setListing(null);
    setStage('form');
  };

  let body: ReactNode;
  if (stage === 'loading') body = <p className="text-sm text-[var(--text-secondary)]" data-qa="my-bookings-loading">{t('myBookings.opening')}</p>;
  else if (stage === 'form') body = <RequestForm slug={slug} language={language} onSent={() => setStage('sent')} />;
  else if (stage === 'sent') body = <Sent businessName={businessName} onAgain={() => setStage('form')} />;
  else if (stage === 'invalid') body = <InvalidLink onAgain={() => setStage('form')} />;
  else body = <Bookings listing={listing!} slug={slug} onSignOut={signOut} email={session?.email ?? listing?.email ?? ''} />;

  return (
    <div className="booking-experience min-h-screen text-[var(--text-primary)]" data-qa="my-bookings" style={{ ...brand.style, backgroundColor: 'var(--bg-primary)' }}>
      <header className="border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href={brand.publicRoot} className="flex min-w-0 items-center gap-3 no-underline">
            {brand.config && brandLogo(brand.config.compiledDesign) ? (
              <img className="pe-brand-logo shrink-0" src={brandLogo(brand.config.compiledDesign)} alt="" />
            ) : (
              <span className="pe-brand-mark shrink-0" aria-hidden="true">✦</span>
            )}
            <span className="truncate font-semibold" style={{ fontFamily: 'var(--booking-font-display)' }}>{businessName}</span>
          </a>
          <LanguageToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold" style={{ fontFamily: 'var(--booking-font-display)' }}>{t('myBookings.title')}</h1>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary,transparent)] p-5 sm:p-6">{body}</div>
      </main>
    </div>
  );
}

function RequestForm({ slug, language, onSent }: { slug: string; language: string; onSent: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { call, loading } = useFrappePostCall(`${API}.request_link`);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await call({ slug, email: email.trim(), language });
      onSent();
    } catch (err) {
      setError(serverErrorMessage(err) || t('myBookings.failed'));
    }
  };
  return (
    <form className="space-y-4" onSubmit={submit} data-qa="my-bookings-form">
      <p className="text-sm text-[var(--text-secondary)]">{t('myBookings.intro')}</p>
      <div className="space-y-1.5">
        <Label htmlFor="my-bookings-email">{t('bookingForm.email')}</Label>
        <Input id="my-bookings-email" data-qa="my-bookings-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" data-qa="my-bookings-send" disabled={loading || !email.trim()}>{t('myBookings.send')}</Button>
    </form>
  );
}

function Sent({ businessName, onAgain }: { businessName: string; onAgain: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 text-center" data-qa="my-bookings-sent" role="status">
      <MailCheck className="mx-auto h-10 w-10 text-[var(--text-secondary)]" aria-hidden="true" />
      <p className="text-sm">{fill(t('myBookings.sent'), businessName)}</p>
      <Button type="button" variant="outline" onClick={onAgain}>{t('myBookings.otherEmail')}</Button>
    </div>
  );
}

function InvalidLink({ onAgain }: { onAgain: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 text-center" data-qa="my-bookings-invalid">
      <CalendarX2 className="mx-auto h-10 w-10 text-[var(--text-secondary)]" aria-hidden="true" />
      <p className="text-sm">{t('myBookings.invalid')}</p>
      <Button type="button" onClick={onAgain}>{t('myBookings.send')}</Button>
    </div>
  );
}

function Bookings({ listing, slug, email, onSignOut }: { listing: Listing; slug: string; email: string; onSignOut: () => void }) {
  const { t } = useTranslation();
  const upcoming = listing.upcoming ?? [];
  const past = listing.past ?? [];
  return (
    <div className="space-y-6" data-qa="my-bookings-list">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-secondary)]">{fill(t('myBookings.signedInAs'), email)}</span>
        <div className="flex gap-2">
          <Button asChild size="sm"><a href={`/${slug}/book`}>{t('customerManage.bookAgain')}</a></Button>
          <Button type="button" size="sm" variant="outline" data-qa="my-bookings-sign-out" onClick={onSignOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('myBookings.signOut')}
          </Button>
        </div>
      </div>
      <Section title={t('myBookings.upcoming')} rows={upcoming} qa="my-bookings-upcoming" />
      <Section title={t('myBookings.past')} rows={past} qa="my-bookings-past" muted />
    </div>
  );
}

function Section({ title, rows, qa, muted = false }: { title: string; rows: BookingRow[]; qa: string; muted?: boolean }) {
  const { t, language } = useTranslation();
  return (
    <section className="space-y-3" data-qa={qa}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t('myBookings.none')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.reference} data-qa="my-booking" data-qa-state={row.status}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border-default)] p-4 ${muted ? 'opacity-80' : ''}`}>
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {row.service}
                  {row.quantity > 1 && <span> {t('bookingPicker.times').replace('{0}', String(row.quantity))}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {formatWhen(row.starts_at, row.timezone, language)}
                </p>
                {(row.provider || row.resources.length > 0) && (
                  <p className="text-sm text-[var(--text-secondary)]">{[row.provider, ...row.resources].filter(Boolean).join(' · ')}</p>
                )}
                <p className="text-xs text-[var(--text-secondary)]">
                  {t(STATUS_KEY[row.status])}
                  {row.payment_status === 'Awaiting payment' && <> · {t('myBookings.paymentNeeded')}</>}
                  {' · '}<span className="font-mono">{row.reference}</span>
                </p>
              </div>
              {row.manage_path && (
                <Button asChild size="sm" variant="outline">
                  <a data-qa="my-booking-manage" href={row.manage_path}>{t('myBookings.manage')}</a>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
