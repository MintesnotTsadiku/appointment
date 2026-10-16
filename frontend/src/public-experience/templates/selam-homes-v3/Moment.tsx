/** A static, template-owned acknowledgement; the scheduler supplies the localized confirmation. */
export default function Moment() {
  return (
    <svg
      data-qa="booking-moment"
      data-moment="selam-homes"
      aria-hidden="true"
      viewBox="0 0 200 90"
      width="200"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--accent-primary)", margin: "0 auto" }}
    >
      <path d="M48 40l52-32 52 32M61 33v45h78V33M84 47l12 12 23-25" />
    </svg>
  );
}
