/** A static, template-owned acknowledgement; the scheduler supplies the localized confirmation. */
export default function Moment() {
  return (
    <svg
      data-qa="booking-moment"
      data-moment="enkua"
      aria-hidden="true"
      viewBox="0 0 200 90"
      width="200"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--accent-primary)", margin: "0 auto" }}
    >
      <path d="M55 25V12h25m40 0h25v13M55 65v13h25m40 0h25V65" />
      <circle cx="100" cy="45" r="24" />
      <path d="M87 45l9 9 18-20" />
    </svg>
  );
}
