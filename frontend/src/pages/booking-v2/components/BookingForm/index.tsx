/**
 * BookingForm - Phase 3: Confirm
 * Premium contact details form with validation
 * Redesigned with "100 million startup" aesthetic
 */

import { useState, type ReactNode } from "react";
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, MessageSquare, Loader2, CheckCircle2, MapPin, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { PhoneInput, PhoneTagsInput } from "@/components/phone-input";
import { normalizePhone } from "@/lib/phone";
import { formatDate } from "../../utils/dateHelpers";
import { clockForLanguage, formatInstant, zoneLabel } from "@/lib/time";
import { priceLabel } from "@/pages/public-experience/provider-core";
import "../skin/skin.css";
import { useTheme } from "@/components/theme-provider";
import { useOnlineLabel } from "@/components/online-session/JoinSession";
import { intlLocale, useTranslation } from "@/lib/i18n";
import type { BookingFormData, TimeSlot, Service } from "../../types";

interface BookingFormProps {
  // Selected booking details
  service: Service;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  timeFormat: '12h' | '24h' | 'ethiopian';
  timezone: string;
  
  // Form handling
  initialData?: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => Promise<void>;
  onBack: () => void;
  
  // State
  loading?: boolean;
  className?: string;
  /** Party size, shown with the service when more than one. */
  quantity?: number;
  /** Personal calendar meetings send a calendar invitation, so they still need an email. */
  emailRequired?: boolean;
  /** The service photo in the skin's frame; it takes the place of the service icon in the summary. */
  media?: ReactNode;
}

export function BookingForm({
  service,
  selectedDate,
  selectedSlot,
  timeFormat,
  timezone,
  initialData = {},
  onSubmit,
  onBack,
  loading = false,
  className,
  quantity = 1,
  emailRequired = false,
  media,
}: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    userName: initialData.userName || "",
    userEmail: initialData.userEmail || "",
    userPhone: initialData.userPhone || "",
    notes: initialData.notes || "",
    otherParticipants: initialData.otherParticipants || "",
    participantPhones: initialData.participantPhones || [],
  });
  // False while the participants field holds text that is not a phone number yet.
  const [participantsValid, setParticipantsValid] = useState(true);

  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof BookingFormData, boolean>>>({});
  const { theme, setTheme } = useTheme();
  const { t, language } = useTranslation();
  const onlineLabel = useOnlineLabel();

  // Theme toggle handler
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Validation
  const validateField = (field: keyof BookingFormData, value: string): string | undefined => {
    switch (field) {
      case "userName":
        if (!value.trim()) return t("bookingForm.nameRequired");
        if (value.trim().length < 2) return t("bookingForm.nameShort");
        break;
      case "userEmail":
        if (!value.trim()) return emailRequired ? t("bookingForm.emailRequired") : undefined;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t("bookingForm.emailInvalid");
        break;
      case "userPhone":
        if (!value.trim()) return t("controls.phone.required");
        if (!normalizePhone(value)) return t("controls.phone.hint");
        break;
    }
    return undefined;
  };

  const handleChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Validate on change if field was touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof BookingFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = formData[field];
    const error = validateField(field, typeof value === "string" ? value : "");
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Name, then phone (required), then email (optional unless the meeting needs an invitation).
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};
    (["userName", "userPhone", "userEmail"] as const).forEach((field) => {
      const error = validateField(field, formData[field] || "");
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    setTouched({
      userName: true,
      userEmail: true,
      userPhone: true,
    });

    // If there are errors, or a participant number still needs fixing, don't submit
    if (Object.keys(newErrors).length > 0 || !participantsValid) {
      return;
    }

    // Submit the form with the phone in its stored form
    await onSubmit({ ...formData, userPhone: normalizePhone(formData.userPhone), userEmail: formData.userEmail.trim() });
  };

  const startTime = new Date(selectedSlot.start_time);
  // The same clock as the picker and the confirmation (Habesha time on Amharic pages).
  const formattedTime = formatInstant(startTime, clockForLanguage(language, timeFormat), timezone);
  const zone = zoneLabel(timezone, language, t("customerBooking.zoneTime"), (city) => {
    const key = `timeZoneCities.${city}`;
    const name = t(key);
    return name === key ? null : name;
  });

  return (
    <div 
      className={cn("w-full relative", className)}
      data-qa="booking-details"
    >

      {/* Sticky Header with Back Button and Theme Toggle */}
      <div
        className="sticky top-0 z-50 w-full backdrop-blur-xl"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-5 md:px-6 py-4 flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={loading}
            className="backdrop-blur-xs"
            style={{ 
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("bookingForm.changeDateTime")}
      </Button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-xs transition-all"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
            aria-label={t("bookingPicker.switchTheme")}
          >
            <span key={theme + "-icon"}>
                {theme === "light" ? (
                  <Moon className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                ) : (
                  <Sun className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                )}
            </span>
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === "light" ? t("bookingPicker.dark") : t("bookingPicker.light")}
            </span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto md:px-2 py-2 md:py-6">

        <div className="grid lg:grid-cols-[1fr_400px] gap-6 md:gap-8">
        {/* Form Section */}
          <div
            className="rounded-2xl backdrop-blur-xs p-6 md:p-8"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
          <div className="mb-6">
              <h1 
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
              {t("bookingForm.title")}
            </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
              {t("bookingForm.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
              <div
                className="space-y-2"
              >
                <Label 
                  htmlFor="userName" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t("bookingForm.fullName")} <span style={{ color: 'var(--accent-primary)' }}>*</span>
              </Label>
              <div className="relative">
                  <span className="bk-field-icon pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center" aria-hidden="true">
                    <User className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
                  </span>
                <Input
                  id="userName"
                  type="text"
                  placeholder={t("bookingForm.namePlaceholder")}
                  value={formData.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                  onBlur={() => handleBlur("userName")}
                  disabled={loading}
                  className={cn(
                      "pl-12 h-12 text-base backdrop-blur-xs transition-all",
                    errors.userName && touched.userName && "border-red-500 focus:border-red-500"
                  )}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: `1px solid ${errors.userName && touched.userName ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    }}
                  aria-invalid={errors.userName && touched.userName ? "true" : "false"}
                  aria-describedby={errors.userName ? "userName-error" : undefined}
                />
              </div>
              {errors.userName && touched.userName && (
                  <p 
                    id="userName-error" 
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                  <span className="text-xs">⚠</span> {errors.userName}
                </p>
              )}
              </div>

            {/* Phone Field */}
              <div
                className="space-y-2"
              >
                <Label 
                  htmlFor="userPhone" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t("bookingForm.phone")} <span style={{ color: 'var(--accent-primary)' }}>*</span>
              </Label>
              <div className="relative">
                  <span className="bk-field-icon pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center" aria-hidden="true">
                    <Phone className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
                  </span>
                <PhoneInput
                  id="userPhone"
                  data-qa="booking-phone"
                  required
                  value={formData.userPhone || ""}
                  onChange={(value) => handleChange("userPhone", value)}
                  onBlur={() => handleBlur("userPhone")}
                  disabled={loading}
                  showError={Boolean(errors.userPhone && touched.userPhone)}
                  className="pl-12 h-12 text-base backdrop-blur-xs transition-all"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${errors.userPhone && touched.userPhone ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  }}
                  messages={false}
                  aria-describedby={errors.userPhone && touched.userPhone ? "userPhone-error" : "userPhone-help"}
                />
              </div>
              {errors.userPhone && touched.userPhone ? (
                  <p 
                    id="userPhone-error" 
                    role="alert"
                    data-qa="booking-phone-error"
                    className="text-sm flex items-start gap-1"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                  <span className="text-xs mt-0.5">⚠</span> <span>{errors.userPhone}</span>
                </p>
              ) : (
                <p id="userPhone-help" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t("bookingForm.phoneHint")}
                </p>
              )}
              </div>

            {/* Email Field */}
              <div
                className="space-y-2"
              >
                <Label 
                  htmlFor="userEmail" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t("bookingForm.email")} {emailRequired ? <span style={{ color: 'var(--accent-primary)' }}>*</span> : <span style={{ color: 'var(--text-secondary)' }}>{t("bookingForm.optional")}</span>}
              </Label>
              <div className="relative">
                  <span className="bk-field-icon pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center" aria-hidden="true">
                    <Mail className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
                  </span>
                <Input
                  id="userEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  data-qa="booking-email"
                  placeholder="name@example.com"
                  value={formData.userEmail}
                  onChange={(e) => handleChange("userEmail", e.target.value)}
                  onBlur={() => handleBlur("userEmail")}
                  disabled={loading}
                  className={cn(
                      "pl-12 h-12 text-base backdrop-blur-xs transition-all",
                    errors.userEmail && touched.userEmail && "border-red-500 focus:border-red-500"
                  )}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: `1px solid ${errors.userEmail && touched.userEmail ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    }}
                  aria-invalid={errors.userEmail && touched.userEmail ? "true" : "false"}
                  aria-describedby={errors.userEmail ? "userEmail-error" : undefined}
                />
              </div>
              {errors.userEmail && touched.userEmail && (
                  <p 
                    id="userEmail-error" 
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                  <span className="text-xs">⚠</span> {errors.userEmail}
                </p>
              )}
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {emailRequired ? t("bookingForm.emailHint") : t("bookingForm.emailOptionalHint")}
              </p>
              </div>

            {/* Additional Participants */}
              <div
                className="space-y-2"
              >
                <Label 
                  id="otherParticipants-label"
                  htmlFor="otherParticipants" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t("bookingForm.participants")} <span style={{ color: 'var(--text-secondary)' }}>{t("bookingForm.optional")}</span>
              </Label>
              <PhoneTagsInput
                id="otherParticipants"
                data-qa="booking-participants"
                aria-labelledby="otherParticipants-label"
                value={formData.participantPhones || []}
                onChange={(numbers) => setFormData((prev) => ({ ...prev, participantPhones: numbers }))}
                onValidityChange={setParticipantsValid}
                exclude={formData.userPhone}
                disabled={loading}
                help={t("bookingForm.participantsPhoneHint")}
                className="min-h-12 px-3 py-2 backdrop-blur-xs transition-all"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                }}
                errorStyle={{ color: 'var(--accent-primary)' }}
                helpStyle={{ color: 'var(--text-secondary)' }}
              />
              </div>

            {/* Notes */}
              <div
                className="space-y-2"
              >
                <Label 
                  htmlFor="notes" 
                  className="text-base font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t("bookingForm.notes")} <span style={{ color: 'var(--text-secondary)' }}>{t("bookingForm.optional")}</span>
              </Label>
              <div className="relative">
                  <span className="bk-field-icon pointer-events-none absolute start-3.5 top-3 flex h-6 w-6 items-center justify-center" aria-hidden="true">
                    <MessageSquare className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
                  </span>
                <Textarea
                  id="notes"
                  placeholder={t("bookingForm.notesPlaceholder")}
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  disabled={loading}
                    className="pl-12 min-h-[120px] text-base resize-none backdrop-blur-xs transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                    }}
                  rows={4}
                />
              </div>
              </div>

            {/* Submit Button */}
              <div
                className="pt-4"
              >
              <Button
                type="submit"
                data-qa="booking-confirm"
                disabled={loading}
                  className="bk-action w-full h-14 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t("bookingForm.confirming")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {t("bookingForm.confirm")}
                  </>
                )}
              </Button>
              </div>
          </form>
          </div>

        {/* Booking Summary Sidebar */}
          <div
            className="lg:sticky lg:top-8 h-fit"
          >
            <div 
              className="rounded-2xl backdrop-blur-xs p-6 shadow-lg"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)'
              }}
            >
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
              {t("bookingForm.summary")}
            </h3>

            <div className="space-y-4">
              {/* Service */}
                <div
                  className="flex items-start gap-3 pb-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  {media ? <span className="bk-summary-media shrink-0">{media}</span> : (
                  <span className="bk-summary-icon shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" aria-hidden="true">
                    <Calendar className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t("customerBooking.service")}</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {service.name}
                    {quantity > 1 && <span data-qa="booking-summary-quantity"> {t("bookingPicker.times").replace("{0}", String(quantity))}</span>}
                  </p>
                  {service.provider && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {t("bookingPicker.with").replace("{0}", service.provider.name)}
                    </p>
                  )}
                </div>
                </div>

              {/* Date & Time */}
                <div
                  className="flex items-start gap-3 pb-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span className="bk-summary-icon shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" aria-hidden="true">
                    <Clock className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t("customerBooking.dateTime")}</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatDate(selectedDate, 'full', intlLocale(language))}
                  </p>
                    <p className="mt-1" style={{ color: 'var(--text-primary)' }}>
                    {formattedTime}
                  </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {service.duration} {t("customerBooking.minutes")}
                  </p>
                </div>
                </div>

              {/* Location */}
              {service.location && (
                  <div
                    className="flex items-start gap-3 pb-4"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <span className="bk-summary-icon shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" aria-hidden="true">
                    <MapPin className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t("customerBooking.location")}</p>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {service.location.is_online ? (
                        <span className="flex items-center gap-2">
                            <span 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: 'var(--accent-success)' }}
                            ></span>
                          {onlineLabel(service.location.platform)}
                        </span>
                      ) : (
                        service.location.location_name
                      )}
                    </p>
                    {service.location.address && !service.location.is_online && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {service.location.address}
                      </p>
                    )}
                    {service.location.phone && !service.location.is_online && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {service.location.phone}
                      </p>
                    )}
                  </div>
                  </div>
              )}

              {/* Timezone */}
                <div
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                <p className="font-medium mb-1">{t("bookingForm.timezone")}</p>
                <p data-qa="booking-details-zone" title={timezone}>{zone}</p>
                </div>

              {/* Price (if applicable) */}
              {service.price && service.price > 0 && (
                  <div
                    className="pt-4"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                  <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>{t("publicSite.price")}</span>
                      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {priceLabel(Number(service.price), service.currency || "ETB", language, "")}
                    </span>
                  </div>
                  </div>
              )}
            </div>

            {/* Info Banner */}
              <div
                className="mt-6 p-4 rounded-lg backdrop-blur-xs"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t("bookingForm.note")}
              </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

