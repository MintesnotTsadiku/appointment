/** Same-origin access to the trusted public release projection. */
import { mergeConfig } from "./firstPaint";
import { getFallbackPublicUIConfig } from "./tokens";
import type { PublicUIConfig, PublishedSnapshot } from "./types";

function requestError(body: unknown, status: number): Error {
  if (body && typeof body === "object") {
    const response = body as Record<string, unknown>;
    if (typeof response._server_messages === "string") {
      try {
        const messages = JSON.parse(response._server_messages) as string[];
        const detail = messages.map((message) => JSON.parse(message) as { message?: string })
          .map((row) => row.message?.replace(/<[^>]*>/g, "") || "").filter(Boolean).join(" ");
        if (detail) return new Error(detail);
      } catch { /* Unrecognized error envelopes use the response status. */ }
    }
    if (typeof response.message === "string") return new Error(response.message);
  }
  return new Error("Unable to complete the request (" + status + ").");
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) throw requestError(body, response.status);
  if (body && typeof body === "object" && "message" in (body as Record<string, unknown>)) {
    return (body as Record<string, unknown>).message;
  }
  return body;
}

interface ShellBoot {
  path?: string;
  locale?: string | null;
  snapshot?: unknown;
  config?: unknown;
  configs?: Record<string, unknown>;
}

let shellBoot: ShellBoot | null | undefined;

/**
 * The published snapshot and UI config that the page shell inlined for this address
 * (appointment/public_experience/shell_boot.py), so the first paint does not wait for the API.
 */
function inlineBoot(): ShellBoot | null {
  if (shellBoot !== undefined) return shellBoot;
  shellBoot = null;
  try {
    const element = typeof document === "undefined" ? null : document.getElementById("pe-boot");
    const parsed = element?.textContent ? JSON.parse(element.textContent) as unknown : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) shellBoot = parsed as ShellBoot;
  } catch {
    /* A broken element only costs the API round trip. */
  }
  return shellBoot;
}

/** The inlined value when the page is still at the address the shell rendered, with the same language. */
function inlineFor(locale?: string): ShellBoot | null {
  const boot = inlineBoot();
  if (!boot || typeof window === "undefined" || boot.path !== window.location.pathname) return null;
  return (boot.locale || undefined) === (locale || undefined) ? boot : null;
}

function validSnapshot(raw: unknown): PublishedSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snapshot = raw as PublishedSnapshot;
  if (snapshot.contract !== "appointment-public-snapshot.v2") return null;
  if (!snapshot.compiledDesign || snapshot.compiledDesign.contract !== "appointment-compiled-design.v1") return null;
  if (!Array.isArray(snapshot.sections)) return null;
  return snapshot;
}

/** The inlined snapshot for this address and language; undefined when the shell inlined none. */
export function inlinePublishedSnapshot(locale?: string): PublishedSnapshot | undefined {
  const boot = inlineFor(locale);
  return boot && boot.snapshot !== undefined ? validSnapshot(boot.snapshot) || undefined : undefined;
}

/** The inlined UI config of this page in the snapshot's language; undefined when the shell inlined none. */
export function inlinePublicConfig(locale?: string): PublicUIConfig | undefined {
  const boot = inlineBoot();
  if (!boot?.config || typeof window === "undefined" || boot.path !== window.location.pathname) return undefined;
  const snapshot = validSnapshot(boot.snapshot);
  if ((snapshot?.locale || undefined) !== (locale || undefined)) return undefined;
  return mergeConfig(boot.config, getFallbackPublicUIConfig(locale));
}

/**
 * Start the inlined page's template package and fonts before the application renders. Both requests
 * then run while the route code loads; the page uses them when it renders.
 */
export function prefetchInlinedPage(load: (rendererKey: string, rendererVersion: number) => Promise<unknown>, fonts: (config: PublicUIConfig) => Promise<unknown>): PublishedSnapshot | null {
  const boot = inlineBoot();
  if (!boot || typeof window === "undefined" || boot.path !== window.location.pathname) return null;
  const snapshot = validSnapshot(boot.snapshot);
  const configs = [boot.config, ...Object.values(boot.configs || {})].filter((item) => item && typeof item === "object");
  if (snapshot) void load(snapshot.compiledDesign.layout.rendererKey, snapshot.compiledDesign.layout.rendererVersion).catch(() => undefined);
  for (const raw of configs) void fonts(mergeConfig(raw, getFallbackPublicUIConfig()));
  return snapshot;
}

function publicPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname;
}

function publicQuery(locale?: string, pathOverride?: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (locale) params.set("locale", locale);
  const path = pathOverride || publicPath();
  if (path) params.set("public_path", path);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return query ? "?" + query : "";
}

export async function fetchPublicConfig(locale?: string, pathOverride?: string): Promise<PublicUIConfig> {
  const inline = pathOverride ? undefined : inlinePublicConfig(locale);
  if (inline) return inline;
  const raw = await fetchJson(
    "/api/method/appointment.public_experience.api.get_public_ui_config" + publicQuery(locale, pathOverride),
  );
  return mergeConfig(raw, getFallbackPublicUIConfig(locale));
}

/** The published config of a business site, or null when the path has no published site (no 404). */
export async function fetchOptionalPublicConfig(path: string): Promise<PublicUIConfig | null> {
  const boot = inlineBoot();
  const inline = boot?.configs && typeof window !== "undefined" && boot.path === window.location.pathname ? boot.configs[path] : undefined;
  if (inline && typeof inline === "object") return mergeConfig(inline, getFallbackPublicUIConfig());
  const raw = await fetchJson(
    "/api/method/appointment.public_experience.api.get_public_ui_config" + publicQuery(undefined, path, { optional: "1" }),
  );
  return raw && typeof raw === "object" ? mergeConfig(raw, getFallbackPublicUIConfig()) : null;
}

export async function fetchPublishedSnapshot(locale?: string): Promise<PublishedSnapshot | null> {
  const inline = inlinePublishedSnapshot(locale);
  if (inline) return inline;
  try {
    const raw = await fetchJson(
      "/api/method/appointment.public_experience.api.get_public_experience_snapshot" + publicQuery(locale, undefined, { optional: "1" }),
    );
    return validSnapshot(raw);
  } catch {
    return null;
  }
}

export async function callGet<T>(method: string, params?: Record<string, string | number>): Promise<T> {
  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()
    : "";
  return (await fetchJson("/api/method/" + method + query)) as T;
}

export async function callMethod<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
  const csrfToken = window.frappe?.csrf_token;
  const response = await fetch("/api/method/" + method, {
    method: payload ? "POST" : "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json",
      ...(payload && csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    throw requestError(body, response.status);
  }
  if (body && typeof body === "object" && "message" in (body as Record<string, unknown>)) {
    return (body as Record<string, unknown>).message as T;
  }
  return body as T;
}
