/**
 * Organization booking: choose a service, then a time, then enter details.
 * `/schedule/org/<slug>` lists the services; `/schedule/org/<slug>/<service>?type=<offering>` opens the time picker.
 * A published website lends the pages its template's colours and type (useBookingBrand).
 * Layout and states: docs/growth/BOOKING_LAYOUT.md.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/app";
import { getLocalTimezone } from "@/lib/utils";
import { ArrowLeft, Clock3, LayoutGrid, MapPin, RotateCw, User, Video } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n";
import MetaTags from "@/components/meta-tags";
import PoweredBy from "@/components/powered-by";
import LanguageToggle from "@/components/language-toggle";
import { BookingState, BookingStatePage, ServicesSkeleton, TimePickerSkeleton, previewState, type BookingStateAction } from "@/components/booking-states";
import { useOnlineLabel } from "@/components/online-session/JoinSession";

import { ServiceSelector } from "@/pages/booking-v2/components/ServiceSelector";
import { BookingSummaryCard, DateTimeSelector, type SummaryFact } from "@/pages/booking-v2/components/DateTimeSelector";
import { shortProviderName } from "@/pages/booking-v2/components/DateTimeSelector/TimeSlotsPanel";
import { BookingForm } from "@/pages/booking-v2/components/BookingForm";
import { ConfirmationModal } from "@/pages/booking-v2/components/ConfirmationModal";
import CustomerInviteBanner from "@/components/growth-referrals/CustomerInviteBanner";
import { PaymentSummary, type CheckoutQuote, type PaymentMethod } from "@/pages/booking-v2/components/PaymentSummary";
import { QuantityPicker } from "@/pages/booking-v2/components/QuantityPicker";
import { useTimeSlots } from "@/pages/booking-v2/hooks/useTimeSlots";
import { useBookingSubmit } from "@/pages/booking-v2/hooks/useBookingSubmit";
import type { Organization, Service, TimeSlot as V2TimeSlot, BookingFormData, BookingResponse } from "@/pages/booking-v2/types";
import { useBookingBrand } from "@/public-experience/bookingTheme";
import { brandLogo } from "@/public-experience/templates/content";
import { BookingHeaderBar, ThemeSwitch } from "./header";
import "@/public-experience/platform.css";

interface BookingApiProvider {
  id?: string;
  name: string;
  avatar?: string;
  services?: string[];
}

interface BookingApiService {
  service_id?: string;
  slug: string;
  name: string;
  description?: string;
  duration: number;
  price?: number;
  type: Service["type"];
  provider_id?: string;
  provider_name?: string;
}

type Phase = "service" | "datetime" | "form" | "success";

/** Height of the sticky booking header; the time picker's sticky columns start under it. */
const HEADER_HEIGHT = "4.5rem";

const OrganizationAppointmentV2 = () => {
  const { orgSlug, serviceSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    setMeetingId,
    setUserInfo,
    userInfo,
    setTimeZone,
    timeZone,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    meetingDurationCards,
    setMeetingDurationCards,
  } = useAppContext();

  const [friendlyError, setFriendlyError] = useState<string>("");
  const [currentPhase, setCurrentPhase] = useState<Phase>("service");
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h" | "ethiopian">("12h");
  const [bookingResponse, setBookingResponse] = useState<(BookingResponse & { userEmail?: string }) | null>(null);
  // The slot as the picker shows it, with its provider, so it stays highlighted and the bar can name the provider.
  const [chosenSlot, setChosenSlot] = useState<V2TimeSlot | null>(null);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const onlineLabel = useOnlineLabel();
  const [quantity, setQuantity] = useState(1);
  useEffect(() => setQuantity(1), [serviceSlug]);
  const bookingMode = theme === "dark" || (theme === "system" && typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
    ? "dark"
    : "light";
  const bookingBrand = useBookingBrand(orgSlug, bookingMode);
  const forced = previewState();

  const type = searchParams.get("type");

  const apiEndpoint = orgSlug && serviceSlug
    ? "appointment.api.personal_meet.get_organization_meeting_windows"
    : orgSlug
    ? "appointment.api.personal_meet.get_organization_services"
    : null;

  const apiParams = orgSlug && serviceSlug
    ? { org_slug: orgSlug, service_slug: serviceSlug }
    : orgSlug
    ? { org_slug: orgSlug }
    : undefined;

  const { data, isLoading, error, mutate } = useFrappeGetCall(
    apiEndpoint ?? "",
    apiParams,
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // An unknown or unpublished page answers 403 or 404 at once; only server and network errors retry.
      onErrorRetry: (failure: { httpStatus?: number }, _key: string, _config: unknown, revalidate: (options: { retryCount: number }) => void, { retryCount }: { retryCount: number }) => {
        if ((failure?.httpStatus ?? 500) < 500 || retryCount >= 2) return;
        setTimeout(() => revalidate({ retryCount }), 1500);
      },
    }
  );

  useEffect(() => {
    if (orgSlug && serviceSlug) {
      setMeetingId(`${orgSlug}/${serviceSlug}`);
    }
    setTimeZone(getLocalTimezone());
  }, [orgSlug, serviceSlug, setMeetingId, setTimeZone]);

  useEffect(() => {
    if (data) {
      if (data?.message?.error) {
        const errorMsg = typeof data.message.error === "string"
          ? data.message.error
          : JSON.stringify(data.message.error);
        setFriendlyError(errorMsg);
        return;
      }

      if (!data?.message?.full_name && !data?.message?.company) {
        setFriendlyError("Invalid response from server");
        return;
      }

      setUserInfo({
        name: data?.message?.full_name,
        designation: data?.message?.position,
        organizationName: data?.message?.company,
        userImage: data?.message?.profile_pic,
        socialProfiles: [],
        meetingProvider: data?.message?.meeting_provider,
        banner_image: data?.message?.banner_image,
      });

      if (data?.message?.durations) {
        setMeetingDurationCards(data?.message?.durations);

        // A service link without an offering opens its first offering.
        if (serviceSlug && data?.message?.durations?.length > 0 && !type) {
          setSearchParams({ type: data.message.durations[0].id });
        }

        if (serviceSlug && type && data?.message?.durations?.length > 0) {
          setCurrentPhase((phase) => (phase === "service" ? "datetime" : phase));
        }
      }

      setFriendlyError("");
    }
  }, [data, serviceSlug, type, setMeetingDurationCards, setSearchParams, setUserInfo]);

  useEffect(() => {
    if (error) {
      let errorMessage = "";
      if (typeof error === "string") errorMessage = error;
      else if (error?.message) errorMessage = String(error.message);
      else if (error?.exception) errorMessage = String(error.exception);
      setFriendlyError(errorMessage || "error");
    }
  }, [error]);

  // A new service or day starts without a chosen time.
  useEffect(() => { setChosenSlot(null); }, [serviceSlug, type]);

  const shouldFetchSlots = !!(serviceSlug && type && selectedDate && meetingDurationCards.length > 0);

  const {
    slots,
    availableDays,
    validStartDate,
    validEndDate,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useTimeSlots({
    durationId: type || meetingDurationCards[0]?.id || "",
    date: shouldFetchSlots ? selectedDate : null,
    timezone: timeZone,
    organizationId: data?.message?.error ? undefined : data?.message?.organization_id,
    serviceId: data?.message?.error ? undefined : data?.message?.service_id,
    enabled: shouldFetchSlots && !data?.message?.error,
    quantity,
  });

  const { submitBooking, loading: bookingLoading } = useBookingSubmit();

  // Payment at booking: amounts, refund terms and methods for the chosen slot.
  const offeringId = type || meetingDurationCards[0]?.id || "";
  const { data: quoteData } = useFrappeGetCall<{ message: CheckoutQuote }>(
    "appointment.scheduler.payments.checkout",
    { offering_id: offeringId, start_time: selectedSlot?.start_time, quantity },
    currentPhase === "form" && offeringId && selectedSlot ? `checkout-${offeringId}-${selectedSlot.start_time}-${quantity}` : null,
    { revalidateOnFocus: false }
  );
  const quote = quoteData?.message;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  useEffect(() => {
    if (quote?.required) setPaymentMethod((current) => (current && quote.methods.includes(current) ? current : quote.methods[0] ?? null));
  }, [quote]);
  const paymentBlocked = Boolean(quote?.required && !quote.methods.length);

  const organization: Organization | null = data && !data?.message?.error ? {
    id: orgSlug || "",
    slug: orgSlug || "",
    name: data.message.company || data.message.full_name || "",
    logo: data.message.profile_pic,
    banner: data.message.banner_image,
    description: data.message.description || "",
    providers: data.message.providers?.map((p: BookingApiProvider) => ({
      id: p.id || p.name,
      name: p.name,
      avatar: p.avatar,
      designation: data.message.position,
      services: p.services,
    })) || [],
    services: data.message.services?.map((s: BookingApiService) => ({
      id: s.service_id || s.slug || s.name,
      slug: s.slug,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      currency: "ETB",
      type: s.type,
      provider: s.provider_id ? {
        id: s.provider_id,
        name: s.provider_name,
        avatar: data.message.providers?.find((provider: BookingApiProvider) => provider.id === s.provider_id)?.avatar,
      } : undefined,
      providerCount: s.provider_id ? 1 : data.message.provider_count,
    })) || [],
  } : null;

  const currentService: Service | null = serviceSlug && data && !data?.message?.error ? {
    id: data.message.service_id || serviceSlug,
    slug: serviceSlug,
    name: data.message.service_name || serviceSlug,
    duration: meetingDurationCards[0]?.duration || 30,
    type: "organization",
    providerCount: data.message.provider_count,
    // Who or what is booked: the provider, or the room or machine of a service booked without staff.
    provider: data.message.providers?.[0] ? { id: data.message.providers[0].id, name: data.message.providers[0].name, avatar: data.message.providers[0].avatar } : undefined,
    location: data.message.location,
  } : null;

  const availableDaysNumbers = availableDays?.map((day: string) => {
    const dayMap: { [key: string]: number } = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    return dayMap[day];
  }).filter((d: number | undefined) => d !== undefined) || [];

  const handleServiceSelect = (service: Service) => {
    navigate(`/schedule/org/${orgSlug}/${service.slug}`);
  };

  const handlePhaseBack = () => {
    if (currentPhase === "form") {
      refetchSlots?.();
      setCurrentPhase("datetime");
      return;
    }
    if (currentPhase === "datetime") {
      setCurrentPhase("service");
      navigate("/schedule/org/" + orgSlug);
      return;
    }
    navigate(bookingBrand.publicRoot);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setChosenSlot(null);
  };

  // Choosing a time keeps the picker open; the bottom bar shows it with "Continue".
  const handleSlotSelect = (slot: V2TimeSlot) => {
    setChosenSlot(slot);
    setSelectedSlot({ start_time: slot.start_time, end_time: slot.end_time, provider: slot.provider });
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!currentService || !selectedDate || !selectedSlot) return;

    try {
      const response = await submitBooking({
        durationId: type || meetingDurationCards[0]?.id || "",
        date: selectedDate,
        timeSlot: {
          id: "temp",
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          available: true,
          provider: selectedSlot.provider,
        },
        formData,
        timezone: timeZone,
        timeFormat,
        organizationId: data?.message?.error ? undefined : data?.message?.organization_id,
        serviceId: data?.message?.error ? undefined : data?.message?.service_id,
        paymentMethod: quote?.required ? paymentMethod : null,
        quantity,
      });

      // A held booking continues on the customer's manage page, where they pay.
      if (response.status === "Pending" && response.managePath) {
        // A full load: the manage page is a standalone public page without the app's own controls.
        window.location.assign(`${response.managePath}${paymentMethod === "Chapa" ? "?pay=chapa" : ""}`);
        return;
      }

      if (refetchSlots) await refetchSlots();
      setBookingResponse({ ...response, userEmail: formData.userEmail });
      setCurrentPhase("success");
    } catch (error) {
      console.error("Booking error:", error);
    }
  };

  const brandName = bookingBrand.config?.identity.applicationName || userInfo?.organizationName || "";
  const logo = bookingBrand.config ? brandLogo(bookingBrand.config.compiledDesign) : "";
  const pageStyle = { ...bookingBrand.style, "--bk-top": HEADER_HEIGHT } as CSSProperties;
  const header = (
    <BookingHeaderBar
      height={HEADER_HEIGHT}
      style={bookingBrand.style}
      branded={Boolean(bookingBrand.config)}
      recipe={bookingBrand.config?.recipeKey}
      home={bookingBrand.publicRoot}
      homeLabel={brandName ? t("schedulerPage.backTo").replace("{0}", brandName) : t("publicSite.backToSite")}
      name={brandName || (isLoading ? "" : t("schedulerPage.appointments"))}
      logo={logo}
      back={currentPhase !== "service" && !friendlyError && !error ? (
        <button type="button" onClick={handlePhaseBack} className="booking-back" aria-label={t("schedulerPage.previousStep")}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t("schedulerPage.back")}</span>
        </button>
      ) : null}
      step={!friendlyError && !error ? t(currentPhase === "service" ? "schedulerPage.stepService" : currentPhase === "datetime" ? "schedulerPage.stepTime" : currentPhase === "form" ? "schedulerPage.stepDetails" : "schedulerPage.stepDone") : undefined}
      actions={<><LanguageToggle /><ThemeSwitch /></>}
    />
  );

  const unavailable = Boolean(error || friendlyError) || forced === "error" || forced === "unavailable";
  // Loading: a skeleton in the shape of the page that comes.
  if ((isLoading && !data && !unavailable) || forced === "loading") {
    return (
      <>
        {header}
        <div className="booking-experience min-h-screen px-4 py-6 text-theme-primary sm:px-6" style={{ ...pageStyle, backgroundColor: "var(--bg-primary)" }}
          data-booking-branded={bookingBrand.config ? "true" : "false"} data-pe-recipe={bookingBrand.config?.recipeKey} data-qa="booking-loading">
          <div className="mx-auto max-w-7xl">{serviceSlug ? <TimePickerSkeleton /> : <ServicesSkeleton />}</div>
        </div>
      </>
    );
  }

  // Not available: an unknown or unpublished business or service, or a failed request.
  if (unavailable) {
    const failed = forced === "error" || Boolean(error && (!error.httpStatus || error.httpStatus >= 500));
    const actions: BookingStateAction[] = failed
      ? [{ label: t("bookingStates.retry"), onClick: () => void mutate(), icon: RotateCw, qa: "booking-state-retry" }]
      : serviceSlug ? [{ label: t("bookingStates.seeServices"), href: `/schedule/org/${orgSlug}`, icon: LayoutGrid, qa: "booking-state-services" }] : [];
    actions.push({ label: t("bookingStates.goHome"), href: "/", qa: "booking-state-home" });
    return (
      <>
        <MetaTags title={t("bookingStates.unavailableTitle")} description={t("bookingStates.unavailableBody")} />
        <BookingStatePage style={pageStyle} header={header} branded={Boolean(bookingBrand.config)} recipe={bookingBrand.config?.recipeKey} qa="booking-unavailable-page">
          <BookingState kind={failed ? "error" : serviceSlug ? "unavailable" : "not-found"} headingLevel={1} qa="booking-unavailable"
            title={failed ? t("bookingStates.errorTitle") : serviceSlug ? t("bookingStates.serviceUnavailableTitle") : t("bookingStates.unavailableTitle")}
            description={failed ? t("bookingStates.errorBody") : serviceSlug ? t("bookingStates.serviceUnavailableBody") : t("bookingStates.unavailableBody")}
            actions={actions} />
        </BookingStatePage>
      </>
    );
  }

  const location = currentService?.location;
  const facts: SummaryFact[] = [];
  if (currentService) {
    facts.push({ icon: Clock3, text: t("bookingPicker.minutes").replace("{0}", String(currentService.duration)), qa: "booking-summary-duration" });
    if (organization?.providers.length === 1 && currentService.provider?.name) {
      facts.push({ icon: User, text: t("bookingPicker.with").replace("{0}", shortProviderName(currentService.provider.name)) });
    }
    if (location) {
      facts.push(location.is_online
        ? { icon: Video, text: onlineLabel(location.platform), qa: "booking-summary-online" }
        : { icon: MapPin, text: location.location_name || location.name, detail: location.address, qa: "booking-summary-place" });
    }
  }

  return (
    <>
      <MetaTags
        title={`${userInfo?.name || "Book Appointment"} | Scheduler`}
        description={`Schedule an appointment with ${userInfo?.name || "us"}`}
      />
      {header}
      <div
        className={`booking-experience min-h-screen text-theme-primary ${currentPhase === "datetime" ? "" : "pb-10"}`}
        data-booking-branded={bookingBrand.config ? "true" : "false"}
        data-pe-recipe={bookingBrand.config?.recipeKey}
        style={{ ...pageStyle, backgroundColor: "var(--bg-primary)" }}
      >
        <div className="booking-stage relative z-10">
          {/* A friend's share link: "You were invited by …" (customer referrals). */}
          {currentPhase !== "success" && <CustomerInviteBanner slug={orgSlug} className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-3xl" />}

          {currentPhase === "service" && organization && !serviceSlug && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <ServiceSelector organization={organization} services={organization.services} onServiceSelect={handleServiceSelect} />
            </div>
          )}

          {/* A service link resolves its offering first. */}
          {currentPhase === "service" && serviceSlug && (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><TimePickerSkeleton /></div>
          )}

          <AnimatePresence mode="wait">
            {currentPhase === "datetime" && currentService && (
              <motion.div
                key="datetime"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-4 sm:px-6"
              >
                <DateTimeSelector
                  selectedDate={selectedDate}
                  displayMonth={displayMonth}
                  onDateSelect={handleDateSelect}
                  onMonthChange={setDisplayMonth}
                  availableDays={availableDaysNumbers}
                  minDate={validStartDate}
                  maxDate={validEndDate}
                  availableSlots={slots}
                  selectedSlot={chosenSlot}
                  onSlotSelect={handleSlotSelect}
                  timeFormat={timeFormat}
                  onTimeFormatChange={setTimeFormat}
                  timezone={timeZone}
                  loading={slotsLoading}
                  serviceName={currentService.name}
                  duration={currentService.duration}
                  location={currentService.location}
                  summary={<BookingSummaryCard eyebrow={organization?.name} title={currentService.name} titleQa="booking-picker-service" facts={facts} />}
                  extras={Boolean(data?.message?.allow_quantity) && (
                    <QuantityPicker className="bk-card" value={quantity} max={Math.max(1, Number(data?.message?.max_quantity) || 1)}
                      onChange={(next) => { setQuantity(next); setChosenSlot(null); }} />
                  )}
                  action={{ label: t("bookingLayout.continue"), onClick: () => chosenSlot && setCurrentPhase("form") }}
                  footer={<PoweredBy variant="inline" className="!py-2 max-md:!pb-2" />}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {currentPhase === "form" && currentService && selectedSlot && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="py-8 px-4"
              >
                {quote?.required && <PaymentSummary quote={quote} method={paymentMethod} onMethod={setPaymentMethod} />}
                {!paymentBlocked && (
                  <BookingForm
                    service={currentService}
                    selectedDate={selectedDate}
                    selectedSlot={{
                      id: "temp",
                      start_time: selectedSlot.start_time,
                      end_time: selectedSlot.end_time,
                      available: true,
                    }}
                    timeFormat={timeFormat}
                    timezone={timeZone}
                    onSubmit={handleBookingSubmit}
                    onBack={handlePhaseBack}
                    loading={bookingLoading}
                    quantity={quantity}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {currentPhase === "success" && bookingResponse && currentService && selectedSlot && (
              <ConfirmationModal
                open={true}
                onClose={() => {
                  if (refetchSlots) refetchSlots();
                  setChosenSlot(null);
                  setCurrentPhase("datetime");
                }}
                bookingResponse={bookingResponse}
                service={currentService}
                selectedDate={selectedDate}
                selectedSlot={{
                  id: "temp",
                  start_time: selectedSlot.start_time,
                  end_time: selectedSlot.end_time,
                  available: true,
                }}
                timeFormat={timeFormat}
                timezone={timeZone}
                userEmail={bookingResponse.userEmail || ""}
                brandStyle={bookingBrand.style}
              />
            )}
          </AnimatePresence>

          {currentPhase !== "datetime" && (
            <div className="relative z-10 mt-8">
              <PoweredBy />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrganizationAppointmentV2;
