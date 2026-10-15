/**
 * Organization booking: choose a service, then a time, then enter details.
 * `/schedule/org/<slug>` lists the services; `/schedule/org/<slug>/<service>?type=<offering>` opens the time picker.
 * A published website lends the pages its template's colours and type (useBookingBrand).
 * Layout and states: docs/growth/BOOKING_LAYOUT.md.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/app";
import { getLocalTimezone } from "@/lib/utils";
import { localizeBookingPayload, siteName } from "@/lib/local-names";
import { ArrowLeft, Clock3, LayoutGrid, MapPin, RotateCw, User, Video } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n";
import MetaTags from "@/components/meta-tags";
import PoweredBy from "@/components/powered-by";
import LanguageToggle from "@/components/language-toggle";
import { BookingState, BookingStatePage, ServicesSkeleton, TimePickerSkeleton, previewState, type BookingStateAction } from "@/components/booking-states";
import { useOnlineLabel } from "@/components/online-session/JoinSession";

import { ServiceSelector } from "@/pages/booking-v2/components/ServiceSelector";
import { BookingSummaryCard, DateTimeSelector, usePickerTimeFormat, type SummaryFact } from "@/pages/booking-v2/components/DateTimeSelector";
import { shortProviderName } from "@/pages/booking-v2/components/DateTimeSelector/TimeSlotsPanel";
import { BookingForm } from "@/pages/booking-v2/components/BookingForm";
import { ConfirmationModal } from "@/pages/booking-v2/components/ConfirmationModal";
import CustomerInviteBanner from "@/components/growth-referrals/CustomerInviteBanner";
import { PaymentSummary, type CheckoutQuote, type PaymentMethod } from "@/pages/booking-v2/components/PaymentSummary";
import { QuantityPicker } from "@/pages/booking-v2/components/QuantityPicker";
import { useTimeSlots } from "@/pages/booking-v2/hooks/useTimeSlots";
import { useBookingSubmit } from "@/pages/booking-v2/hooks/useBookingSubmit";
import type { Organization, Service, ServiceLocation, ServiceOffering, TimeSlot as V2TimeSlot, BookingFormData, BookingResponse } from "@/pages/booking-v2/types";
import { BookingBackdrop, BookingSteps, ServicePhoto, servicePhotoSource, useBookingSkin, type BookingStep } from "@/pages/booking-v2/components/skin";
import { useBookingBrand } from "@/public-experience/bookingTheme";
import { brandLogo } from "@/public-experience/templates/content";
import { haptic } from "@/public-experience/templates/kit/haptics";
import { TemplateMoment } from "@/public-experience/templates/moments";
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
  image?: string;
  /** The service's place in the website's services section (for the template's own photo), or -1. */
  photo_index?: number;
  /** The website's name and summary of the service, by language. */
  local_name?: Record<string, string>;
  local_description?: Record<string, string>;
}

interface BookingApiOffering {
  id: string;
  provider?: BookingApiProvider;
  duration?: number;
  price?: number;
  location?: ServiceLocation;
}

type Phase = "service" | "datetime" | "form" | "success";
const STEP_OF: Record<Phase, BookingStep> = { service: "service", datetime: "time", form: "details", success: "done" };

/**
 * One card per service: the API lists one row per offering (service with one provider at one place).
 * The first row of a service is its anchor; the price is the lowest, marked "from" when they differ.
 */
function groupServices(rows: BookingApiService[], providers: BookingApiProvider[], providerCount: number, language: string): Service[] {
  const groups = new Map<string, Service>();
  rows.forEach((row) => {
    const key = row.service_id || row.slug;
    const provider = row.provider_id ? { id: row.provider_id, name: row.provider_name || "", avatar: providers.find((item) => item.id === row.provider_id)?.avatar } : undefined;
    const offering: ServiceOffering = { id: row.slug, provider, duration: row.duration, price: row.price };
    const found = groups.get(key);
    if (!found) {
      groups.set(key, {
        id: key, slug: row.slug, name: row.local_name?.[language] || row.name,
        description: row.local_description?.[language] || row.description, duration: row.duration, price: row.price,
        currency: "ETB", type: row.type, provider, providerCount: row.provider_id ? 1 : providerCount, image: row.image || undefined,
        photoIndex: row.photo_index ?? -1, offerings: [offering],
      });
      return;
    }
    found.offerings!.push(offering);
    found.providerCount = found.offerings!.length;
    if (typeof row.price === "number" && row.price !== found.price) {
      found.priceFrom = true;
      if (!found.price || row.price < found.price) found.price = row.price;
    }
    if (row.duration < found.duration) found.duration = row.duration;
  });
  return Array.from(groups.values());
}

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
  // Habesha time first in Amharic; the customer's choice in the toggle wins.
  const [timeFormat, setTimeFormat] = usePickerTimeFormat();
  const [bookingResponse, setBookingResponse] = useState<(BookingResponse & { userEmail?: string; userPhone?: string }) | null>(null);
  // The slot as the picker shows it, with its provider, so it stays highlighted and the bar can name the provider.
  const [chosenSlot, setChosenSlot] = useState<V2TimeSlot | null>(null);
  const { theme } = useTheme();
  const { t, language, setLanguage, languages } = useTranslation();
  const onlineLabel = useOnlineLabel();
  // `?lang=am` from an Amharic website: the booking pages continue in that language.
  const langParam = searchParams.get("lang");
  useEffect(() => {
    if (langParam && langParam !== language && languages.includes(langParam)) setLanguage(langParam);
  }, [langParam, language, languages, setLanguage]);
  // Each step starts at the top of the page (an in-app link keeps the previous page's scroll).
  useEffect(() => { window.scrollTo(0, 0); }, [serviceSlug, currentPhase]);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => setQuantity(1), [serviceSlug]);
  const bookingMode = theme === "dark" || (theme === "system" && typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
    ? "dark"
    : "light";
  const bookingBrand = useBookingBrand(orgSlug, bookingMode);
  const skin = useBookingSkin(bookingBrand.config, bookingBrand.style, bookingMode);
  const forced = previewState();

  const type = searchParams.get("type");
  // `?with=<provider>` opens the time picker with one provider and `?with=any` with all of them.
  // An offering's own link (no `with`) starts with that offering's provider.
  const withParam = searchParams.get("with");

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

  const { data: answer, isLoading, error, mutate } = useFrappeGetCall(
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

  // Business and provider names in the page language (Amharic names from `localized_names`).
  const data = useMemo(() => (answer?.message ? { ...answer, message: localizeBookingPayload(answer.message, language) } : answer), [answer, language]);

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

        // A service link without an offering opens its first offering (and keeps `with`).
        if (serviceSlug && data?.message?.durations?.length > 0 && !type) {
          const first = data.message.durations[0].id;
          setSearchParams((previous) => { const next = new URLSearchParams(previous); next.set("type", first); return next; }, { replace: true });
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

  // The service with each of its providers (and their places); the picker shows their times together.
  const offerings: BookingApiOffering[] = serviceSlug && !data?.message?.error && Array.isArray(data?.message?.offerings) ? data.message.offerings : [];
  const anchorProvider: string | undefined = data?.message?.providers?.[0]?.id;
  const providerFilter = offerings.length < 2 ? "all"
    : withParam === "any" ? "all"
    : withParam && offerings.some((item) => item.provider?.id === withParam) ? withParam
    : anchorProvider || "all";
  const changeProvider = (next: string) => {
    setSearchParams((previous) => { const params = new URLSearchParams(previous); params.set("with", next === "all" ? "any" : next); return params; }, { replace: true });
    if (chosenSlot && next !== "all" && chosenSlot.provider?.id !== next) setChosenSlot(null);
  };
  const offeredBy = offerings.flatMap((item) => (item.provider ? [{ id: item.provider.id || item.provider.name, name: item.provider.name, avatar: item.provider.avatar }] : []))
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);

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
    allProviders: offerings.length > 1,
  });

  const { submitBooking, loading: bookingLoading } = useBookingSubmit();

  // The booking is for the chosen time's own offering (its provider and place), else the anchor.
  const offeringId = chosenSlot?.offeringId || type || meetingDurationCards[0]?.id || "";
  const bookedOffering = offerings.find((item) => item.id === offeringId);
  // Payment at booking: amounts, refund terms and methods for the chosen slot.
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
    services: groupServices(data.message.services || [], data.message.providers || [], data.message.provider_count, language),
  } : null;

  const currentService: Service | null = serviceSlug && data && !data?.message?.error ? {
    id: data.message.service_id || serviceSlug,
    slug: serviceSlug,
    name: data.message.local_name?.[language] || data.message.service_name || serviceSlug,
    duration: meetingDurationCards[0]?.duration || 30,
    type: "organization",
    providerCount: data.message.provider_count,
    // Who or what is booked: the provider, or the room or machine of a service booked without staff.
    provider: data.message.providers?.[0] ? { id: data.message.providers[0].id, name: data.message.providers[0].name, avatar: data.message.providers[0].avatar } : undefined,
    location: data.message.location,
    image: data.message.image || undefined,
    price: data.message.price,
    currency: "ETB",
  } : null;
  // What the customer books once a time is chosen: that time's provider, place, length and price.
  const bookedService: Service | null = currentService && bookedOffering ? {
    ...currentService,
    provider: bookedOffering.provider ? { id: bookedOffering.provider.id || bookedOffering.provider.name, name: bookedOffering.provider.name, avatar: bookedOffering.provider.avatar } : currentService.provider,
    location: bookedOffering.location || currentService.location,
    duration: bookedOffering.duration || currentService.duration,
    price: bookedOffering.price ?? currentService.price,
  } : currentService;

  const availableDaysNumbers = availableDays?.map((day: string) => {
    const dayMap: { [key: string]: number } = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6,
    };
    return dayMap[day];
  }).filter((d: number | undefined) => d !== undefined) || [];

  // Choosing a service opens its times with any provider, or with the provider of the chooser's filter.
  const handleServiceSelect = (service: Service, providerId: string) => {
    haptic("select");
    const own = providerId !== "all" ? service.offerings?.find((item) => item.provider?.id === providerId) : undefined;
    const anchor = own?.id || service.slug;
    navigate(`/schedule/org/${orgSlug}/${anchor}?type=${encodeURIComponent(anchor)}&with=${encodeURIComponent(own ? providerId : "any")}${langParam ? `&lang=${encodeURIComponent(langParam)}` : ""}`);
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
    haptic("select");
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!bookedService || !selectedDate || !selectedSlot) return;

    try {
      const response = await submitBooking({
        durationId: offeringId,
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
      setBookingResponse({ ...response, userEmail: formData.userEmail, userPhone: formData.userPhone });
      setCurrentPhase("success");
      haptic("success");
    } catch (error) {
      console.error("Booking error:", error);
    }
  };

  const brandName = (bookingBrand.config ? siteName(bookingBrand.config.identity.applicationName, bookingBrand.config.identity.applicationNameAm, language) : "") || userInfo?.organizationName || "";
  const logo = bookingBrand.config ? brandLogo(bookingBrand.config.compiledDesign) : "";
  const pageStyle = { ...skin.style, "--bk-top": HEADER_HEIGHT } as CSSProperties;
  const showSteps = !friendlyError && !error;
  const header = (
    <BookingHeaderBar
      height={HEADER_HEIGHT}
      style={skin.style}
      skin={skin.attrs}
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
      steps={showSteps ? <BookingSteps step={STEP_OF[serviceSlug && currentPhase === "service" ? "datetime" : currentPhase]} skin={skin.skin} /> : undefined}
      actions={<><LanguageToggle /><ThemeSwitch /></>}
    />
  );
  const pageAttrs = {
    ...skin.attrs,
    "data-booking-branded": bookingBrand.config ? "true" : "false",
    "data-pe-recipe": bookingBrand.config?.recipeKey,
    "data-pe-mode": bookingMode,
  };

  const unavailable = Boolean(error || friendlyError) || forced === "error" || forced === "unavailable";
  // Loading: a skeleton in the shape of the page that comes.
  if ((isLoading && !data && !unavailable) || forced === "loading") {
    return (
      <>
        {header}
        <div className="booking-experience min-h-screen px-4 py-6 text-theme-primary sm:px-6" style={{ ...pageStyle, backgroundColor: "var(--bg-primary)" }}
          {...pageAttrs} data-qa="booking-loading">
          <BookingBackdrop active={skin} />
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

  // The summary: the service, its length, and the provider and place once they are known.
  const facts: SummaryFact[] = [];
  if (currentService) {
    const places = offerings.length > 1 ? offerings.map((item) => item.location).filter((item): item is ServiceLocation => Boolean(item)) : [];
    const distinct = places.filter((item, index) => places.findIndex((other) => other.name === item.name) === index);
    // The place: the chosen time's, else the filtered provider's, else the service's one place, else "N places".
    const filtered = providerFilter !== "all" ? offerings.find((item) => item.provider?.id === providerFilter)?.location : undefined;
    const location = chosenSlot && bookedOffering?.location ? bookedOffering.location : filtered || (distinct.length > 1 ? null : currentService.location);
    const who = chosenSlot && bookedService?.provider?.name ? bookedService.provider.name
      : offerings.length < 2 ? currentService.provider?.name : providerFilter !== "all" ? offeredBy.find((item) => item.id === providerFilter)?.name : "";
    facts.push({ icon: Clock3, text: t("bookingPicker.minutes").replace("{0}", String(bookedService?.duration || currentService.duration)), qa: "booking-summary-duration" });
    if (who) facts.push({ icon: User, text: t("bookingPicker.with").replace("{0}", shortProviderName(who)), qa: "booking-summary-provider" });
    if (location) {
      facts.push(location.is_online
        ? { icon: Video, text: onlineLabel(location.platform), qa: "booking-summary-online" }
        : { icon: MapPin, text: location.location_name || location.name, detail: location.address, qa: "booking-summary-place" });
    } else if (distinct.length > 1 && !filtered) {
      facts.push({ icon: MapPin, text: t("bookingPicker.places").replace("{0}", String(distinct.length)),
        detail: distinct.map((item) => item.location_name || item.name).join(" · "), qa: "booking-summary-place" });
    }
  }
  const photo = currentService && bookingBrand.resolved ? servicePhotoSource(skin, currentService.image, Number(data?.message?.photo_index ?? -1)) : null;
  // While the design loads, an empty frame keeps the photo's place (no shift, no wrong file).
  const summaryMedia = (wide: boolean) => photo ? <ServicePhoto asset={photo} sizes={wide ? "88px" : "56px"} vt />
    : currentService?.image && !bookingBrand.resolved ? <span className="bk-photo" aria-hidden="true" /> : undefined;

  return (
    <>
      <MetaTags
        title={`${userInfo?.name || "Book Appointment"} | Scheduler`}
        description={`Schedule an appointment with ${userInfo?.name || "us"}`}
      />
      {header}
      <div
        className={`booking-experience text-theme-primary ${currentPhase === "datetime" ? "" : "pb-10"}`}
        {...pageAttrs}
        // The header sits above this block, so the block fills the rest of the window and the time picker fits it.
        style={{ ...pageStyle, backgroundColor: "var(--bg-primary)", minHeight: `calc(100dvh - ${HEADER_HEIGHT})` }}
      >
        <BookingBackdrop active={skin} />
        <div className="booking-stage relative z-10">
          {/* A friend's share link: "You were invited by …" (customer referrals). */}
          {currentPhase !== "success" && <CustomerInviteBanner slug={orgSlug} className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-3xl" />}

          {currentPhase === "service" && organization && !serviceSlug && (
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <ServiceSelector organization={organization} services={organization.services} onServiceSelect={handleServiceSelect} skin={skin} logo={logo} photosReady={bookingBrand.resolved} />
            </div>
          )}

          {/* A service link resolves its offering first. */}
          {currentPhase === "service" && serviceSlug && (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><TimePickerSkeleton /></div>
          )}

          {currentPhase === "datetime" && currentService && (
            <div className="px-4 py-4 sm:px-6">
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
                onSlotClear={() => setChosenSlot(null)}
                timeFormat={timeFormat}
                onTimeFormatChange={setTimeFormat}
                timezone={timeZone}
                loading={slotsLoading}
                serviceName={currentService.name}
                duration={bookedService?.duration || currentService.duration}
                location={bookedService?.location || currentService.location}
                providers={offerings.length > 1 ? offeredBy : undefined}
                providerId={offerings.length > 1 ? providerFilter : undefined}
                onProviderChange={offerings.length > 1 ? changeProvider : undefined}
                summary={(wide: boolean) => <BookingSummaryCard eyebrow={organization?.name} title={currentService.name} titleQa="booking-picker-service" facts={facts} compact={!wide} media={summaryMedia(wide)} />}
                extras={Boolean(data?.message?.allow_quantity) && (
                  <QuantityPicker className="bk-card" value={quantity} max={Math.max(1, Number(data?.message?.max_quantity) || 1)}
                    onChange={(next) => { setQuantity(next); setChosenSlot(null); }} />
                )}
                action={{ label: t("bookingLayout.continue"), onClick: () => chosenSlot && setCurrentPhase("form") }}
                footer={<PoweredBy variant="inline" className="!py-2 max-md:!pb-2" />}
              />
            </div>
          )}

          {currentPhase === "form" && bookedService && selectedSlot && (
            <div className="px-4 py-6 sm:py-8">
              {quote?.required && <PaymentSummary quote={quote} method={paymentMethod} onMethod={setPaymentMethod} />}
              {!paymentBlocked && (
                <BookingForm
                  service={bookedService}
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
                  media={photo ? <ServicePhoto asset={photo} sizes="88px" /> : undefined}
                />
              )}
            </div>
          )}

          <AnimatePresence>
            {currentPhase === "success" && bookingResponse && bookedService && selectedSlot && (
              <ConfirmationModal
                open={true}
                onClose={() => {
                  if (refetchSlots) refetchSlots();
                  setChosenSlot(null);
                  setCurrentPhase("datetime");
                }}
                bookingResponse={bookingResponse}
                service={bookedService}
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
                userPhone={bookingResponse.userPhone}
                brandStyle={skin.style}
                skinAttrs={skin.attrs}
                moment={bookingBrand.config ? <TemplateMoment rendererKey={bookingBrand.config.compiledDesign.layout.rendererKey} rendererVersion={bookingBrand.config.compiledDesign.layout.rendererVersion} /> : null}
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
