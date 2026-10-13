import type { FormEvent } from 'react';
import { CalendarCheck2, CheckCircle2, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import BusinessPrompt from '@/components/business-prompt';
import CustomerShareCard from '@/components/growth-referrals/CustomerShareCard';
import { formatDate, formatTime } from '@/pages/booking-v2/utils/dateHelpers';
import { formatEthiopianTime } from '@/pages/booking-v2/utils/ethiopianTime';
import type { TimeSlot } from '@/pages/booking-v2/types';
import { fill } from '@/pages/manage-booking/format';
import { intlLocale, useTranslation } from '@/lib/i18n';

export type TimeFormat = '12h' | '24h' | 'ethiopian';
export interface Booked { id: string; emailed: boolean; managePath?: string; slot: TimeSlot; quantity: number }

interface DetailsProps {
  slot: TimeSlot | null; timeFormat: TimeFormat; timezone: string; quantity: number;
  name: string; email: string; onName: (value: string) => void; onEmail: (value: string) => void;
  onChangeTime: () => void; problem: string; busy: boolean; onSubmit: (event: FormEvent) => void;
}

/** Step two: who is coming. Locked until a time is chosen, so the order of steps stays clear. */
export function DetailsForm({ slot, timeFormat, timezone, quantity, name, email, onName, onEmail, onChangeTime, problem, busy, onSubmit }: DetailsProps) {
  const { t } = useTranslation();
  return <Card data-qa="independent-booking-details" className="rounded-2xl">
    <CardHeader className="pb-4">
      <CardTitle className="text-xl">{t('public.independentBooking.yourDetails')}</CardTitle>
      {!slot && <CardDescription data-qa="independent-booking-choose-first">{t('public.independentBooking.chooseFirst')}</CardDescription>}
    </CardHeader>
    <CardContent>
      {slot && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme-default p-4" data-qa="independent-booking-chosen">
        <div className="flex min-w-0 items-start gap-3">
          <CalendarCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-(--accent-primary)" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-theme-secondary">{t('public.independentBooking.chosenTime')}</p>
            <p className="font-semibold"><SlotWhen slot={slot} timeFormat={timeFormat} timezone={timezone} quantity={quantity} /></p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="min-h-11" data-qa="independent-booking-change" onClick={onChangeTime}>{t('public.independentBooking.changeTime')}</Button>
      </div>}
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="independent-booking-name">{t('public.independentBooking.name')}</Label>
          <Input id="independent-booking-name" data-qa="independent-booking-name" required autoComplete="name" className="h-11" disabled={!slot} value={name} onChange={event => onName(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="independent-booking-email-input">{t('public.independentBooking.email')}</Label>
          <Input id="independent-booking-email-input" data-qa="independent-booking-email-input" required type="email" autoComplete="email" inputMode="email" className="h-11" disabled={!slot} value={email} onChange={event => onEmail(event.target.value)} />
        </div>
        {problem && <p role="alert" data-qa="independent-booking-error" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:col-span-2">{problem}</p>}
        <Button type="submit" size="lg" className="min-h-11 w-full sm:col-span-2 sm:w-auto sm:justify-self-start" data-qa="independent-booking-submit" disabled={!slot || busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}{t('public.independentBooking.submit')}
        </Button>
      </form>
    </CardContent>
  </Card>;
}

/** The confirmation: when, the reference, the email status, then the share card and the "your own page" prompt. */
export function BookingConfirmed({ booking, timeFormat, timezone, online }: { booking: Booked; timeFormat: TimeFormat; timezone: string; online?: string }) {
  const { t } = useTranslation();
  return <section role="status" className="mx-auto max-w-2xl space-y-4" data-qa="independent-booking-confirmed">
    <Card className="rounded-2xl"><CardContent className="space-y-4 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl font-semibold">{t('customerEmail.headingConfirmation')}</h2>
          <p className="font-medium" data-qa="independent-booking-when"><SlotWhen slot={booking.slot} timeFormat={timeFormat} timezone={timezone} quantity={booking.quantity} /></p>
        </div>
      </div>
      {online && <p className="flex items-center gap-1.5 font-medium" data-qa="independent-booking-confirmed-online">
        <Video className="h-4 w-4 shrink-0" aria-hidden="true" />{online}
      </p>}
      <p className="text-sm text-theme-secondary">{fill(t('staff.payments.referenceLine'), booking.id)}</p>
      <p className="text-sm" data-qa="independent-booking-email">{booking.emailed ? t('public.independentBooking.emailed') : t('public.independentBooking.noEmail')}</p>
      {online && <p className="text-sm text-theme-secondary" data-qa="independent-booking-link-note">{t('onlineSession.linkByEmail')}</p>}
    </CardContent></Card>
    <CustomerShareCard source={{ bookingId: booking.id }} />
    <BusinessPrompt managePath={booking.managePath} />
  </section>;
}

function SlotWhen({ slot, timeFormat, timezone, quantity }: { slot: TimeSlot; timeFormat: TimeFormat; timezone: string; quantity: number }) {
  const { t, language } = useTranslation();
  const start = new Date(slot.start_time);
  const time = timeFormat === 'ethiopian' ? formatEthiopianTime(start) : formatTime(start, timeFormat, timezone);
  return <>{formatDate(start, 'full', intlLocale(language))} · <span className="tabular-nums">{time}</span>
    {quantity > 1 && <> · {t('bookingPicker.times').replace('{0}', String(quantity))}</>}</>;
}
