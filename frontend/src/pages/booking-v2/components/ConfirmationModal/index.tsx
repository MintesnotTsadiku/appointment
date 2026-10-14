/**
 * ConfirmationModal - Phase 4: Complete
 * Beautiful success confirmation with actions
 */

import { CheckCircle2, Calendar, Clock, Mail, MapPin, Copy, ExternalLink, X, Link2, Phone } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { useOnlineLabel } from "@/components/online-session/JoinSession";
import { intlLocale, useTranslation } from "@/lib/i18n";
import { usePlatformBrand } from "@/lib/platform-brand";
import BusinessPrompt from "@/components/business-prompt";
import CustomerShareCard from "@/components/growth-referrals/CustomerShareCard";
import PoweredBy from "@/components/powered-by";
import { formatDate } from "../../utils/dateHelpers";
import { clockForLanguage, formatInstant, zoneLabel } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import type { BookingResponse, Service, TimeSlot } from "../../types";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  bookingResponse: BookingResponse;
  service: Service;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  timeFormat: '12h' | '24h' | 'ethiopian';
  timezone: string;
  userEmail: string;
  /** The phone number the business will use, in E.164 form. */
  userPhone?: string;
  brandStyle?: CSSProperties;
}

export function ConfirmationModal({
  open,
  onClose,
  bookingResponse,
  service,
  selectedDate,
  selectedSlot,
  timeFormat,
  timezone,
  userEmail,
  userPhone,
  brandStyle,
}: ConfirmationModalProps) {
  const { t, language } = useTranslation();
  const onlineLabel = useOnlineLabel();
  const { growth } = usePlatformBrand();
  const [copied, setCopied] = useState<string | null>(null);
  const emailQueued = bookingResponse.notificationStatus === "queued";
  // The manage link works without email: a phone-only customer keeps it to change or cancel.
  const manageUrl = bookingResponse.managePath ? new URL(bookingResponse.managePath, window.location.origin).toString() : "";

  const startTime = new Date(selectedSlot.start_time);
  const formattedTime = formatInstant(startTime, clockForLanguage(language, timeFormat), timezone);
  const timezoneLabel = zoneLabel(timezone, language, t("customerBooking.zoneTime"), (city) => {
    const key = `timeZoneCities.${city}`;
    const name = t(key);
    return name === key ? null : name;
  });

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent data-booking-confirmation="true" style={brandStyle} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Success Animation Header */}
        <div className="relative">
          <div className="flex flex-col items-center text-center pt-6 pb-4">
            {/* Animated Success Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
              <div className="relative w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 animate-scale-in" />
              </div>
            </div>

            {/* Success Message */}
            <DialogTitle
              data-qa="booking-success"
              className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-2"
            >
              {t("customerBooking.title")}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 text-lg">
              {t("customerBooking.subtitle")}
            </DialogDescription>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t("customerBooking.close")}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Booking Details */}
        <div className="min-w-0 space-y-4 px-6 pb-6">
          {/* Confirmation Email Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p data-qa="booking-email-notice" data-qa-state={emailQueued ? "queued" : "not-sent"} className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  {emailQueued ? t("customerBooking.emailQueuedTitle") : t("customerBooking.savedTitle")}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {emailQueued ? (
                    <>{t("customerBooking.emailQueuedBody")} <span className="font-semibold">{userEmail}</span></>
                  ) : userEmail ? (
                    <>{t("customerBooking.notSentBody")} <span className="font-semibold">{userEmail}</span></>
                  ) : (
                    t("customerBooking.noEmailBody")
                  )}
                </p>
                {userPhone && (
                  <p data-qa="booking-phone-notice" className="mt-1 flex items-center gap-1.5 text-sm text-blue-700 dark:text-blue-300">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t("customerBooking.phoneOnFile").replace("{0}", "")}<span dir="ltr" className="font-semibold">{formatPhone(userPhone)}</span></span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Details Card */}
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-4">
              {t("customerBooking.details")}
            </h3>

            {/* Service */}
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("customerBooking.service")}</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  {service.name}
                </p>
                {service.provider && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("customerBooking.withProvider").replace("{0}", service.provider.name)}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("customerBooking.dateTime")}</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  {formatDate(selectedDate, 'full', intlLocale(language))}
                </p>
                <p data-qa="booking-confirmation-time" className="text-gray-900 dark:text-gray-100 mt-1">
                  {formattedTime} • {service.duration} {t("customerBooking.minutes")}
                </p>
                <p data-qa="booking-confirmation-zone" title={timezone} className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {timezoneLabel}
                </p>
              </div>
            </div>

            {/* Location */}
            {service.location && (
              <div className="flex items-start gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("customerBooking.location")}</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {service.location.is_online ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {onlineLabel(service.location.platform)}
                      </span>
                    ) : (
                      service.location.location_name
                    )}
                  </p>
                  {service.location.address && !service.location.is_online && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {service.location.address}
                    </p>
                  )}
                  {service.location.phone && !service.location.is_online && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      📞 {service.location.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Meeting Link */}
            {bookingResponse.meetLink && (
              <div className="flex items-start gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {bookingResponse.meetingProvider ? `${bookingResponse.meetingProvider} · ` : ""}{t("customerBooking.meetingLink")}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg truncate">
                      {bookingResponse.meetLink}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(bookingResponse.meetLink!, "meetLink")}
                      className="shrink-0"
                    >
                      {copied === "meetLink" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                          {t("customerBooking.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          {t("customerBooking.copy")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Booking reference: always shown, so a customer without email can quote it. */}
            {bookingResponse.bookingId && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("customerBooking.bookingId")}: <span data-qa="booking-reference" className="font-mono font-semibold text-gray-900 dark:text-gray-100 break-all">{bookingResponse.bookingId}</span>
                </p>
                <Button variant="outline" size="sm" data-qa="booking-reference-copy" onClick={() => handleCopy(bookingResponse.bookingId!, "reference")}>
                  {copied === "reference" ? <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied === "reference" ? t("customerBooking.copied") : t("customerBooking.copy")}
                </Button>
              </div>
            )}
          </div>

          {/* Manage link: change or cancel without email or an account. */}
          {manageUrl && (
            <div data-qa="booking-manage" className="min-w-0 overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("customerBooking.manageTitle")}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("customerBooking.manageBody")}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code data-qa="booking-manage-link" className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700">{manageUrl}</code>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" data-qa="booking-manage-copy" onClick={() => handleCopy(manageUrl, "manage")}>
                    {copied === "manage" ? <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied === "manage" ? t("customerBooking.copied") : t("customerBooking.copy")}
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-none" data-qa="booking-manage-open">
                    <a href={manageUrl}><ExternalLink className="h-4 w-4 mr-1" />{t("customerBooking.manageOpen")}</a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Add to Calendar */}
            {bookingResponse.calendarEventUrl && (
              <Button
                onClick={() => window.open(bookingResponse.calendarEventUrl, "_blank")}
                className="w-full h-12 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white"
              >
                <Calendar className="h-5 w-5 mr-2" />
                {t("customerBooking.addCalendar")}
              </Button>
            )}

            {/* Join Meeting */}
            {bookingResponse.meetLink && (
              <Button
                onClick={() => window.open(bookingResponse.meetLink, "_blank")}
                variant="outline"
                className="w-full h-12 border-2"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                {t("customerBooking.join")}
              </Button>
            )}
          </div>

          {/* Reschedule Link */}
          {bookingResponse.rescheduleUrl && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t("customerBooking.needChanges")}
              </p>
              <Button
                onClick={() => window.open(bookingResponse.rescheduleUrl, "_blank")}
                variant="ghost"
                className="w-full justify-start text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {t("customerBooking.rescheduleOrCancel")} →
              </Button>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm">
              {t("customerBooking.whatsNext")}
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>{t("customerBooking.next1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>{t("customerBooking.next2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>{t(bookingResponse.meetLink ? "customerBooking.next3Online" : "customerBooking.next3Place")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>{t("customerBooking.next4")}</span>
              </li>
            </ul>
          </div>

          {/* Customer to business: "Do you take appointments too?" */}
          {/* Customer referral: "Bring a friend" share link, when the business runs an offer. */}
          {bookingResponse.bookingId && <CustomerShareCard source={{ bookingId: bookingResponse.bookingId }} />}
          <BusinessPrompt managePath={bookingResponse.managePath} />

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-12 mt-4"
          >
            {t("customerBooking.done")}
          </Button>

          {growth.poweredByPages && <PoweredBy variant="inline" source="powered_by_page" className="py-1 max-md:pb-1 max-lg:py-1" />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

