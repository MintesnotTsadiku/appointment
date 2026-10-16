/** A static, template-owned acknowledgement; the scheduler supplies the localized confirmation. */
export default function Moment() {
  return (
    <svg
      data-qa="booking-moment"
      data-moment="buna"
      aria-hidden="true"
      viewBox="0 0 200 90"
      width="200"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--accent-primary)", margin: "0 auto" }}
    >
      <path d="M65 25h60v25a30 25 0 0 1-60 0zM125 30h10a12 12 0 0 1 0 24h-10M50 80h95M80 43l10 10 20-20" />
    </svg>
  );
}
