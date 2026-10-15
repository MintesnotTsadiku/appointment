import type { ComponentType } from "react";

import type { CompiledDesign } from "../types";
import { bloomBookingSkin } from "./bloom-v3/booking";

/**
 * Booking skins: how a certified template dresses the one shared booking flow (service chooser, time
 * picker, details, confirmation). The flow keeps one interaction model. A skin gives data and tokens
 * and, at most, a few small visual slots that belong to its own template package. A skin never imports
 * from another template. A template without a skin gets `DEFAULT_BOOKING_SKIN`, which uses the brand
 * tokens only. Contract: docs/design/TEMPLATE_V3_KIT.md, "Booking skins".
 */

export type BookingStep = "service" | "time" | "details" | "done";
export const BOOKING_STEPS: readonly BookingStep[] = ["service", "time", "details", "done"];

/** The shape of photo frames and avatars on the booking pages. */
export type BookingFrame = "rounded" | "mirror" | "arch" | "circle" | "square";

export interface StepMarkProps {
  /** 1-based position of the step. */
  index: number;
  state: "done" | "current" | "next";
}

export interface BookingSkin {
  /** `rendererKey@rendererVersion`, or "default". */
  key: string;
  /** The value of `data-bk-skin` on the booking pages. The template's booking CSS scopes every rule under it. */
  name: string;
  /** Shape of the service photos and provider avatars (`data-bk-frame`). */
  frame: BookingFrame;
  /** Image roles of the compiled design for service photos, used in turn when the business has no photo. */
  servicePhotoRoles: readonly string[];
  /** Image role for the faint page background. Its smallest file is used, and its night photo in dark mode. */
  backdropRole?: string;
  /** CSS custom properties for the booking tokens (`--bk-action-*`, `--bk-heading-*`), from the brand tokens. */
  tokens?: (brand: Readonly<Record<string, unknown>>, mode: "light" | "dark") => Record<`--${string}`, string>;
  /** Template-owned slot: the mark of one step in the step indicator. */
  StepMark?: ComponentType<StepMarkProps>;
}

/** The flow without a template skin: brand colours and type only, plain rounded frames, no photo roles. */
export const DEFAULT_BOOKING_SKIN: BookingSkin = {
  key: "default",
  name: "default",
  frame: "rounded",
  servicePhotoRoles: [],
};

const SKINS: Record<string, BookingSkin> = {
  [bloomBookingSkin.key]: bloomBookingSkin,
};

/** The skin of a published design. Templates without a skin (v1, v2, Ergata until phase 3) get the default. */
export function bookingSkin(design?: Pick<CompiledDesign, "layout"> | null): BookingSkin {
  const layout = design?.layout;
  if (!layout?.rendererKey) return DEFAULT_BOOKING_SKIN;
  return SKINS[`${layout.rendererKey}@${layout.rendererVersion || 1}`] || DEFAULT_BOOKING_SKIN;
}

export function registeredBookingSkins(): string[] {
  return Object.keys(SKINS);
}
