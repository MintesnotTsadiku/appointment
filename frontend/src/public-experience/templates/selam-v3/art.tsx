/*
 * Selam v3 drawings. They use `currentColor`, so palettes and dark mode recolour them.
 * Decoration only: every drawing is aria-hidden. The motion arc is the package's line: a thin lime
 * path that rises like a body from the floor to standing.
 */
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

type Point = [number, number];

/** A smooth path through the points (Catmull-Rom as cubic Béziers). */
function through(points: Point[]): string {
  const at = (index: number) => points[Math.max(0, Math.min(points.length - 1, index))];
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [p0, p1, p2, p3] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** The five beats of the hero movement, from kneeling (low) to standing (high), in a 1200×400 box. */
export const ARC_BEATS: Point[] = [[70, 318], [345, 196], [600, 236], [858, 118], [1130, 66]];
const ARC_PATH = through(ARC_BEATS);

/** The motion arc over the hero frames; the path draws with the scroll (`pathLength=1`), the beads light in turn. */
export function MotionArc({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
    <path className="s3-arc-ghost" d={ARC_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="2 7" />
    <path className="s3-arc-line" pathLength={1} d={ARC_PATH} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

/** A short rising arc used as a section mark and around portraits. */
export function SmallArc({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 60" aria-hidden="true">
    <path pathLength={1} d="M4 54C24 54 30 12 60 12s38 30 56 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="116" cy="30" r="4" fill="currentColor" />
  </svg>;
}

/** The arc that links the beats of a session; drawn on scroll. */
export function BeatPath({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
    <path data-scroll="" pathLength={1} d="M0 96C150 96 190 24 300 24s170 72 300 72 190-72 300-72 170 60 300 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

/** Breath: three soft waves. */
export function Breath({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M6 16c6-5 12 5 18 0s12-5 18 0" />
    <path d="M6 25c6-5 12 5 18 0s12-5 18 0" opacity=".75" />
    <path d="M6 34c6-5 12 5 18 0s12-5 18 0" opacity=".5" />
  </svg>;
}

/** A rolled mat. */
export function Mat({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <rect x="6" y="28" width="30" height="10" rx="5" />
    <circle cx="36" cy="33" r="7" />
    <circle cx="36" cy="33" r="3" />
    <path d="M12 22c4-6 10-9 18-9" opacity=".6" />
  </svg>;
}

/** A tall window with the hills. */
export function Hills({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <rect x="10" y="6" width="28" height="36" rx="14" />
    <path d="M10 32c5-6 9-8 13-4s8-6 15-2" />
    <circle cx="30" cy="17" r="3" />
  </svg>;
}

/** A metronome: the tempo of the hour. */
export function Metronome({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M17 42h14l-4-34h-6z" />
    <path d="M24 34 33 13" />
    <circle cx="31" cy="17" r="2.4" fill="currentColor" stroke="none" />
    <path d="M14 42h20" />
  </svg>;
}

export const BENEFIT_ART = [Breath, Metronome, Hills, Mat];

/** The tempo dial of the "still unsure" card: a ring of ticks with a rising lime arc. */
export function TempoDial({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
    {Array.from({ length: 24 }, (_, index) => {
      const angle = (index / 24) * Math.PI * 2;
      const inner = index % 6 === 0 ? 40 : 46;
      return <line key={index} x1={60 + inner * Math.cos(angle)} y1={60 + inner * Math.sin(angle)} x2={60 + 52 * Math.cos(angle)} y2={60 + 52 * Math.sin(angle)}
        stroke="currentColor" strokeWidth={index % 6 === 0 ? 2.4 : 1.4} strokeLinecap="round" opacity={index % 6 === 0 ? 0.9 : 0.45} />;
    })}
    <path className="s3-dial-arc" d="M24 78A40 40 0 0 1 96 42" fill="none" strokeWidth="5" strokeLinecap="round" />
    <circle className="s3-dial-dot" cx="96" cy="42" r="6" />
  </svg>;
}

/** A large typographic quotation mark. */
export function Quote({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 48" aria-hidden="true"><path fill="currentColor" d="M0 48V28C0 12 8 3 24 0l2 6C17 9 13 15 13 22h11v26Zm38 0V28c0-16 8-25 24-28l2 6c-9 3-13 9-13 16h11v26Z" /></svg>;
}
