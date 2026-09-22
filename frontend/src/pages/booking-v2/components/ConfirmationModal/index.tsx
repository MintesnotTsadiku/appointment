/**
 * ConfirmationModal - Phase 4: Complete
 * Beautiful success confirmation with actions
 */

import { CheckCircle2, Calendar, Clock, Mail, MapPin, Copy, ExternalLink, X, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { formatDate, formatTime } from "../../utils/dateHelpers";
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
}: ConfirmationModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const startTime = new Date(selectedSlot.start_time);
  const formattedTime = timeFormat === '24h' 
    ? formatTime(startTime, '24h', timezone)
    : formatTime(startTime, '12h', timezone);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 text-lg">
              Your appointment has been successfully scheduled
            </DialogDescription>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Booking Details */}
        <div className="space-y-4 px-6 pb-6">
          {/* Confirmation Email Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Booking Saved
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Keep your booking reference. Delivery has not been confirmed.{" "}
                  <span className="font-semibold">{userEmail}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Appointment Details Card */}
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-4">
              Appointment Details
            </h3>

            {/* Service */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Service</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  {service.name}
                </p>
                {service.provider && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    with {service.provider.name}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                  {formatDate(selectedDate, 'full')}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {formattedTime} • {service.duration} minutes
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {timezone}
                </p>
              </div>
            </div>

            {/* Location */}
            {service.location && (
              <div className="flex items-start gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {service.location.is_online ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Online Meeting
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
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {bookingResponse.meetingProvider || "Meeting"} Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg truncate">
                      {bookingResponse.meetLink}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(bookingResponse.meetLink!, "meetLink")}
                      className="flex-shrink-0"
                    >
                      {copied === "meetLink" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Booking ID */}
            {bookingResponse.bookingId && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                Booking ID: <span className="font-mono">{bookingResponse.bookingId}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Add to Calendar */}
            {bookingResponse.calendarEventUrl && (
              <Button
                onClick={() => window.open(bookingResponse.calendarEventUrl, "_blank")}
                className="w-full h-12 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Add to Calendar
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
                Join Meeting
              </Button>
            )}
          </div>

          {/* Reschedule Link */}
          {bookingResponse.rescheduleUrl && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Need to make changes?
              </p>
              <Button
                onClick={() => window.open(bookingResponse.rescheduleUrl, "_blank")}
                variant="ghost"
                className="w-full justify-start text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                Reschedule or Cancel Appointment →
              </Button>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm">
              What's Next?
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>Save your booking reference for contacting the business</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>Add the event to your calendar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>Join the meeting at the scheduled time using the link</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                <span>You can reschedule or cancel up to 24 hours before</span>
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-12 mt-4"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add animation CSS (can be added to global.css)
const styles = `
@keyframes scale-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 0.5s ease-out;
}
`;

