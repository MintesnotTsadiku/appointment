/** A static, template-owned acknowledgement; the scheduler supplies the localized confirmation. */
export default function Moment() {
  return (
    <svg
      data-qa="booking-moment"
      data-moment="meseret"
      aria-hidden="true"
      viewBox="0 0 200 90"
      width="200"
      height="90"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--accent-primary)", margin: "0 auto" }}
    >
      <path d="M45 12h110v66H45zM65 12v66M75 30h60M75 46h20m-20 16h20m15-10 9 9 19-22" />
    </svg>
  );
}
