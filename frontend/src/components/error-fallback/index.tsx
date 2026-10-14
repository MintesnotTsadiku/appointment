/**
 * A route that failed to render: the shared illustrated state with the reason, a reload and a way home.
 */
import { useRouteError } from "react-router-dom";
import { RotateCw } from "lucide-react";
import { BookingState, BookingStatePage } from "@/components/booking-states";
import { useTranslation } from "@/lib/i18n";

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    if ("message" in error && typeof error.message === "string") return error.message;
    const nested = (error as { error?: unknown }).error;
    if (typeof nested === "string") return nested;
    if (nested instanceof Error) return nested.message;
  }
  return "";
}

const ErrorFallback = () => {
  const error = useRouteError();
  const { t } = useTranslation();
  console.error(error);
  return (
    <BookingStatePage qa="route-error">
      <BookingState kind="error" headingLevel={1} title={t("bookingStates.pageErrorTitle")} description={t("bookingStates.errorBody")}
        detail={errorText(error) || undefined}
        actions={[
          { label: t("bookingStates.reload"), onClick: () => window.location.reload(), icon: RotateCw, qa: "booking-state-retry" },
          { label: t("bookingStates.goHome"), href: "/", qa: "booking-state-home" },
        ]} />
    </BookingStatePage>
  );
};

export default ErrorFallback;
