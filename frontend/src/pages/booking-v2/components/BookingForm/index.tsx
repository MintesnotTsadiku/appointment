/**
 * BookingForm: the details step ("Confirm your booking") with validation.
 * The frame (fitted wide layout, phone layout, Confirm bar) is DetailsLayout; see docs/growth/BOOKING_LAYOUT.md.
 */

import { useId, useState, type ReactNode } from "react";
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, MessageSquare, Loader2, CheckCircle2, MapPin, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { PhoneInput, PhoneTagsInput } from "@/components/phone-input";
import { normalizePhone } from "@/lib/phone";
import { formatInstant, zoneLabel } from "@/lib/time";
import { formatBookingDay } from "@/lib/ethiopian-calendar";
import { priceLabel } from "@/pages/public-experience/provider-core";
import "../skin/skin.css";
import { BarAmount, DetailsLayout, focusField } from "./DetailsLayout";
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
  /** Above the fields, inside the scrolling form (the payment summary). */
  prelude?: ReactNode;
  /** Quiet links (Powered by): the summary column's footer, or above the Confirm bar on phones. */
  foot?: ReactNode;
  /** Fit the window on wide layouts: pages with the booking header (`--bk-top`), which also owns Back. */
  fit?: boolean;
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
  prelude,
  foot,
  fit = false,
}: BookingFormProps) {
  const formId = `bk-details-${useId().replace(/:/g, "")}`;
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

    // If there are errors, or a participant number still needs fixing, don't submit:
    // bring the first field to fix into view (inside the form on wide layouts) and focus it.
    const firstInvalid = (["userName", "userPhone", "userEmail"] as const).find((field) => newErrors[field]);
    if (firstInvalid || !participantsValid) {
      focusField(firstInvalid ?? "otherParticipants");
      return;
    }

    // Submit the form with the phone in its stored form
    await onSubmit({ ...formData, userPhone: normalizePhone(formData.userPhone), userEmail: formData.userEmail.trim() });
  };

  const startTime = new Date(selectedSlot.start_time);
  // The same clock as the picker and the confirmation (Habesha time on Amharic pages).
  const formattedTime = formatInstant(startTime, timeFormat, timezone, { language, style: "full" });
  const zone = zoneLabel(timezone, language, t("customerBooking.zoneTime"), (city) => {
    const key = `timeZoneCities.${city}`;
    const name = t(key);
    return name === key ? null : name;
  });

  const dayText = formatBookingDay(selectedDate, language, intlLocale(language), timeFormat);
  const price = service.price && service.price > 0 ? Number(service.price) : 0;
  const currency = service.currency || "ETB";
  const place = service.location ? (service.location.is_online ? onlineLabel(service.location.platform) : service.location.location_name) : "";
  const quantityText = quantity > 1 ? <span data-qa="booking-summary-quantity"> {t("bookingPicker.times").replace("{0}", String(quantity))}</span> : null;
  const zoneText = <span data-qa="booking-details-zone" title={timezone}>{zone}</span>;

  // The summary: the full card in the side column, a compact card on top of the form on phones.
  const summary = (wide: boolean) => wide ? (
    <section className="bk-card bk-details-summary" data-qa="booking-details-summary" aria-labelledby="bk-details-summary-title">
      <h2 id="bk-details-summary-title" className="bk-eyebrow mb-4">{t("bookingForm.summary")}</h2>
      <div className="bk-details-rows">
        <div className="bk-details-row">
          {media ? <span className="bk-summary-media shrink-0">{media}</span> : (
            <span className="bk-summary-icon shrink-0 flex items-center justify-center" aria-hidden="true"><Calendar className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("customerBooking.service")}</p>
            <p className="bk-details-summary-title font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{service.name}{quantityText}</p>
            {service.provider && <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{t("bookingPicker.with").replace("{0}", service.provider.name)}</p>}
          </div>
        </div>
        <div className="bk-details-row">
          <span className="bk-summary-icon shrink-0 flex items-center justify-center" aria-hidden="true"><Clock className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("customerBooking.dateTime")}</p>
            <p className="font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{dayText}</p>
            <p className="mt-0.5" style={{ color: "var(--text-primary)" }}>{formattedTime}</p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{service.duration} {t("customerBooking.minutes")} · {zoneText}</p>
          </div>
        </div>
        {service.location && (
          <div className="bk-details-row">
            <span className="bk-summary-icon shrink-0 flex items-center justify-center" aria-hidden="true"><MapPin className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("customerBooking.location")}</p>
              <p className="font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                {service.location.is_online ? (
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--accent-success)" }} />{place}</span>
                ) : place}
              </p>
              {service.location.address && !service.location.is_online && <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{service.location.address}</p>}
              {service.location.phone && !service.location.is_online && <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>{service.location.phone}</p>}
            </div>
          </div>
        )}
        {price > 0 && (
          <div className="bk-details-row items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("publicSite.price")}</span>
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{priceLabel(price, currency, language, "")}</span>
          </div>
        )}
      </div>
      <p className="bk-details-note">{t("bookingForm.note")}</p>
    </section>
  ) : (
    <section className="bk-card bk-details-compact" data-qa="booking-details-summary" data-media={media ? "true" : "false"} aria-label={t("bookingForm.summary")}>
      {media && <span className="bk-summary-media">{media}</span>}
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold leading-snug" style={{ color: "var(--text-primary)", fontFamily: "var(--booking-font-display)" }}>{service.name}{quantityText}</p>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{dayText} · <span className="tabular-nums">{formattedTime}</span></p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {[`${service.duration} ${t("customerBooking.minutes")}`, service.provider ? t("bookingPicker.with").replace("{0}", service.provider.name) : "", place].filter(Boolean).join(" · ")}
          {" · "}{zoneText}
        </p>
      </div>
    </section>
  );

  const fieldStyle = (invalid: boolean) => ({
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-primary)",
    border: `1px solid ${invalid ? "var(--accent-primary)" : "var(--border-default)"}`,
  });
  const nameInvalid = Boolean(errors.userName && touched.userName);
  const phoneInvalid = Boolean(errors.userPhone && touched.userPhone);
  const emailInvalid = Boolean(errors.userEmail && touched.userEmail);

  const fields = (
    <form id={formId} onSubmit={handleSubmit} className="bk-details-fields">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="userName" className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
          {t("bookingForm.fullName")} <span style={{ color: "var(--accent-primary)" }}>*</span>
        </Label>
        <div className="relative">
          <span className="bk-field-icon pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center" aria-hidden="true">
            <User className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
          </span>
          <Input
            id="userName"
            type="text"
            autoComplete="name"
            placeholder={t("bookingForm.namePlaceholder")}
            value={formData.userName}
            onChange={(e) => handleChange("userName", e.target.value)}
            onBlur={() => handleBlur("userName")}
            disabled={loading}
            className={cn("pl-12 h-12 text-base transition-all", nameInvalid && "border-red-500 focus:border-red-500")}
            style={fieldStyle(nameInvalid)}
            aria-invalid={nameInvalid ? "true" : "false"}
            aria-describedby={errors.userName ? "userName-error" : undefined}
          />
        </div>
        {nameInvalid && (
          <p id="userName-error" className="text-sm flex items-center gap-1" style={{ color: "var(--accent-primary)" }}>
            <span className="text-xs">⚠</span> {errors.userName}
          </p>
        )}
      </div>

      <div className="bk-details-pair">
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="userPhone" className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
            {t("bookingForm.phone")} <span style={{ color: "var(--accent-primary)" }}>*</span>
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
              showError={phoneInvalid}
              className="pl-12 h-12 text-base transition-all"
              style={fieldStyle(phoneInvalid)}
              messages={false}
              aria-describedby={phoneInvalid ? "userPhone-error" : "userPhone-help"}
            />
          </div>
          {phoneInvalid ? (
            <p id="userPhone-error" role="alert" data-qa="booking-phone-error" className="text-sm flex items-start gap-1" style={{ color: "var(--accent-primary)" }}>
              <span className="text-xs mt-0.5">⚠</span> <span>{errors.userPhone}</span>
            </p>
          ) : (
            <p id="userPhone-help" className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("bookingForm.phoneHint")}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="userEmail" className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
            {t("bookingForm.email")} {emailRequired ? <span style={{ color: "var(--accent-primary)" }}>*</span> : <span style={{ color: "var(--text-secondary)" }}>{t("bookingForm.optional")}</span>}
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
              className={cn("pl-12 h-12 text-base transition-all", emailInvalid && "border-red-500 focus:border-red-500")}
              style={fieldStyle(emailInvalid)}
              aria-invalid={emailInvalid ? "true" : "false"}
              aria-describedby={errors.userEmail ? "userEmail-error" : undefined}
            />
          </div>
          {emailInvalid && (
            <p id="userEmail-error" className="text-sm flex items-center gap-1" style={{ color: "var(--accent-primary)" }}>
              <span className="text-xs">⚠</span> {errors.userEmail}
            </p>
          )}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {emailRequired ? t("bookingForm.emailHint") : t("bookingForm.emailOptionalHint")}
          </p>
        </div>
      </div>

      {/* Additional participants */}
      <div className="space-y-2">
        <Label id="otherParticipants-label" htmlFor="otherParticipants" className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
          {t("bookingForm.participants")} <span style={{ color: "var(--text-secondary)" }}>{t("bookingForm.optional")}</span>
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
          className="min-h-12 px-3 py-2 transition-all"
          style={fieldStyle(false)}
          errorStyle={{ color: "var(--accent-primary)" }}
          helpStyle={{ color: "var(--text-secondary)" }}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
          {t("bookingForm.notes")} <span style={{ color: "var(--text-secondary)" }}>{t("bookingForm.optional")}</span>
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
            className="pl-12 min-h-[104px] text-base resize-none transition-all"
            style={fieldStyle(false)}
            rows={3}
          />
        </div>
      </div>
    </form>
  );

  // The Confirm bar: the total (or the time of a free booking) and Confirm, always in view.
  const bar = (
    <>
      {price > 0
        ? <BarAmount label={t("bookingForm.total")} value={priceLabel(price * Math.max(1, quantity), currency, language, "")} />
        : <BarAmount value={formattedTime} detail={dayText} />}
      <Button type="submit" form={formId} data-qa="booking-confirm" disabled={loading} className="bk-action h-12 text-base">
        {loading ? (
          <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />{t("bookingForm.confirming")}</>
        ) : (
          <><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{t("bookingForm.confirm")}</>
        )}
      </Button>
    </>
  );

  return (
    <div className={cn("w-full relative", className)} data-qa="booking-details">
      {/* Pages without the booking header (the personal meeting page) keep their own Back and mode switch. */}
      {!fit && (
        <div className="sticky top-0 z-50 w-full backdrop-blur-xl mb-4"
          style={{ backgroundColor: "color-mix(in srgb, var(--bg-primary) 95%, transparent)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="w-full max-w-7xl mx-auto px-5 md:px-6 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} disabled={loading}
              style={{ color: "var(--text-secondary)", backgroundColor: "var(--border-subtle)", border: "1px solid var(--border-default)" }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("bookingForm.changeDateTime")}
            </Button>
            <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{ backgroundColor: "var(--border-subtle)", border: "1px solid var(--border-default)" }} aria-label={t("bookingPicker.switchTheme")}>
              {theme === "light" ? <Moon className="h-4 w-4" style={{ color: "var(--accent-primary)" }} /> : <Sun className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />}
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{theme === "light" ? t("bookingPicker.dark") : t("bookingPicker.light")}</span>
            </button>
          </div>
        </div>
      )}
      <DetailsLayout
        fit={fit}
        summary={summary}
        summaryLabel={t("bookingForm.summary")}
        head={<><h1>{t("bookingForm.title")}</h1><p>{t("bookingForm.subtitle")}</p></>}
        bar={bar}
        foot={foot}
      >
        {prelude}
        {fields}
      </DetailsLayout>
    </div>
  );
}
