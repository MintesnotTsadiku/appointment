/** A static, template-owned acknowledgement; the scheduler supplies the localized confirmation. */
export default function Moment() {
  return (
    <svg
      data-qa="booking-moment"
      data-moment="hana"
      aria-hidden="true"
      viewBox="0 0 200 90"
      width="200"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--accent-primary)", margin: "0 auto" }}
    >
      <path d="M25 65h45q15 0 15-15V30q0-15 15-15h40" stroke-dasharray="4 5" />
      <circle cx="145" cy="20" r="10" />
      <path d="M120 61l12 12 26-29" />
    </svg>
  );
}
