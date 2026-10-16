import { useTranslation } from "@/lib/i18n";
import "./booking.css";

export default function Moment() {
  const { t } = useTranslation();
  return (
    <div
      className="mizan3k-moment"
      data-qa="booking-moment"
      data-moment="mizan"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 180 100"
        width="180"
        height="100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M52 9h60l17 18v63H52Z M112 9v20h17M65 43h21m-21 12h15m-15 12h31M39 90h103M39 85v10m103-10v10" />
        <path d="m90 50 9 9 20-23" strokeWidth="4" />
      </svg>
      <p>{t("publicSite.mizan.bookingRecorded")}</p>
    </div>
  );
}
