/**
 * The booking skin on the shared booking flow: the skin of the published template (or the default),
 * its tokens, the faint page background, the step indicator and the service photo frame.
 * The flow keeps one interaction model; a skin changes the look only. See docs/growth/BOOKING_LAYOUT.md.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { BOOKING_STEPS, DEFAULT_BOOKING_SKIN, bookingSkin, loadBookingSkinStyle, type BookingSkin, type BookingStep } from "@/public-experience/templates/booking-skin";
import { widthSet, type PictureAsset } from "@/public-experience/templates/kit/core/picture";
import type { CompiledDesign, PublicUIConfig } from "@/public-experience/types";
import "./skin.css";

export type { BookingStep } from "@/public-experience/templates/booking-skin";

export interface ActiveSkin {
  skin: BookingSkin;
  design: CompiledDesign | null;
  mode: "light" | "dark";
  /** Attributes for the root of a booking page. */
  attrs: { "data-bk-skin": string; "data-bk-frame": string };
  /** Brand variables plus the skin tokens. */
  style: CSSProperties | undefined;
}

/** The default skin without a published design (older pages that have no website). */
export const PLAIN_SKIN: ActiveSkin = {
  skin: DEFAULT_BOOKING_SKIN, design: null, mode: "light", attrs: { "data-bk-skin": "default", "data-bk-frame": "rounded" }, style: undefined,
};

/** The skin for a booking page: from the published design, else the default skin with the brand tokens. */
export function useBookingSkin(config: PublicUIConfig | null | undefined, brandStyle: CSSProperties | undefined, mode: "light" | "dark"): ActiveSkin {
  return useMemo(() => {
    const design = config?.compiledDesign ?? null;
    const skin = bookingSkin(design);
    // The template's booking stylesheet: its own small file, requested as soon as the design is known.
    void loadBookingSkinStyle(skin);
    const tokens = skin.tokens && brandStyle ? skin.tokens(brandStyle as Record<string, unknown>, mode) : {};
    return {
      skin,
      design,
      mode,
      attrs: { "data-bk-skin": skin.name, "data-bk-frame": skin.frame },
      style: brandStyle ? ({ ...brandStyle, ...tokens } as CSSProperties) : undefined,
    };
  }, [config, brandStyle, mode]);
}

const WEBP = /\.webp$/i;

/** The smallest packaged file of an asset (a `-w<width>` file), for a blurred background. */
function smallest(asset: PictureAsset, night: boolean): { webp: string; avif?: string } | null {
  const base = night && asset.darkSrc ? asset.darkSrc : asset.src;
  if (!base) return null;
  const width = asset.widths?.length ? Math.min(...asset.widths) : 0;
  const webp = width && WEBP.test(base) ? base.replace(WEBP, `-w${width}.webp`) : base;
  const avif = (asset.formats || []).includes("avif") && WEBP.test(webp) ? webp.replace(WEBP, ".avif") : undefined;
  return { webp, avif };
}

/**
 * The skin's faint page background: a blurred echo of a landing photo, the night photo in dark mode.
 * It uses the smallest file and covers the whole viewport, so it is never the page's largest paint.
 */
export function BookingBackdrop({ active }: { active: ActiveSkin }) {
  const role = active.skin.backdropRole;
  const asset = role && active.design ? (active.design.assets[role] as PictureAsset | undefined) : undefined;
  const file = asset?.src ? smallest(asset, active.mode === "dark") : null;
  if (!file) return null;
  return (
    <div className="bk-backdrop" aria-hidden="true" data-qa="booking-backdrop">
      <picture>
        {file.avif && <source type="image/avif" srcSet={file.avif} />}
        <img src={file.webp} alt="" decoding="async" {...{ fetchpriority: "low" }} />
      </picture>
    </div>
  );
}

const STEP_KEYS: Record<BookingStep, string> = {
  service: "bookingSteps.service",
  time: "bookingSteps.time",
  details: "bookingSteps.details",
  done: "bookingSteps.done",
};

/** A done step the customer can go back to: an address (a real link) and/or the page's own step change. */
export interface StepLink {
  href?: string;
  onSelect?: () => void;
}

/** A plain click stays in the page (the step change keeps the chosen time); a modified click opens the address. */
function StepAnchor({ link, label, className, qa, target, children }: {
  link: StepLink; label: string; className: string; qa: string; target: BookingStep; children: ReactNode;
}) {
  const props = { className, "aria-label": label, "data-qa": qa, "data-target": target };
  if (link.href) {
    return (
      <a {...props} href={link.href} onClick={(event) => {
        if (!link.onSelect || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        link.onSelect();
      }}>{children}</a>
    );
  }
  return <button type="button" {...props} onClick={link.onSelect}>{children}</button>;
}

/**
 * "Service → Time → Details → Done". The current step is announced; the skin may draw each mark.
 * Done steps with a `links` entry are links back to that step (they replace the header's Back button).
 * Below 900 px the steps are a thin progress line, so the step just before the current one is also a
 * compact link at the start of the header (`bk-step-back`).
 */
export function BookingSteps({ step, skin, links }: { step: BookingStep; skin: BookingSkin; links?: Partial<Record<BookingStep, StepLink>> }) {
  const { t } = useTranslation();
  const current = BOOKING_STEPS.indexOf(step);
  const Mark = skin.StepMark;
  const previous = BOOKING_STEPS.slice(0, Math.max(0, current)).reverse().find((key) => links?.[key]);
  const backLabel = (key: BookingStep) => t("schedulerPage.backTo").replace("{0}", t(STEP_KEYS[key]));
  return (
    <nav className="bk-steps" aria-label={t("bookingSteps.label")} data-qa="booking-steps" data-step={step} data-back={previous ? "true" : "false"}>
      {previous && links?.[previous] && (
        <StepAnchor link={links[previous]!} label={backLabel(previous)} className="bk-step-back" qa="booking-step-back" target={previous}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t(STEP_KEYS[previous])}</span>
        </StepAnchor>
      )}
      <ol>
        {BOOKING_STEPS.map((key, index) => {
          const state = index < current ? "done" : index === current ? "current" : "next";
          const mark = Mark ? <Mark index={index + 1} state={state} /> : (
            <span className="bk-step-mark" aria-hidden="true">{state === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}</span>
          );
          const link = state === "done" ? links?.[key] : undefined;
          return (
            <li key={key} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              {link ? (
                <StepAnchor link={link} label={backLabel(key)} className="bk-step-link" qa="booking-step-link" target={key}>
                  {mark}
                  <span className="bk-step-label">{t(STEP_KEYS[key])}</span>
                </StepAnchor>
              ) : <>{mark}<span className="bk-step-label">{t(STEP_KEYS[key])}</span></>}
            </li>
          );
        })}
      </ol>
      <span className="sr-only" aria-live="polite">{t("bookingSteps.position").replace("{0}", String(current + 1)).replace("{1}", String(BOOKING_STEPS.length)).replace("{2}", t(STEP_KEYS[step]))}</span>
    </nav>
  );
}

/** A packaged template photo keeps its widths and AVIF files; an owner photo is a plain image. */
function photoAsset(design: CompiledDesign | null, src: string): PictureAsset {
  if (!design) return { src };
  const found = Object.values(design.assets).find((asset) => asset?.src === src) as PictureAsset | undefined;
  return found || { src };
}

/**
 * The service's photo: the website's photo of the service, else the skin's role photo for the service's
 * place on the website (the same one the landing page shows), else nothing.
 */
export function servicePhotoSource(active: ActiveSkin, own: string | undefined, index: number): PictureAsset | null {
  if (own) return photoAsset(active.design, own);
  const roles = active.skin.servicePhotoRoles;
  if (!roles.length || !active.design || index < 0) return null;
  const asset = active.design.assets[roles[index % roles.length]] as PictureAsset | undefined;
  return asset?.src ? asset : null;
}

/**
 * The photo of the place where a session meets (`formatPhotoRoles`), for a scheduler that knows the
 * session's place but not its place on the website (the independent scheduler); else nothing.
 */
export function formatPhotoSource(active: ActiveSkin, format: "in_person" | "online" | undefined): PictureAsset | null {
  const role = format ? active.skin.formatPhotoRoles?.[format] : undefined;
  const asset = role && active.design ? (active.design.assets[role] as PictureAsset | undefined) : undefined;
  return asset?.src ? asset : null;
}

/**
 * A service photo in the skin's frame. `sizes` must match the frame width so the smallest file loads.
 * Always lazy: React sets `src` on the `<img>` before the element joins its `<picture>`, and an eager
 * detached image starts to download the large WebP file next to the AVIF file the browser then uses.
 */
export function ServicePhoto({ asset, sizes, className = "", vt = false }: {
  asset: PictureAsset; sizes: string; className?: string; vt?: boolean;
}) {
  const srcSet = widthSet(asset.src, asset.width, asset.widths);
  const avif = (asset.formats || []).includes("avif") && WEBP.test(asset.src);
  const set = srcSet !== asset.src ? srcSet : undefined;
  return (
    <span className={`bk-photo ${className}`} aria-hidden="true" data-vt-service={vt ? "" : undefined}>
      <picture>
        {avif && <source type="image/avif" srcSet={(set || asset.src).replace(/\.webp(?=\s|$|,)/gi, ".avif")} sizes={set ? sizes : undefined} />}
        {/* `loading` comes first: React sets attributes in this order, and `src` starts the download. */}
        <img loading="lazy" decoding="async" sizes={set ? sizes : undefined} srcSet={set} src={asset.src} alt="" width={asset.width} height={asset.height} />
      </picture>
    </span>
  );
}
