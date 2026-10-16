/** A top-down schematic; labels are real text alongside it. */
export function InspectionDiagram() {
  return (
    <svg
      className="mizan3-diagram"
      viewBox="0 0 130 280"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M32 15Q65 0 98 15Q115 35 117 70v140q-3 38-17 53-35 20-70 0-14-25-17-53V70q2-35 19-55Z" />
      <path d="M37 23q28-13 56 0l13 53q-41-22-82 0Zm-13 63q41-24 82 0l-4 88H28Zm4 99q37 21 74 0l6 53q-43 25-86 0Z" />
      <path d="m19 82 7 98-6 47M111 82l-7 98 6 47M30 25l-6 31m76-31 6 31M37 17v16m56-16v16M30 251v9m70-9v9M12 100H4v22h9m104-22h9v22h-9" />
      <path
        d="M32 15Q65 5 98 15M18 218q47 17 94 0M28 176q37 10 74 0"
        opacity=".6"
      />
    </svg>
  );
}
