import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { AlertCircle, CalendarClock, Loader2, TimerOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/alert';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import LanguageToggle from '@/components/language-toggle';
import { useSession } from '@/context/session';
import { BUSINESS_PROMPT_API, signupPath } from '@/lib/growth-touchpoints';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand } from '@/lib/platform-brand';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { OnboardingSuccess } from '@/pages/onboarding/OnboardingSuccess';

interface Prefill {
  full_name: string;
  email: string;
  business_name: string;
}

interface Created {
  provider: string;
  business_name: string;
  public_path: string;
  business_path?: string;
  published?: boolean;
  landing: string;
}

type Stage = 'form' | 'pending' | 'live';

/**
 * One-tap setup from the customer-to-business prompt: `/signup?source=customer_prompt&prefill=<token>`.
 *
 * The token reads the name and email from the booking just made (server side, 30 minutes).
 * One submit creates the account, signs in, creates the independent business with its first
 * offering and publishes it, so the person ends on a live booking page.
 */
export default function QuickStartSignup({ prefill, source, refCode }: { prefill: string; source: string; refCode?: string | null }) {
  const { t } = useTranslation();
  const brand = usePlatformBrand();
  const { login } = useFrappeAuth();
  const { reload } = useSession();
  const { data, error: expired, isLoading } = useFrappeGetCall<{ message: Prefill }>(
    `${BUSINESS_PROMPT_API}.read_prefill`,
    { token: prefill },
    `growth-prefill-${prefill}`,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const { call: signup } = useFrappePostCall('appointment.scheduler.registration.signup');
  const { call: quickStart } = useFrappePostCall<{ message: Created }>(`${BUSINESS_PROMPT_API}.quick_start`);
  const [form, setForm] = useState({ full_name: '', email: '', business_name: '', service_name: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    const values = data?.message;
    if (values) setForm((current) => ({ ...current, full_name: values.full_name, email: values.email, business_name: values.business_name }));
  }, [data]);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: event.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    setBusy(true);
    try {
      const account = await signup({ email: form.email, full_name: form.full_name, password: form.password, redirect_to: '/home', source, ref: refCode || undefined });
      if (account?.message?.status === 'pending_approval') {
        setStage('pending');
        return;
      }
      // Sign-up starts the session itself when it can; sign in only when it did not.
      if (!account?.message?.signed_in) await login({ username: form.email, password: form.password });
      const result = await quickStart({ business_name: form.business_name, service_name: form.service_name, prefill });
      setCreated(result.message);
      await reload();
      setStage('live');
    } catch (reason) {
      setProblem(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0]));
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (stage === 'pending') body = <p role="status" data-qa="quick-start-pending" className="text-sm">{t('growthTouchpoints.quickStart.pending')}</p>;
  else if (expired) body = <Expired source={source} refCode={refCode} />;
  else if (isLoading || !data) body = <p data-qa="quick-start-loading" role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('growthTouchpoints.quickStart.loading')}</p>;
  else
    body = (
      <form onSubmit={submit} className="space-y-5" data-qa="quick-start-form">
        {problem && (
          <Alert variant="destructive" role="alert" data-qa="quick-start-error">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="qs-name" label={t('growthTouchpoints.quickStart.name')}>
            <Input id="qs-name" data-qa="quick-start-name" required maxLength={100} autoComplete="name" value={form.full_name} onChange={update('full_name')} />
          </Field>
          <Field id="qs-email" label={t('growthTouchpoints.quickStart.email')}>
            <Input id="qs-email" data-qa="quick-start-email" type="email" required maxLength={120} autoComplete="email" value={form.email} onChange={update('email')} />
          </Field>
        </div>
        <Field id="qs-business" label={t('growthTouchpoints.quickStart.businessName')} hint={t('growthTouchpoints.quickStart.businessHint')}>
          <Input id="qs-business" data-qa="quick-start-business" required maxLength={100} autoComplete="organization" value={form.business_name} onChange={update('business_name')} />
        </Field>
        <Field id="qs-service" label={t('growthTouchpoints.quickStart.service')}>
          <Input id="qs-service" data-qa="quick-start-service" required maxLength={100} placeholder={t('growthTouchpoints.quickStart.servicePlaceholder')} value={form.service_name} onChange={update('service_name')} />
        </Field>
        <Field id="qs-password" label={t('growthTouchpoints.quickStart.password')} hint={t('growthTouchpoints.quickStart.passwordHint')}>
          <Input id="qs-password" data-qa="quick-start-password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={update('password')} />
        </Field>
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('growthTouchpoints.quickStart.defaults')}
        </p>
        <Button type="submit" data-qa="quick-start-submit" className="h-11 w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? t('growthTouchpoints.quickStart.creating') : t('growthTouchpoints.quickStart.submit')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('growthTouchpoints.quickStart.haveAccount')}{' '}
          <Link to="/login?redirect-to=/onboarding" className="font-medium text-foreground underline underline-offset-4">{t('growthTouchpoints.quickStart.signIn')}</Link>
        </p>
      </form>
    );

  const logo = brand.mark || brand.logo;
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-6 text-foreground sm:py-10" data-qa="quick-start">
      <div className={`mx-auto flex items-center justify-between gap-3 ${stage === 'live' ? 'max-w-2xl' : 'max-w-xl'}`}>
        <a href="/" className="flex min-w-0 items-center gap-2 font-semibold no-underline">
          {logo ? <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" /> : null}
          <span className="truncate">{brand.productName}</span>
        </a>
        <LanguageToggle />
      </div>
      {stage === 'live' && created ? (
        <main className="mx-auto mt-6 max-w-2xl sm:mt-10" data-qa="quick-start-live">
          <OnboardingSuccess business={{ ...created, published: created.published ?? true }} qa="quick-start" />
        </main>
      ) : (
        <main className="mx-auto mt-6 max-w-xl rounded-2xl border bg-card p-5 shadow-card sm:mt-10 sm:p-8">
          <header className="mb-6 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('growthTouchpoints.quickStart.eyebrow')}</p>
            <h1 data-qa="quick-start-heading" className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{t('growthTouchpoints.quickStart.title')}</h1>
            {!expired && <p className="text-sm text-muted-foreground">{t('growthTouchpoints.quickStart.intro')}</p>}
          </header>
          {body}
        </main>
      )}
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Expired({ source, refCode }: { source: string; refCode?: string | null }) {
  const { t } = useTranslation();
  return (
    <div data-qa="quick-start-expired" className="space-y-4 text-center">
      <TimerOff className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold">{t('growthTouchpoints.quickStart.expiredTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('growthTouchpoints.quickStart.expiredBody')}</p>
      </div>
      <Button asChild><Link to={signupPath(source, { ref: refCode })}>{t('growthTouchpoints.quickStart.regularSignup')}</Link></Button>
    </div>
  );
}
