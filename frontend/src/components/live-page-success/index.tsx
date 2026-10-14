import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, CircleDashed, Copy, ExternalLink, Loader2, QrCode, Send, Sprout, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand } from '@/lib/platform-brand';
import { copyText } from '@/pages/grow/copy';
import { fillMessage, telegramShareUrl, withSource } from '@/pages/grow/share-core';
import { fullLink, liveState, shortLink, type LivePage } from './core';

export * from './core';

interface Props {
  page: LivePage;
  /** `data-qa` prefix, for example `onboarding` gives `onboarding-success`, `onboarding-copy-link`. */
  qa: string;
  /** Publish the page from the draft state. Resolves with the new page state. */
  onPublish?: () => Promise<LivePage>;
  /** Where the owner reviews or finishes the setup. */
  settingsPath: string;
  dashboardPath?: string;
  /** A next step that comes first, for example the website template chosen in the landing gallery. */
  next?: ReactNode;
}

/**
 * The end of business setup: the live link with copy, open and Telegram share, then next steps.
 * Used by organization onboarding, solo setup and quick start. A draft shows an honest state with Publish.
 */
export default function LivePageSuccess({ page: initial, qa, onPublish, settingsPath, dashboardPath = '/home', next }: Props) {
  const { t } = useTranslation();
  const [page, setPage] = useState(initial);
  const [publishing, setPublishing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const state = liveState(page);
  // Screen readers and keyboards land on the result, not on the old form position.
  useEffect(() => heading.current?.focus(), [state]);

  async function publish() {
    if (!onPublish) return;
    setPublishing(true);
    try {
      setPage(await onPublish());
    } catch {
      toast.error(t('staff.liveSuccess.publishFailed'));
    } finally {
      setPublishing(false);
    }
  }

  const titles = { published: 'staff.onboarding.liveTitle', draft: 'staff.liveSuccess.draftTitle', 'no-page': 'staff.liveSuccess.noPageTitle' };
  const bodies = { published: 'staff.liveSuccess.liveBody', draft: 'staff.liveSuccess.draftBody', 'no-page': 'staff.liveSuccess.noPageBody' };
  return (
    <section data-qa={`${qa}-success`} data-state={state} className="mx-auto w-full max-w-2xl rounded-2xl border bg-card p-5 shadow-card sm:p-8">
      <StatusIcon live={state === 'published'} />
      <h1 ref={heading} tabIndex={-1} data-qa={`${qa}-success-title`} className="mt-4 font-heading text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
        {t(titles[state])}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <span className="font-medium text-foreground">{page.businessName}</span> {t(bodies[state])}
      </p>
      {state === 'published' && <LiveLink page={page} qa={qa} />}
      {state === 'draft' && <LinkBox label={t('staff.liveSuccess.draftLink')} page={page} qa={qa} muted />}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {state === 'published' && (
          <Button asChild size="lg" className="sm:flex-1">
            <Link to={page.path} data-qa={`${qa}-open-page`}>
              <ExternalLink aria-hidden="true" />
              {t('staff.onboarding.openPage')}
            </Link>
          </Button>
        )}
        {state === 'published' && <TelegramButton page={page} qa={qa} />}
        {state === 'draft' && onPublish && (
          <Button size="lg" className="sm:flex-1" data-qa={`${qa}-publish`} disabled={publishing} onClick={() => void publish()}>
            {publishing && <Loader2 className="animate-spin" aria-hidden="true" />}
            {publishing ? t('staff.liveSuccess.publishing') : t('staff.liveSuccess.publish')}
          </Button>
        )}
        {state !== 'published' && (
          <Button asChild size="lg" variant="outline" className="sm:flex-1">
            <Link to={settingsPath} data-qa={`${qa}-review`}>
              {t(state === 'draft' ? 'staff.liveSuccess.review' : 'staff.liveSuccess.finishSetup')}
            </Link>
          </Button>
        )}
      </div>
      {next}
      {state === 'published' && <NextSteps qa={qa} />}
      <div className="mt-6 border-t pt-4">
        <Button asChild variant="ghost" className="-ml-3 min-h-11 text-muted-foreground hover:text-foreground">
          <Link to={dashboardPath} data-qa={`${qa}-go-home`}>
            {t('staff.liveSuccess.dashboard')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function StatusIcon({ live }: { live: boolean }) {
  const Icon = live ? CheckCircle2 : CircleDashed;
  const tone = live ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${tone}`} aria-hidden="true">
      <Icon className="h-6 w-6" />
    </span>
  );
}

function LiveLink({ page, qa }: { page: LivePage; qa: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = fullLink(window.location.origin, page.path);
  async function copy() {
    if (!(await copyText(withSource(url, 'copy_link'), t('staff.grow.share.linkCopied'), t('staff.grow.share.copyFailed')))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <LinkBox label={t('staff.grow.share.yourLink')} page={page} qa={qa}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        data-qa={`${qa}-copy-link`}
        data-state={copied ? 'copied' : 'idle'}
        className="w-full shrink-0 sm:w-auto"
        onClick={() => void copy()}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? t('staff.liveSuccess.copied') : t('staff.grow.share.copyLink')}
      </Button>
    </LinkBox>
  );
}

function LinkBox({ label, page, qa, muted, children }: { label: string; page: LivePage; qa: string; muted?: boolean; children?: ReactNode }) {
  const { shortHost } = usePlatformBrand();
  const { t } = useTranslation();
  const url = fullLink(window.location.origin, page.path);
  return (
    <div className="mt-5 rounded-xl border bg-muted/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p data-qa={`${qa}-live-link`} className={`break-words text-lg font-semibold sm:text-xl ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>
            <Breakable text={shortLink(shortHost, page.path)} />
          </p>
          <p className="mt-1 break-words font-mono text-xs text-muted-foreground">
            <span className="sr-only">{t('staff.liveSuccess.fullLink')}: </span>
            <span data-qa={`${qa}-live-url`}><Breakable text={url} /></span>
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function TelegramButton({ page, qa }: { page: LivePage; qa: string }) {
  const { t } = useTranslation();
  const { growth } = usePlatformBrand();
  const link = withSource(fullLink(window.location.origin, page.path), 'telegram_share');
  const message = fillMessage(growth.shareMessage, page.businessName, link);
  return (
    <Button asChild size="lg" variant="outline" className="sm:flex-1">
      <a href={telegramShareUrl(link, message)} target="_blank" rel="noopener noreferrer" data-qa={`${qa}-telegram`}>
        <Send aria-hidden="true" />
        {t('staff.grow.share.telegram')}
      </a>
    </Button>
  );
}

function NextSteps({ qa }: { qa: string }) {
  const { t } = useTranslation();
  const { growth } = usePlatformBrand();
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-foreground">{t('staff.liveSuccess.nextTitle')}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {growth.postersEnabled && (
          <Step to="/grow#grow-poster" qa={`${qa}-poster`} icon={QrCode} title={t('staff.liveSuccess.posterTitle')} body={t('staff.liveSuccess.posterBody')} />
        )}
        <Step to="/grow" qa={`${qa}-grow`} icon={Sprout} title={t('staff.liveSuccess.growTitle')} body={t('staff.liveSuccess.growBody')} />
      </ul>
    </div>
  );
}

function Step({ to, qa, icon: Icon, title, body }: { to: string; qa: string; icon: LucideIcon; title: string; body: string }) {
  return (
    <li className="min-w-0">
      <Link
        to={to}
        data-qa={qa}
        className="group flex h-full min-h-11 items-start gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-medium text-foreground">
            {title}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{body}</span>
        </span>
      </Link>
    </li>
  );
}

/** Let long links wrap after a slash instead of in the middle of a word. */
function Breakable({ text }: { text: string }) {
  const parts = text.split('/');
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && (
            <>
              /<wbr />
            </>
          )}
        </span>
      ))}
    </>
  );
}
