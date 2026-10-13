import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { addDays } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { CalendarX2, Clock3, MapPin, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/card';
import { Skeleton } from '@/components/skeleton';
import LanguageToggle from '@/components/language-toggle';
import PoweredBy from '@/components/powered-by';
import CustomerInviteBanner from '@/components/growth-referrals/CustomerInviteBanner';
import { DateTimeSelector } from '@/pages/booking-v2/components/DateTimeSelector';
import { QuantityPicker } from '@/pages/booking-v2/components/QuantityPicker';
import type { TimeSlot } from '@/pages/booking-v2/types';
import { fill } from '@/pages/manage-booking/format';
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
import { BookingConfirmed, DetailsForm, type Booked, type TimeFormat } from './independent-booking-parts';

interface Offering { site_slug?: string | null; business_name: string; service: string; duration: number; timezone: string; allow_quantity?: number; max_quantity?: number; location?: { name?: string; address?: string; location_type?: LocationType; platform?: string } }
interface SlotRow { start_time: string; end_time: string; available: boolean }

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const BOOKING_WINDOW_DAYS = 90;

/** Public booking page for an independent provider's offering: the same date and slot picker as organization booking. */
export default function IndependentBooking() {
  const { t, language } = useTranslation();
  const { offeringId } = useParams();
  const { growth } = usePlatformBrand();
  const [date, setDate] = useState<Date | null>(null);
  const [month, setMonth] = useState(new Date());
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [chosenFormat, setChosenFormat] = useState<TimeFormat | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const [problem, setProblem] = useState('');
  const [booking, setBooking] = useState<Booked>();
  const details = useRef<HTMLDivElement>(null);
  // Amharic readers see Habesha time first; a choice in the toggle wins.
  const timeFormat: TimeFormat = chosenFormat ?? (language === 'am' ? 'ethiopian' : '12h');
  const { data, error } = useFrappeGetCall<{ message: Offering }>('appointment.scheduler.independent.public_offering', { offering_id: offeringId });
  const offering = data?.message;
  const onlineLabel = useOnlineLabel();
  // An online session shows "Online video · <platform>" where an office shows its address.
  const online = offering?.location?.location_type === 'online' ? onlineLabel(offering.location.platform) : undefined;
  const { resolvedTheme } = useTheme();
  // A published website lends the scheduler its template's colours and type, as on organization pages.
  const brand = useBookingBrand(offering?.site_slug || undefined, resolvedTheme === 'dark' ? 'dark' : 'light');
  const { slots, loading: slotsLoading } = useSlots(offeringId, date, quantity);
  const { call, loading } = useFrappePostCall('appointment.scheduler.booking.book');

  useEffect(() => { if (slot) details.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [slot]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setProblem('');
    if (!slot) return;
    try {
      const response = await call({ offering_id: offeringId, start_time: slot.start_time, end_time: slot.end_time, user_name: name,
        user_email: email, request_id: requestId, ...(quantity > 1 ? { quantity } : {}), ...referralTerms() });
      setBooking({ id: response.message.booking_id, emailed: response.message.notification_status === 'queued', managePath: response.message.manage_path, slot, quantity });
    } catch (reason) { setProblem(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }

  let body;
  if (error) body = <Unavailable />;
  else if (!offering) body = <Loading label={t('public.independentBooking.loading')} />;
  else if (booking) body = <BookingConfirmed booking={booking} timeFormat={timeFormat} timezone={offering.timezone} online={online} />;
  else body = <div className="space-y-6">
    <CustomerInviteBanner offering={offeringId} />
    {Boolean(offering.allow_quantity) && <QuantityPicker value={quantity} max={Math.max(1, Number(offering.max_quantity) || 1)} onChange={(next) => { setQuantity(next); setSlot(null); }} />}
    <DateTimeSelector selectedDate={date} displayMonth={month} onMonthChange={setMonth}
      onDateSelect={(next) => { setDate(next); setSlot(null); }}
      availableDays={ALL_DAYS} minDate={new Date()} maxDate={addDays(new Date(), BOOKING_WINDOW_DAYS)}
      availableSlots={slots} selectedSlot={slot} onSlotSelect={setSlot} loading={slotsLoading}
      timeFormat={timeFormat} onTimeFormatChange={setChosenFormat} timezone={offering.timezone}
      serviceName={offering.service} duration={offering.duration} embedded />
    <div ref={details} className="scroll-mt-6">
      <DetailsForm slot={slot} timeFormat={timeFormat} timezone={offering.timezone} quantity={quantity}
        name={name} email={email} onName={setName} onEmail={setEmail} onChangeTime={() => setSlot(null)}
        problem={problem} busy={loading} onSubmit={submit} />
    </div>
  </div>;

  return <div className="booking-experience min-h-screen text-theme-primary" data-qa="independent-booking"
    data-booking-branded={brand.config ? 'true' : 'false'} data-pe-recipe={brand.config?.recipeKey}
    style={{ ...brand.style, backgroundColor: 'var(--bg-primary)' }}>
    <header className="border-b border-theme-subtle">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="truncate font-semibold" data-qa="independent-booking-business">{offering?.business_name ?? ''}</span>
        <LanguageToggle />
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {offering && !error && <div className="space-y-2">
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: 'var(--booking-font-display)' }}>{fill(t('public.independentBooking.title'), offering.business_name)}</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-theme-secondary" data-qa="independent-booking-service">
          <span>{offering.service}</span><span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" aria-hidden="true" />{fill(t('public.independentBooking.duration'), offering.duration)}</span>
        </p>
        {online ? <p className="flex items-start gap-1 text-sm text-theme-secondary" data-qa="independent-booking-online">
          <Video className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{online}</span>
        </p> : offering.location?.address ? <p className="flex items-start gap-1 text-sm text-theme-secondary" data-qa="independent-booking-place">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{offering.location.name} · {offering.location.address}</span>
        </p> : null}
      </div>}
      {body}
      <div className={booking ? 'mx-auto max-w-2xl' : undefined}><a data-qa="independent-my-bookings" href={`/schedule/individual/${offeringId}/my-bookings`} className="inline-block text-sm text-theme-secondary underline underline-offset-4">{t('myBookings.allLink')}</a></div>
    </main>
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

function Unavailable() {
  const { t } = useTranslation();
  return <Card data-qa="independent-booking-unavailable" className="mx-auto max-w-xl text-center"><CardContent className="space-y-3 p-8">
    <CalendarX2 className="mx-auto h-10 w-10 text-theme-secondary" aria-hidden="true" />
    <h1 className="text-xl font-semibold">{t('public.independentBooking.unavailableTitle')}</h1>
    <p className="text-sm text-theme-secondary">{t('public.independentBooking.unavailable')}</p>
  </CardContent></Card>;
}

function Loading({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label} className="grid gap-6 lg:grid-cols-[400px_1fr]">
    <Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" />
  </div>;
}

/** The share channel and, from a friend's link, the referral code for this provider. */
function referralTerms() {
  let storage: Storage | null = null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  const code = customerRefFor(window.location.search, window.location.pathname, storage);
  const source = referralSource() || (code ? CUSTOMER_REFERRAL_SOURCE : '');
  return { referral_source: source, ...(code ? { referral_code: code } : {}) };
}
