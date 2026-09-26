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

function publicPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname;
}

function publicQuery(locale?: string, pathOverride?: string): string {
  const params = new URLSearchParams();
  if (locale) params.set("locale", locale);
  const path = pathOverride || publicPath();
  if (path) params.set("public_path", path);
  const query = params.toString();
  return query ? "?" + query : "";
}

export async function fetchPublicConfig(locale?: string, pathOverride?: string): Promise<PublicUIConfig> {
  const raw = await fetchJson(
    "/api/method/appointment.public_experience.api.get_public_ui_config" + publicQuery(locale, pathOverride),
  );
  return mergeConfig(raw, getFallbackPublicUIConfig(locale));
}

export async function fetchPublishedSnapshot(locale?: string): Promise<PublishedSnapshot | null> {
  try {
    const raw = await fetchJson(
      "/api/method/appointment.public_experience.api.get_public_experience_snapshot" + publicQuery(locale),
    );
    if (!raw || typeof raw !== "object") return null;
    const snapshot = raw as PublishedSnapshot;
    if (snapshot.contract !== "appointment-public-snapshot.v2") return null;
    if (!snapshot.compiledDesign || snapshot.compiledDesign.contract !== "appointment-compiled-design.v1") return null;
    if (!Array.isArray(snapshot.sections)) return null;
    return snapshot;
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
  const response = await fetch("/api/method/" + method, {
    method: payload ? "POST" : "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
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
