import type { ReactNode } from "react";

/*
 * Ergata's drawn art: soft organic shapes and quiet line drawings in the template palette.
 * Everything here is decoration next to visible text, so every drawing is aria-hidden.
 * Strokes use currentColor; fills use the palette custom properties, so light, dark and
 * the alternative palettes all recolour the art without new files.
 */

const BLOBS = [
  "M421 92c63 47 92 136 72 214s-86 146-170 164-187-12-247-74S-6 233 22 156 132 22 214 8s144 37 207 84Z",
  "M402 58c70 40 112 122 98 204s-82 166-166 196-196 6-255-61S9 255 31 174 125 26 210 12s122 6 192 46Z",
  "M448 162c32 79 8 178-58 235s-174 72-252 36S1 302 4 214 70 46 156 18s260 65 292 144Z",
];

/** A soft organic shape behind photos, tiles and cards. */
export function Blob({ variant = 0, className = "eg2-blob" }: { variant?: number; className?: string }) {
  return <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false" preserveAspectRatio="none">
    <path d={BLOBS[variant % BLOBS.length]} />
  </svg>;
}

function Drawing({ children, className, viewBox = "0 0 96 96" }: { children: ReactNode; className?: string; viewBox?: string }) {
  return <svg className={className} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}

/* "What we can work on" tiles: one small scene per icon name, drawn on a 96px grid. */
const NEEDS: Record<string, ReactNode> = {
  // Anxiety: a stone dropped in still water, the rings settling.
  wave: <><ellipse cx="48" cy="60" rx="34" ry="10" /><ellipse cx="48" cy="60" rx="21" ry="6" opacity=".7" /><ellipse cx="48" cy="60" rx="9" ry="2.6" className="eg2-fill-clay" /><path d="M48 22v18m-6-6 6 6 6-6" opacity=".6" /><path d="M10 78c8-3 14-3 22 0s14 3 22 0 14-3 22 0 8 3 10 2" opacity=".5" /></>,
  // Low mood: a heavy cloud with the sun still behind it.
  cloud: <><circle cx="62" cy="34" r="12" className="eg2-fill-sun" /><path d="M28 66h40a12 12 0 0 0 1-24 17 17 0 0 0-32-3A12 12 0 0 0 28 66Z" className="eg2-fill-card" /><path d="M36 76v6m10-6v8m10-8v6" opacity=".5" /></>,
  // Stress and burnout: a candle burnt low, a small flame left.
  flame: <><path d="M34 82h28M38 82V52h20v30" className="eg2-fill-card" /><path d="M48 52v-5" /><path d="M48 46c-5-4-5-10 0-16 5 6 5 12 0 16Z" className="eg2-fill-clay" /><path d="M58 60c4 1 5 4 4 8" opacity=".5" /><path d="M22 82h52" opacity=".5" /></>,
  // Grief and loss: a branch with one leaf falling.
  leaf: <><path d="M14 30c20 2 38 8 54 22" /><path d="M30 32c0-8 6-12 12-12-1 7-5 11-12 12Zm16 6c2-8 9-11 15-9-3 7-8 9-15 9Z" className="eg2-fill-sage" /><path d="M60 64c6-3 12-1 14 4-6 3-11 1-14-4Z" className="eg2-fill-clay" /><path d="M62 70c-3 4-3 9 0 12" strokeDasharray="2 4" opacity=".6" /></>,
  // Relationships and couples: two cups, close together.
  link: <><path d="M20 46h24v14a12 12 0 0 1-24 0V46Z" className="eg2-fill-card" /><path d="M52 46h24v14a12 12 0 0 1-24 0V46Z" className="eg2-fill-sage" /><path d="M28 38c0-4 4-4 4-8m20 8c0-4 4-4 4-8" opacity=".6" /><path d="M14 74h68" opacity=".5" /></>,
  // Trauma: an arch that shelters a small flame.
  shield: <><path d="M24 80V46a24 24 0 0 1 48 0v34" className="eg2-fill-card" /><path d="M16 80h64" /><path d="M48 70c-5-3-6-9-1-15 6 5 6 11 1 15Z" className="eg2-fill-clay" /></>,
  // Life changes: a path that bends towards an open door.
  path: <><path d="M60 16h16v26H60z" className="eg2-fill-card" /><path d="M64 42 76 38V16" opacity=".6" /><path d="M24 84c4-12 22-12 24-22s-6-12 4-18 12-2 14-2" strokeDasharray="1 6" strokeWidth="3" /><circle cx="24" cy="84" r="3" className="eg2-fill-clay" /></>,
  // Kindness: a small open hand holding a heart.
  heart: <><path d="M18 62c10 0 18 8 30 8s22-6 30-14" /><path d="M18 62v16h18c8 0 16-2 22-6" opacity=".6" /><path d="M48 50s-12-7-12-16a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 9-12 16-12 16Z" className="eg2-fill-clay" /></>,
};

export function NeedArt({ name }: { name: string }) {
  return <Drawing className="eg2-need-art">{NEEDS[name] || NEEDS.leaf}</Drawing>;
}

/* Approaches: one stepping stone per way of working, drawn in turn. */
const STONES: ReactNode[] = [
  // Loops loosening: two circles pulling apart.
  <><path d="M22 48a14 14 0 1 0 28 0 14 14 0 1 0-28 0" /><path d="M46 48a14 14 0 1 0 28 0" strokeDasharray="3 5" /><path d="m70 40 4 8 8-3" /></>,
  // Making room: open hands.
  <><path d="M16 50c8 10 20 14 32 14s24-4 32-14" /><path d="M24 54V40m8 18V36m32 22V36m8 18V40" opacity=".6" /><circle cx="48" cy="38" r="7" className="eg2-fill-clay" /></>,
  // Being listened to: two chairs facing.
  <><path d="M18 70V46a8 8 0 0 1 16 0v10h8v14M78 70V46a8 8 0 0 0-16 0v10h-8v14" /><path d="M12 70h72" opacity=".5" /></>,
  // Paced processing: a gentle back-and-forth wave.
  <><path d="M14 48c6-12 12-12 17 0s11 12 17 0 11-12 17 0 11 12 17 0" /><circle cx="48" cy="48" r="4" className="eg2-fill-clay" /></>,
  // Building from what works: a sprout.
  <><path d="M48 76V44" /><path d="M48 52c-12 0-18-8-18-16 12 0 18 6 18 16Zm0-6c0-12 8-18 18-18 0 12-8 18-18 18Z" className="eg2-fill-sage" /><path d="M30 76h36" opacity=".5" /></>,
  // Steady ground: a stone stack.
  <><ellipse cx="48" cy="70" rx="22" ry="7" /><ellipse cx="48" cy="54" rx="15" ry="6" className="eg2-fill-sage" /><ellipse cx="48" cy="41" rx="9" ry="4.5" className="eg2-fill-clay" /></>,
];

export function StoneArt({ index }: { index: number }) {
  return <Drawing className="eg2-stone-art">{STONES[index % STONES.length]}</Drawing>;
}

/* First session: one small scene per step, then a sprout at the end. */
const STEPS: ReactNode[] = [
  // Choose a time: a calendar page with one day circled.
  <><rect x="22" y="26" width="52" height="46" rx="8" className="eg2-fill-card" /><path d="M22 40h52M36 20v12m24-12v12" /><circle cx="58" cy="56" r="7" className="eg2-fill-clay" /><path d="M32 52h8m-8 10h8" opacity=".6" /></>,
  // Getting to know each other: two speech shapes.
  <><path d="M16 30a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H32l-10 8v-8a8 8 0 0 1-6-8Z" className="eg2-fill-card" /><path d="M80 48a8 8 0 0 0-8-8H52a8 8 0 0 0-8 8v10a8 8 0 0 0 8 8h14l10 7v-8a8 8 0 0 0 4-7Z" className="eg2-fill-sage" /></>,
  // Confidentiality: a key under an arch.
  <><path d="M24 76V44a24 24 0 0 1 48 0v32Z" className="eg2-fill-card" /><circle cx="48" cy="48" r="7" /><path d="M48 55v12m0-6h6" /></>,
  // A plan that fits: a sprout in a pot.
  <><path d="M34 60h28l-4 18H38Z" className="eg2-fill-clay" /><path d="M48 60V38" /><path d="M48 46c-10 0-15-7-15-14 10 0 15 5 15 14Zm0-4c0-10 7-15 15-15 0 10-7 15-15 15Z" className="eg2-fill-sage" /></>,
];

export function StepArt({ index }: { index: number }) {
  return <Drawing className="eg2-step-art">{STEPS[index % STEPS.length]}</Drawing>;
}

/** The winding walk that joins the first-session steps on wide screens. */
export function StepPath() {
  return <svg className="eg2-step-path" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M40 70C160 10 260 10 340 60s200 60 300 10 220-60 300-20 180 50 220 10" fill="none" />
  </svg>;
}

export type FormatKey = "in_person" | "online" | "phone" | "intro";

/* Session cards: a small scene at the top of each card shows how you meet. */
const FORMATS: Record<FormatKey, ReactNode> = {
  in_person: <><path d="M118 92V40a22 22 0 0 1 44 0v52" className="eg2-fill-sky" /><path d="M140 18v74M118 56h44" opacity=".55" /><path d="M42 92V70a10 10 0 0 1 20 0v8h14v14M78 92V74h20a8 8 0 0 1 8 8v10" className="eg2-fill-card" /><path d="M176 92V72m-8 6c0-8 8-10 8-16 0 6 8 8 8 16" className="eg2-fill-sage" /><path d="M24 92h176" /></>,
  online: <><rect x="66" y="26" width="92" height="58" rx="8" className="eg2-fill-card" /><path d="M52 92h120l-8-8H60Z" /><path d="M96 70V54a16 16 0 0 1 32 0v16" className="eg2-fill-sky" /><circle cx="112" cy="48" r="5" className="eg2-fill-clay" /><path d="M30 92V78h16v14m-8-14c0-6 6-8 6-12m4 26c6-6 14-6 14-14" opacity=".7" /><path d="M186 92c0-10-6-14-6-22 6 4 12 10 10 22" className="eg2-fill-sage" /></>,
  phone: <><rect x="94" y="22" width="36" height="66" rx="8" className="eg2-fill-card" /><path d="M106 30h12" /><path d="M146 44c6 6 6 18 0 24m10-32c10 10 10 30 0 40M78 44c-6 6-6 18 0 24m-10-32c-10 10-10 30 0 40" opacity=".6" /><circle cx="112" cy="76" r="3" className="eg2-fill-clay" /></>,
  intro: <><path d="M56 34a10 10 0 0 1 10-10h40a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10H82l-14 10V60h-2a10 10 0 0 1-10-10Z" className="eg2-fill-card" /><path d="M168 54a10 10 0 0 0-10-10h-30a10 10 0 0 0-10 10v14a10 10 0 0 0 10 10h16l12 9v-9a10 10 0 0 0 12-10Z" className="eg2-fill-sage" /><path d="M72 40h28m-28 10h16" opacity=".6" /></>,
};

export function FormatArt({ format }: { format: FormatKey }) {
  return <Drawing className="eg2-format-art" viewBox="0 0 224 100">{FORMATS[format]}</Drawing>;
}

/**
 * A stylised area card for an office: quiet streets, a park, a ring road and the pin.
 * It is a drawing, not a map of a real street plan; the address and directions link carry the facts.
 */
export function AreaMap() {
  return <svg className="eg2-area-map" viewBox="0 0 400 280" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="280" className="eg2-map-ground" />
    <path d="M250 -10c-30 60 10 110 70 140s90 90 70 160H420V-10Z" className="eg2-map-park" />
    <path d="M-10 196c70-40 150-30 220-6s140 10 200-30" className="eg2-map-ring" />
    <g className="eg2-map-road">
      <path d="M-10 92h420M-10 236h420M84 -10v300M206 -10v300M330 -10v300" />
      <path d="M-10 30 150 150l120 140M260 -10 150 150" />
    </g>
    <g className="eg2-map-lane"><path d="M-10 160h200M144 -10v120M270 92v100M20 280V150" /></g>
    <path d="M36 32h30v40H36zM104 108h52v26h-52zM226 106h38v60h-38zM112 176h70v40h-70zM288 18h28v52h-28z" className="eg2-map-block" />
    <circle cx="300" cy="150" r="16" className="eg2-map-tree" /><circle cx="342" cy="112" r="11" className="eg2-map-tree" /><circle cx="356" cy="200" r="14" className="eg2-map-tree" />
    <g transform="translate(206 150)" className="eg2-map-pin">
      <circle r="34" className="eg2-map-halo" />
      <path d="M0 6s-16-13-16-26a16 16 0 0 1 32 0C16-7 0 6 0 6Z" />
      <circle cy="-20" r="6" className="eg2-map-pin-dot" />
    </g>
  </svg>;
}

/** The online card: a laptop turned away, a cup and a plant on a quiet desk. */
export function OnlineArt() {
  return <Drawing className="eg2-online-art" viewBox="0 0 224 120">
    <path d="M40 104h150" />
    <path d="M70 102 96 40h64l-22 62Z" className="eg2-fill-card" />
    <path d="M60 102h82" strokeWidth="2.4" />
    <path d="M104 72c4-10 14-14 22-10-4 8-12 12-22 10Z" className="eg2-fill-sage" />
    <path d="M160 86h18v10a9 9 0 0 1-18 0Z" className="eg2-fill-clay" /><path d="M178 90h4a4 4 0 0 1 0 8h-4M164 80c0-4 4-4 4-8" opacity=".6" />
    <path d="M40 104V86h18v18m-9-18c0-10-10-14-10-24 8 4 12 12 10 24m0 0c2-10 10-16 18-16-2 10-8 14-18 16" className="eg2-fill-sage" />
  </Drawing>;
}

/** The safety card: an arched window with a low sun, and two cupped hands holding a small warm light. */
export function NoticeArt() {
  return <Drawing className="eg2-notice-art" viewBox="0 0 160 160">
    <path d="M30 146V66a50 50 0 0 1 100 0v80Z" className="eg2-fill-card" />
    <circle cx="80" cy="78" r="18" className="eg2-fill-sun" />
    <path d="M30 96h100M42 106h76" opacity=".5" />
    <path d="M80 50v-8M58 58l-5-6m49 6 5-6" opacity=".6" />
    <path d="M40 128c8-2 14-8 22-8h36c8 0 14 6 22 8" />
    <path d="M52 122c4 10 16 16 28 16s24-6 28-16" className="eg2-fill-sage" />
    <path d="M80 118c-5-3-6-9-1-14 6 5 6 11 1 14Z" className="eg2-fill-clay" />
    <path d="M20 146h120" />
  </Drawing>;
}

/** A thin sprig, for the corners of photos and the footer line. */
export function Sprig({ className = "eg2-sprig" }: { className?: string }) {
  return <Drawing className={className} viewBox="0 0 120 120">
    <path d="M18 108C40 80 64 50 102 14" />
    <path d="M40 82c-12-2-18-12-16-22 10 2 16 10 16 22Zm2-2c4-11 15-15 24-11-4 10-14 13-24 11Zm14-20c-11-4-14-14-10-23 9 4 12 13 10 23Zm2-2c6-10 17-12 25-6-6 9-16 10-25 6Zm16-20c-10-6-11-16-5-24 8 6 9 15 5 24Zm2 0c7-8 18-9 24-2-7 8-17 8-24 2Z" className="eg2-fill-sage" />
  </Drawing>;
}

/** A quiet line of hills and eucalyptus over the footer. */
export function Horizon() {
  return <svg className="eg2-horizon" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M0 78C180 52 330 46 480 62s260 34 420 18 300-50 540-30V120H0Z" className="eg2-horizon-far" />
    <path d="M0 98c200-22 380-24 560-12s340 20 520 6 260-10 360-4V120H0Z" className="eg2-horizon-near" />
  </svg>;
}

