/** A static, template-owned acknowledgement; the scheduler supplies the localized confirmation. */
export default function Moment() {
  return (
    <svg
      data-qa="booking-moment"
      data-moment="mizan"
      aria-hidden="true"
      viewBox="0 0 200 90"
      width="200"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--accent-primary)", margin: "0 auto" }}
    >
      <path d="M30 65h140M40 65V25h120v40M55 65v-8m15 8v-8m15 8v-8m15 8v-8m15 8v-8m15 8v-8m15 8v-8M84 38l12 12 24-24" />
    </svg>
  );
}
