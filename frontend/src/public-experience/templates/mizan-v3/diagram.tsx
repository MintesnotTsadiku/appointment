/** A schematic inspection drawing, deliberately without diagnostic claims or status colours. */
export function InspectionDiagram() {
  return (
    <svg
      className="mizan3-diagram"
      viewBox="0 0 800 220"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M100 150v-42l40-15 85-57h260l90 60 100 15 25 40H100Z"
        strokeWidth="2"
      />
      <path d="m180 92 65-42h98v42H180Zm178 0V50h110l62 42H358ZM130 111h480M340 105v43M545 108v40" />
      <circle cx="230" cy="151" r="36" fill="var(--paper)" strokeWidth="2" />
      <circle cx="230" cy="151" r="19" />
      <circle cx="570" cy="151" r="36" fill="var(--paper)" strokeWidth="2" />
      <circle cx="570" cy="151" r="19" />
      <path
        d="M230 10v200M570 10v200M50 150h700M115 30h560"
        strokeDasharray="3 7"
        opacity=".5"
      />
      <path d="M115 23v14m560-14v14M743 30v120m-7-120h14m-14 120h14" />
    </svg>
  );
}
