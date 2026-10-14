import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CalendarX2, RotateCw, SearchX, TriangleAlert, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import './booking-states.css';

/**
 * One set of state components for the public booking pages: skeletons that match the real layout,
 * an illustrated empty or unavailable state with a next action, an error with retry, and an offline notice.
 * They read the page's booking tokens, so a branded page gets branded states. See docs/growth/BOOKING_LAYOUT.md.
 */

export type BookingStateKind = 'unavailable' | 'not-found' | 'empty' | 'error' | 'offline';

const ICONS: Record<BookingStateKind, LucideIcon> = {
  unavailable: CalendarX2,
  'not-found': SearchX,
  empty: CalendarClock,
  error: TriangleAlert,
  offline: WifiOff,
};

export interface BookingStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  qa?: string;
  icon?: LucideIcon;
}

interface BookingStateProps {
  kind: BookingStateKind;
  title: ReactNode;
  description?: ReactNode;
  actions?: BookingStateAction[];
  /** A technical detail, shown small under the description. */
  detail?: ReactNode;
  /** Page-level states use a heading level 1; states inside a page use level 2. */
  headingLevel?: 1 | 2 | 3;
  compact?: boolean;
  className?: string;
  qa?: string;
  /** Extra attributes kept from older markup, such as `data-pe-unavailable`. */
  attributes?: Record<string, string>;
}

/** The illustrated state: a picture, a title, a short reason and one or two next actions. */
export function BookingState({ kind, title, description, actions = [], detail, headingLevel = 2, compact = false, className, qa, attributes }: BookingStateProps) {
  const Icon = ICONS[kind];
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <section
      role={kind === 'error' ? 'alert' : 'status'}
      data-qa={qa}
      data-kind={kind}
      className={cn('bk-state mx-auto flex w-full max-w-lg flex-col items-center text-center', compact ? 'gap-3 py-6' : 'gap-5 py-10', className)}
      {...attributes}
    >
      <StateArt icon={Icon} small={compact} />
      <div className="space-y-2">
        <Heading className={cn('font-semibold leading-snug text-balance', compact ? 'text-lg' : 'text-2xl sm:text-[1.7rem]')}
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--booking-font-display, inherit)' }}>
          {title}
        </Heading>
        {description && <p className="mx-auto max-w-md text-[0.95rem] leading-relaxed text-pretty" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
        {detail && <p className="mx-auto max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>{detail}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {actions.map((action, index) => <StateActionButton key={action.label} action={{ variant: index === 0 ? 'primary' : 'secondary', ...action }} />)}
        </div>
      )}
    </section>
  );
}

function StateActionButton({ action }: { action: BookingStateAction }) {
  const Icon = action.icon;
  const body = <>{Icon && <Icon className="h-4 w-4" aria-hidden="true" />}{action.label}</>;
  if (action.href) return <a className="bk-state-action" data-variant={action.variant} data-qa={action.qa} href={action.href}>{body}</a>;
  return <button type="button" className="bk-state-action" data-variant={action.variant} data-qa={action.qa} onClick={action.onClick}>{body}</button>;
}

/** Two stacked calendar cards with a badge. Drawn with the page tokens, so it follows the brand and the mode. */
function StateArt({ icon: Icon, small }: { icon: LucideIcon; small: boolean }) {
  return (
    <div className="bk-state-art" aria-hidden="true" style={small ? { width: '7.5rem', height: '6rem' } : undefined}>
      <svg viewBox="0 0 152 120">
        <ellipse className="bk-art-halo" cx="76" cy="64" rx="70" ry="52" />
        <rect className="bk-art-back" x="30" y="22" width="78" height="74" rx="12" transform="rotate(-8 69 59)" />
        <rect className="bk-art-card" x="44" y="18" width="80" height="78" rx="12" />
        <path className="bk-art-band" d="M44 30a12 12 0 0 1 12-12h56a12 12 0 0 1 12 12v8H44z" />
        <path className="bk-art-ring" d="M62 12v12M106 12v12" />
        {[0, 1, 2, 3].map((col) => [0, 1, 2].map((row) => (
          <circle key={`${col}-${row}`} className="bk-art-dot" data-on={col === 2 && row === 1 ? 'true' : 'false'} cx={60 + col * 16} cy={52 + row * 14} r="4" />
        )))}
      </svg>
      <span className="bk-state-badge"><Icon className="h-5 w-5" /></span>
    </div>
  );
}

/** A full booking page that only shows a state: the page tokens, a soft pattern and the state in the middle. */
export function BookingStatePage({ children, style, header, branded, recipe, qa, mainAttributes }: {
  children: ReactNode; style?: CSSProperties; header?: ReactNode; branded?: boolean; recipe?: string; qa?: string;
  /** Attributes for the `<main>` element, such as `data-pe-unavailable`. */
  mainAttributes?: Record<string, string>;
}) {
  return (
    <div className="booking-experience flex min-h-screen flex-col text-theme-primary" data-qa={qa}
      data-booking-branded={branded ? 'true' : 'false'} data-pe-recipe={recipe}
      style={{ ...style, backgroundColor: 'var(--bg-primary)' }}>
      {header}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6" {...mainAttributes}>
        <div className="bk-surface w-full max-w-xl px-5 sm:px-10">{children}</div>
      </main>
    </div>
  );
}

/** A retry action for an error state. */
export function useRetryAction(onRetry: () => void): BookingStateAction {
  const { t } = useTranslation();
  return { label: t('bookingStates.retry'), onClick: onRetry, icon: RotateCw, qa: 'booking-state-retry' };
}

// ---------------------------------------------------------------- skeletons

export function Bone({ className, style, accent = false }: { className?: string; style?: CSSProperties; accent?: boolean }) {
  return <div className={cn('bk-bone', className)} style={style} data-tone={accent ? 'accent' : undefined} />;
}

function Busy({ label, children, className, qa }: { label: string; children: ReactNode; className?: string; qa?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className={className} data-qa={qa ?? 'booking-skeleton'}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">{children}</div>
    </div>
  );
}

/** The time picker while its page loads: the side column (summary and calendar) and the slot panel. */
export function TimePickerSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Busy label={label ?? t('bookingStates.loadingTimes')} className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
      <div className="min-w-0 space-y-4">
        <div className="bk-surface space-y-3 p-5">
          <Bone className="h-3 w-24" />
          <Bone className="h-6 w-48" />
          <div className="flex gap-2"><Bone className="h-7 w-20 rounded-full" /><Bone className="h-7 w-28 rounded-full" /></div>
        </div>
        <div className="bk-surface hidden p-5 lg:block">
          <div className="mb-4 flex items-center justify-between"><Bone className="h-8 w-8" /><Bone className="h-5 w-32" /><Bone className="h-8 w-8" /></div>
          <div className="grid grid-cols-7 gap-1.5">{Array.from({ length: 35 }, (_, i) => <Bone key={i} className="aspect-square rounded-lg" />)}</div>
        </div>
        <div className="flex gap-2 overflow-hidden lg:hidden">{Array.from({ length: 6 }, (_, i) => <Bone key={i} className="h-16 w-14 shrink-0" accent={i === 1} />)}</div>
      </div>
      <SlotPanelSkeleton />
    </Busy>
  );
}

/** Only the slot list, while one day's times load. */
export function SlotListSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Busy label={label ?? t('bookingStates.loadingTimes')} className="block pt-4" qa="booking-slots-loading">
      <SlotListSkeletonBody />
    </Busy>
  );
}

function SlotPanelSkeleton() {
  return (
    <div className="bk-surface space-y-6 p-5 sm:p-6">
      <div className="space-y-2"><Bone className="h-7 w-64 max-w-full" /><Bone className="h-4 w-32" /></div>
      <SlotListSkeletonBody />
    </div>
  );
}

function SlotListSkeletonBody() {
  return <div className="space-y-6">{[4, 3].map((count, group) => (
    <div key={group} className="space-y-3">
      <Bone className="h-3.5 w-24" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: count }, (_, i) => <Bone key={i} className="h-14" />)}</div>
    </div>
  ))}</div>;
}

/** The service chooser while the business loads: the summary, the tabs and a grid of service cards. */
export function ServicesSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Busy label={label ?? t('bookingStates.loadingServices')} className="mx-auto block w-full max-w-6xl space-y-6">
      <div className="bk-surface flex items-center gap-5 p-5 sm:p-7">
        <Bone className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" accent />
        <div className="flex-1 space-y-3"><Bone className="h-7 w-2/3 max-w-sm" /><Bone className="h-4 w-full max-w-xl" /><Bone className="h-4 w-1/3" /></div>
      </div>
      <div className="flex gap-2">{[16, 20, 24].map((w) => <Bone key={w} className="h-9 rounded-full" style={{ width: `${w * 0.25}rem` }} />)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bk-surface space-y-3 p-5">
            <Bone className="h-5 w-3/4" /><Bone className="h-3.5 w-full" /><Bone className="h-3.5 w-2/3" />
            <div className="flex gap-2 pt-2"><Bone className="h-7 w-20 rounded-full" /><Bone className="h-7 w-24 rounded-full" /></div>
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** The provider page while it loads: the profile column and service cards. */
export function ProviderPageSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <Busy label={label ?? t('bookingStates.loadingServices')} className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-10">
      <div className="bk-surface overflow-hidden">
        <Bone className="h-24 rounded-none" accent />
        <div className="-mt-10 space-y-3 px-6 pb-6">
          <Bone className="h-20 w-20 rounded-full" />
          <Bone className="h-6 w-2/3" /><Bone className="h-4 w-1/2" /><Bone className="h-3.5 w-full" /><Bone className="h-3.5 w-5/6" />
        </div>
      </div>
      <div className="space-y-4">
        <Bone className="h-8 w-40" />
        {[0, 1].map((i) => (
          <div key={i} className="bk-surface space-y-3 p-6">
            <div className="flex justify-between"><Bone className="h-6 w-1/2" /><Bone className="h-7 w-20 rounded-full" /></div>
            <Bone className="h-3.5 w-full" /><Bone className="h-3.5 w-3/4" />
            <div className="flex justify-between pt-2"><Bone className="h-4 w-28" /><Bone className="h-11 w-32" accent /></div>
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** A booking card (manage booking) or a list of booking rows (my bookings) while they load. */
export function BookingCardSkeleton({ rows = 1, label }: { rows?: number; label?: string }) {
  const { t } = useTranslation();
  return (
    <Busy label={label ?? t('bookingStates.loadingBooking')} className="block space-y-3" qa="booking-card-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-4 rounded-xl border p-4" style={{ borderColor: 'var(--border-default)' }}>
          <Bone className="h-11 w-11 shrink-0" accent />
          <div className="flex-1 space-y-2.5"><Bone className="h-5 w-2/3" /><Bone className="h-4 w-1/2" /><Bone className="h-3.5 w-1/3" /></div>
          <Bone className="hidden h-9 w-24 sm:block" />
        </div>
      ))}
    </Busy>
  );
}

/** A public website page (template) while its published design loads. */
export function SitePageSkeleton({ label, attributes }: { label?: string; attributes?: Record<string, string> }) {
  const { t } = useTranslation();
  return (
    <div className="booking-experience min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }} {...attributes}>
      <Busy label={label ?? t('bookingStates.loadingSite')} className="mx-auto block max-w-6xl space-y-10 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Bone className="h-9 w-9 rounded-full" accent /><Bone className="h-5 w-36" /></div><div className="hidden gap-6 sm:flex"><Bone className="h-4 w-16" /><Bone className="h-4 w-16" /><Bone className="h-4 w-16" /></div><Bone className="h-10 w-28" accent /></div>
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="space-y-4"><Bone className="h-4 w-32" /><Bone className="h-12 w-full" /><Bone className="h-12 w-4/5" /><Bone className="h-4 w-full" /><Bone className="h-4 w-2/3" /><div className="flex gap-3 pt-3"><Bone className="h-12 w-40" accent /><Bone className="h-12 w-32" /></div></div>
          <Bone className="h-64 w-full rounded-3xl lg:h-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Bone key={i} className="h-40" />)}</div>
      </Busy>
    </div>
  );
}

// ---------------------------------------------------------------- offline

const subscribeOnline = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

/** True while the browser has no network. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** A quiet notice at the top while the browser is offline. The page and the customer's choices stay. */
export function BookingOfflineNotice() {
  const { t } = useTranslation();
  const online = useOnline();
  const forced = previewState() === 'offline';
  if (online && !forced) return null;
  return (
    <div className="bk-offline" role="status" data-qa="booking-offline">
      <span className="bk-offline-dot" aria-hidden="true" />
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: 'var(--text-secondary)' }} />
      <span><strong className="font-semibold">{t('bookingStates.offlineTitle')}</strong> <span style={{ color: 'var(--text-secondary)' }}>{t('bookingStates.offlineBody')}</span></span>
    </div>
  );
}

// ---------------------------------------------------------------- development preview

export type PreviewState = 'loading' | 'error' | 'unavailable' | 'offline' | 'empty';

/**
 * Development only: `?preview-state=loading|error|unavailable|offline|empty` holds a page in that state,
 * so browser QA can capture states that a fast local server shows for a moment only. Production builds ignore it.
 */
export function previewState(): PreviewState | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('preview-state');
  return value === 'loading' || value === 'error' || value === 'unavailable' || value === 'offline' || value === 'empty' ? value : null;
}
