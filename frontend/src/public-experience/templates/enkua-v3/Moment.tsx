import { useTranslation } from "@/lib/i18n";
import "./booking.css";

/** A quiet framed acknowledgement; booking details remain in the shared confirmation. */
export default function Moment() {
  const { t } = useTranslation();
  return (
    <div className="enkua3-moment" data-qa="booking-moment" data-moment="enkua">
      <svg aria-hidden="true" viewBox="0 0 200 100" width="200" height="100" fill="none">
        <circle cx="135" cy="36" r="28" fill="var(--pe-color-surface-muted, #fff52b)" />
        <path d="M50 30V10h30m40 0h30v20M50 70v20h30m40 0h30V70" stroke="currentColor" strokeWidth="4" />
        <path d="M78 48l16 16 30-32" stroke="currentColor" strokeWidth="5" />
      </svg>
      <p>{t("publicSite.enkua.inTheFrame")}</p>
    </div>
  );
}
