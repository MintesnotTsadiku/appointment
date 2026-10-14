import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { addDays } from 'date-fns';
import { Link, useParams } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { ArrowLeft, Clock3, LayoutGrid, MapPin, RotateCw, Video } from 'lucide-react';
import LanguageToggle from '@/components/language-toggle';
import MetaTags from '@/components/meta-tags';
import PoweredBy from '@/components/powered-by';
import CustomerInviteBanner from '@/components/growth-referrals/CustomerInviteBanner';
import { BookingState, TimePickerSkeleton, previewState, type BookingStateAction } from '@/components/booking-states';
import { BookingSummaryCard, DateTimeSelector, type SummaryFact } from '@/pages/booking-v2/components/DateTimeSelector';
import { QuantityPicker } from '@/pages/booking-v2/components/QuantityPicker';
import type { TimeSlot } from '@/pages/booking-v2/types';
import { fill } from '@/pages/manage-booking/format';
import { ThemeSwitch } from '@/pages/organization-appointment/header';
import { referralSource } from '@/lib/referral-source';
import { CUSTOMER_REFERRAL_SOURCE, customerRefFor } from '@/lib/referral-link';
import { usePlatformBrand } from '@/lib/platform-brand';
import { useTheme } from '@/components/theme-provider';
import { useBookingBrand } from '@/public-experience/bookingTheme';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import '@/public-experience/platform.css';
import { useOnlineLabel } from '@/components/online-session/JoinSession';
import type { LocationType } from '@/lib/online-session';
import { BookingConfirmed, DetailsForm, type Booked, type Contact, type TimeFormat } from './independent-booking-parts';
import { normalizePhone } from '@/lib/phone';

interface Offering { site_slug?: string | null; provider_slug?: string | null; business_name: string; service: string; duration: number; timezone: string; allow_quantity?: number; max_quantity?: number; location?: { name?: string; address?: string; location_type?: LocationType; platform?: string } }
interface SlotRow { start_time: string; end_time: string; available: boolean }

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const BOOKING_WINDOW_DAYS = 90;
/** Height of the sticky header; the picker's sticky columns start under it. */
const HEADER_HEIGHT = '4rem';

/**
 * Public booking page for an independent provider's offering: the same date and slot picker as organization booking.
 * It opens at `/schedule/p/<provider slug>/<offering>` from the provider page, and at the older
 * `/schedule/individual/<offering>` from links shared before provider pages existed.
 * Step one picks a time (the bottom bar shows it); step two asks who is coming. See docs/growth/BOOKING_LAYOUT.md.
 */
export default function IndependentBooking() {
  const { t, language } = useTranslation();
  const { offeringId, providerSlug } = useParams();
  const { growth } = usePlatformBrand();
  const [date, setDate] = useState<Date | null>(null);
  const [month, setMonth] = useState(new Date());
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [step, setStep] = useState<'time' | 'details'>('time');
  const [quantity, setQuantity] = useState(1);
  const [chosenFormat, setChosenFormat] = useState<TimeFormat | null>(null);
  const [contact, setContact] = useState<Contact>({ name: '', phone: '', email: '', participants: [] });
  const [phoneValid, setPhoneValid] = useState(false);
  const [participantsValid, setParticipantsValid] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const [problem, setProblem] = useState('');
  const [booking, setBooking] = useState<Booked>();
  // Amharic readers see Habesha time first; a choice in the toggle wins.
  const timeFormat: TimeFormat = chosenFormat ?? (language === 'am' ? 'ethiopian' : '12h');
  const { data, error, mutate } = useFrappeGetCall<{ message: Offering }>('appointment.scheduler.independent.public_offering', { offering_id: offeringId, ...(providerSlug ? { slug: providerSlug } : {}) });
  const forced = previewState();
  const offering = forced === 'loading' || forced === 'unavailable' || forced === 'error' ? undefined : data?.message;
  const onlineLabel = useOnlineLabel();
  // An online session shows "Online video · <platform>" where an office shows its address.
  const online = offering?.location?.location_type === 'online' ? onlineLabel(offering.location.platform) : undefined;
  const { resolvedTheme } = useTheme();
  // A published website lends the scheduler its template's colours and type, as on organization pages.
  const brand = useBookingBrand(offering?.site_slug || undefined, resolvedTheme === 'dark' ? 'dark' : 'light');
  const { slots, loading: slotsLoading } = useSlots(offeringId, date, quantity);
  const { call, loading } = useFrappePostCall('appointment.scheduler.booking.book');

  // A new step, or a service opened from lower on the provider page, starts at the top.
  useEffect(() => { window.scrollTo(0, 0); }, [offeringId, step, booking]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setProblem('');
    if (!slot) return;
    setShowErrors(true);
    if (!phoneValid || !participantsValid) return;
    try {
      const response = await call({ offering_id: offeringId, start_time: slot.start_time, end_time: slot.end_time, user_name: contact.name,
        user_phone: normalizePhone(contact.phone), user_email: contact.email.trim(), request_id: requestId,
        ...(contact.participants.length ? { participant_phones: contact.participants.join(',') } : {}),
        ...(quantity > 1 ? { quantity } : {}), ...referralTerms() });
      setBooking({ id: response.message.booking_id, emailed: response.message.notification_status === 'queued', managePath: response.message.manage_path, slot, quantity });
    } catch (reason) { setProblem(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }

  // "All services" goes back to the provider page; search engines treat that page as the main one.
  const pagePath = offering?.provider_slug ? `/schedule/p/${offering.provider_slug}` : '';
  const backPath = pagePath || (providerSlug ? `/schedule/p/${providerSlug}` : '');
  const failed = forced === 'error' || (error && (!error.httpStatus || error.httpStatus >= 500));
  const unavailable = forced === 'unavailable' || forced === 'error' || Boolean(error);

  const facts: SummaryFact[] = [];
  if (offering) {
    facts.push({ icon: Clock3, text: fill(t('public.independentBooking.duration'), offering.duration), qa: 'independent-booking-duration' });
    if (online) facts.push({ icon: Video, text: online, qa: 'independent-booking-online' });
    else if (offering.location?.address) facts.push({ icon: MapPin, text: offering.location.name, detail: offering.location.address, qa: 'independent-booking-place' });
  }
  const allServices = pagePath && (
    <Link to={pagePath} data-qa="independent-booking-all-services" className="bk-link min-h-11 self-start text-sm">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('public.providerPage.allServices')}
    </Link>
  );

  const myBookings = <a data-qa="independent-my-bookings" href={`/schedule/individual/${offeringId}/my-bookings`} className="inline-block text-sm text-theme-secondary underline underline-offset-4">{t('myBookings.allLink')}</a>;

  let body;
  if (unavailable) {
    const actions: BookingStateAction[] = [];
    if (failed) actions.push({ label: t('bookingStates.retry'), onClick: () => void mutate(), icon: RotateCw, qa: 'booking-state-retry' });
    if (backPath) actions.push({ label: t('bookingStates.seeServices'), href: backPath, icon: LayoutGrid, qa: 'booking-state-services' });
    actions.push({ label: t('bookingStates.goHome'), href: '/', qa: 'booking-state-home' });
    body = <div className="bk-surface mx-auto max-w-xl px-5 sm:px-10">
      <BookingState kind={failed ? 'error' : 'unavailable'} headingLevel={1} qa="independent-booking-unavailable"
        title={failed ? t('bookingStates.errorTitle') : t('public.independentBooking.unavailableTitle')}
        description={failed ? t('bookingStates.errorBody') : t('public.independentBooking.unavailable')} actions={actions} />
    </div>;
  } else if (!offering) body = <TimePickerSkeleton label={t('public.independentBooking.loading')} />;
  else if (booking) body = <BookingConfirmed booking={booking} timeFormat={timeFormat} timezone={offering.timezone} online={online} />;
  else if (step === 'details' && slot) body = <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
    <BookingSummaryCard eyebrow={fill(t('public.independentBooking.title'), offering.business_name)} title={offering.service}
      titleQa="independent-booking-service" facts={facts} />
    <DetailsForm slot={slot} timeFormat={timeFormat} timezone={offering.timezone} quantity={quantity}
      contact={contact} onContact={setContact} showErrors={showErrors} onPhoneValid={setPhoneValid} onParticipantsValid={setParticipantsValid}
      onChangeTime={() => setStep('time')}
      problem={problem} busy={loading} onSubmit={submit} />
  </div>;
  else body = <>
    <CustomerInviteBanner offering={offeringId} className="mb-4" />
    <DateTimeSelector selectedDate={date} displayMonth={month} onMonthChange={setMonth}
      onDateSelect={(next) => { setDate(next); setSlot(null); }}
      availableDays={ALL_DAYS} minDate={new Date()} maxDate={addDays(new Date(), BOOKING_WINDOW_DAYS)}
      availableSlots={slots} selectedSlot={slot} onSlotSelect={setSlot} loading={slotsLoading}
      timeFormat={timeFormat} onTimeFormatChange={setChosenFormat} timezone={offering.timezone}
      serviceName={offering.service} duration={offering.duration}
      summary={<>{allServices}<BookingSummaryCard eyebrow={fill(t('public.independentBooking.title'), offering.business_name)} title={offering.service}
        titleQa="independent-booking-service" facts={facts} /></>}
      extras={Boolean(offering.allow_quantity) && <QuantityPicker className="bk-card" value={quantity} max={Math.max(1, Number(offering.max_quantity) || 1)}
        onChange={(next) => { setQuantity(next); setSlot(null); }} />}
      action={{ label: t('bookingLayout.continue'), onClick: () => setStep('details') }}
      footer={myBookings} />
  </>;

  return <div className="booking-experience min-h-screen text-theme-primary" data-qa="independent-booking"
    data-booking-branded={brand.config ? 'true' : 'false'} data-pe-recipe={brand.config?.recipeKey}
    style={{ ...brand.style, '--bk-top': HEADER_HEIGHT, backgroundColor: 'var(--bg-primary)' } as CSSProperties}>
    <header className="sticky top-0 z-50 border-b border-theme-subtle backdrop-blur-xl" style={{ height: HEADER_HEIGHT, backgroundColor: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)' }}>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {step === 'details' && !booking ? (
          <button type="button" className="booking-back" onClick={() => setStep('time')} aria-label={t('schedulerPage.previousStep')} data-qa="independent-booking-back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /><span>{t('schedulerPage.back')}</span>
          </button>
        ) : null}
        <span className="min-w-0 flex-1 truncate font-semibold" data-qa="independent-booking-business" style={{ fontFamily: 'var(--booking-font-display)' }}>
          {offering?.business_name ?? (unavailable ? '' : <span className="bk-bone inline-block h-4 w-40 align-middle" aria-hidden="true" />)}
        </span>
        <div className="booking-header-actions">
          {offering && !booking && <span className="booking-step" aria-live="polite">{t(step === 'time' ? 'schedulerPage.stepTime' : 'schedulerPage.stepDetails')}</span>}
          <LanguageToggle />
          <ThemeSwitch />
        </div>
      </div>
    </header>
    {pagePath && <MetaTags canonical={`${window.location.origin}${pagePath}`} />}
    <main className={`mx-auto max-w-7xl px-4 sm:px-6 ${unavailable ? 'flex min-h-[calc(100dvh-4rem)] items-center py-10' : 'py-4'}`}>
      <div className="w-full">{body}</div>
    </main>
    {!unavailable && offering && (booking || step === 'details') && <div className={`mx-auto px-4 pb-8 pt-6 sm:px-6 ${booking ? 'max-w-2xl' : 'max-w-5xl'}`}>{myBookings}</div>}
    {booking && growth.poweredByPages && <PoweredBy variant="footer" source="powered_by_page" className="mx-auto max-w-6xl" />}
  </div>;
}

/** The free times of one day, shaped for the shared slot picker. Times already past are shown as unavailable. */
function useSlots(offeringId: string | undefined, date: Date | null, quantity: number) {
  const day = date ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : null;
  const { data, isLoading } = useFrappeGetCall<{ message: { all_available_slots_for_data: SlotRow[] } }>(
    'appointment.scheduler.booking.slots',
    day ? { offering_id: offeringId, date: day, ...(quantity > 1 ? { quantity } : {}) } : undefined,
    day ? `independent-slots-${offeringId}-${day}-${quantity}` : null,
    { revalidateOnFocus: false });
  const slots = useMemo<TimeSlot[]>(() => {
    const now = Date.now();
    return (data?.message?.all_available_slots_for_data ?? []).map((row, index) => ({
      id: `slot-${index}-${row.start_time}`, start_time: row.start_time, end_time: row.end_time,
      available: row.available && new Date(row.start_time).getTime() > now,
    }));
  }, [data]);
  return { slots, loading: isLoading };
}

/** The share channel and, from a friend's link, the referral code for this provider. */
function referralTerms() {
  let storage: Storage | null = null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  const code = customerRefFor(window.location.search, window.location.pathname, storage);
  const source = referralSource() || (code ? CUSTOMER_REFERRAL_SOURCE : '');
  return { referral_source: source, ...(code ? { referral_code: code } : {}) };
}
