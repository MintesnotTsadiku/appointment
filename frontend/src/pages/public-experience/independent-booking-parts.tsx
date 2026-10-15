import { useState, type FormEvent, type ReactNode } from 'react';
import { CalendarCheck2, CheckCircle2, Copy, ExternalLink, Link2, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { PhoneInput, PhoneTagsInput } from '@/components/phone-input';
import BusinessPrompt from '@/components/business-prompt';
import CustomerShareCard from '@/components/growth-referrals/CustomerShareCard';
import { formatTime } from '@/pages/booking-v2/utils/dateHelpers';
import { dayInZone, formatBookingDay } from '@/lib/ethiopian-calendar';
import { formatInstant } from '@/lib/time';
import type { TimeSlot } from '@/pages/booking-v2/types';
import { fill } from '@/pages/manage-booking/format';
import { intlLocale, useTranslation } from '@/lib/i18n';

export type TimeFormat = '12h' | '24h' | 'ethiopian';
export interface Booked { id: string; emailed: boolean; managePath?: string; slot: TimeSlot; quantity: number }

export interface Contact { name: string; phone: string; email: string; participants: string[] }

interface DetailsProps {
  /** The form's id: the Confirm bar's submit button sits outside the form (`form` attribute). */
  formId: string; enabled: boolean;
  contact: Contact; onContact: (next: Contact) => void; showErrors: boolean;
  onPhoneValid: (valid: boolean) => void; onParticipantsValid: (valid: boolean) => void;
  problem: string; onSubmit: (event: FormEvent) => void;
}

/**
 * Step two: who is coming. Phone first and required, email optional, then other people by phone.
 * The details layout frames it: the chosen time is in the summary, Confirm is in the Confirm bar.
 */
export function DetailsForm({ formId, enabled, contact, onContact, showErrors, onPhoneValid, onParticipantsValid, problem, onSubmit }: DetailsProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<Contact>) => onContact({ ...contact, ...patch });
  return <form id={formId} onSubmit={onSubmit} className="bk-details-fields" data-qa="independent-booking-form">
    <div className="space-y-1.5">
      <Label htmlFor="independent-booking-name">{t('public.independentBooking.name')}</Label>
      <Input id="independent-booking-name" data-qa="independent-booking-name" required autoComplete="name" className="h-11" disabled={!enabled} value={contact.name} onChange={event => set({ name: event.target.value })} />
    </div>
    <div className="bk-details-pair">
      <div className="space-y-1.5">
        <Label htmlFor="independent-booking-phone">{t('bookingForm.phone')} <span aria-hidden="true" className="text-(--accent-primary)">*</span></Label>
        <PhoneInput id="independent-booking-phone" data-qa="independent-booking-phone" required className="h-11" disabled={!enabled}
          value={contact.phone} onChange={phone => set({ phone })} onValidityChange={onPhoneValid} showError={showErrors}
          help={t('bookingForm.phoneHint')} helpClassName="text-theme-secondary" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="independent-booking-email-input">{t('public.independentBooking.email')} <span className="font-normal text-theme-secondary">{t('bookingForm.optional')}</span></Label>
        <Input id="independent-booking-email-input" data-qa="independent-booking-email-input" type="email" autoComplete="email" inputMode="email" className="h-11" disabled={!enabled} value={contact.email} onChange={event => set({ email: event.target.value })}
          aria-describedby="independent-booking-email-help" />
        <p id="independent-booking-email-help" className="text-sm text-theme-secondary">{t('bookingForm.emailOptionalHint')}</p>
      </div>
    </div>
    <div className="space-y-1.5">
      <Label id="independent-booking-participants-label" htmlFor="independent-booking-participants">{t('bookingForm.participants')} <span className="font-normal text-theme-secondary">{t('bookingForm.optional')}</span></Label>
      <PhoneTagsInput id="independent-booking-participants" data-qa="independent-booking-participants" aria-labelledby="independent-booking-participants-label"
        value={contact.participants} onChange={participants => set({ participants })} onValidityChange={onParticipantsValid}
        exclude={contact.phone} disabled={!enabled} help={t('bookingForm.participantsPhoneHint')} helpClassName="text-theme-secondary" className="min-h-11" />
    </div>
    {problem && <p role="alert" data-qa="independent-booking-error" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{problem}</p>}
  </form>;
}

/** The chosen time in the details summary, with "Change time" (back to the picker, the same time selected). */
export function ChosenTime({ slot, timeFormat, timezone, quantity, onChangeTime }: {
  slot: TimeSlot; timeFormat: TimeFormat; timezone: string; quantity: number; onChangeTime: () => void;
}) {
  const { t } = useTranslation();
  return <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-theme-default p-3" data-qa="independent-booking-chosen">
    <CalendarCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-(--accent-primary)" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-xs text-theme-secondary">{t('public.independentBooking.chosenTime')}</p>
      <p className="text-sm font-semibold"><SlotWhen slot={slot} timeFormat={timeFormat} timezone={timezone} quantity={quantity} /></p>
      <button type="button" className="bk-link mt-1 min-h-8" data-qa="independent-booking-change" onClick={onChangeTime}>{t('public.independentBooking.changeTime')}</button>
    </div>
  </div>;
}

/** Confirm, in the Confirm bar. It submits the details form by its id. */
export function SubmitButton({ formId, enabled, busy }: { formId: string; enabled: boolean; busy: boolean }) {
  const { t } = useTranslation();
  return <Button type="submit" form={formId} className="bk-action h-12 text-base" data-qa="independent-booking-submit" disabled={!enabled || busy}>
    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}{t('public.independentBooking.submit')}
  </Button>;
}

/** The confirmation: when, the reference, the email status, then the share card and the "your own page" prompt. */
export function BookingConfirmed({ booking, timeFormat, timezone, online, moment }: { booking: Booked; timeFormat: TimeFormat; timezone: string; online?: string; moment?: ReactNode }) {
  const { t } = useTranslation();
  return <section role="status" className="mx-auto max-w-2xl space-y-4" data-qa="independent-booking-confirmed">
    <Card className="relative overflow-hidden rounded-2xl">{moment}<CardContent className="relative space-y-4 p-6 sm:p-8">
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
      <p className="text-sm text-theme-secondary" data-qa="booking-reference">{fill(t('staff.payments.referenceLine'), booking.id)}</p>
      <p className="text-sm" data-qa="independent-booking-email">{booking.emailed ? t('public.independentBooking.emailed') : t('customerBooking.noEmailBody')}</p>
      {booking.managePath && <ManageLink path={booking.managePath} />}
      {online && <p className="text-sm text-theme-secondary" data-qa="independent-booking-link-note">{t('onlineSession.linkByEmail')}</p>}
    </CardContent></Card>
    <CustomerShareCard source={{ bookingId: booking.id }} />
    <BusinessPrompt managePath={booking.managePath} />
  </section>;
}

export function SlotWhen({ slot, timeFormat, timezone, quantity }: { slot: TimeSlot; timeFormat: TimeFormat; timezone: string; quantity: number }) {
  const { t, language } = useTranslation();
  const start = new Date(slot.start_time);
  // Habesha time in the business's zone and the page language ("6:00 in the afternoon (Habesha time)" on English pages).
  const time = timeFormat === 'ethiopian' ? formatInstant(start, 'ethiopian', timezone, { language, style: 'full' }) : formatTime(start, timeFormat, timezone);
  // Habesha time shows the Ethiopian date of the time's day where the provider is.
  const day = formatBookingDay(dayInZone(start, timezone), language, intlLocale(language), timeFormat);
  return <>{day} · <span className="tabular-nums">{time}</span>
    {quantity > 1 && <> · {t('bookingPicker.times').replace('{0}', String(quantity))}</>}</>;
}

/** The booking's manage link, so a customer without email can still change or cancel. */
function ManageLink({ path }: { path: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = new URL(path, window.location.origin).toString();
  return <div data-qa="booking-manage" className="space-y-2 rounded-xl border border-theme-default p-4">
    <p className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4 shrink-0 text-(--accent-primary)" aria-hidden="true" />{t('customerBooking.manageTitle')}</p>
    <p className="text-sm text-theme-secondary">{t('customerBooking.manageBody')}</p>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code data-qa="booking-manage-link" className="min-w-0 flex-1 truncate rounded-lg border border-theme-default px-3 py-2 text-sm">{url}</code>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="min-h-11 flex-1 sm:flex-none" data-qa="booking-manage-copy"
          onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-1 h-4 w-4" aria-hidden="true" />}
          {copied ? t('customerBooking.copied') : t('customerBooking.copy')}
        </Button>
        <Button asChild size="sm" className="min-h-11 flex-1 sm:flex-none" data-qa="booking-manage-open"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--pe-color-on-primary, #fff)' }}>
          <a href={url}><ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" />{t('customerBooking.manageOpen')}</a>
        </Button>
      </div>
    </div>
  </div>;
}
