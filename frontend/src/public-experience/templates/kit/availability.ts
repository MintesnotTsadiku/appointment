import { useEffect, useState } from "react";

import { parseAvailability, type NextAvailability } from "./core/availability";

export type AvailabilityStatus = "off" | "loading" | "ready";

const ENDPOINT = "/api/method/appointment.public_experience.api.get_next_availability";

/** Development only: `?preview-availability=off|empty|loading` forces a state for browser QA. */
function preview(): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("preview-availability");
}

/**
 * The next free times of the site at `publicRoot`, when the published booking options have
 * `liveAvailability` on. It asks once per page; the server caches the answer for 60 seconds.
 * The status is "off" when the setting is off, the request fails or nothing is free, so a template
 * renders nothing instead of a broken chip.
 */
export function useNextAvailability(enabled: boolean, publicRoot: string): { status: AvailabilityStatus; data: NextAvailability | null } {
  const forced = preview();
  const [state, setState] = useState<{ status: AvailabilityStatus; data: NextAvailability | null }>({ status: enabled ? "loading" : "off", data: null });
  useEffect(() => {
    if (!enabled || forced === "off" || forced === "empty" || forced === "loading") return undefined;
    let active = true;
    const path = publicRoot.replace(/\/am$/, "") || "/";
    fetch(`${ENDPOINT}?${new URLSearchParams({ public_path: path })}`, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!active) return;
        const data = parseAvailability(body?.message);
        setState({ status: data ? "ready" : "off", data });
      })
      .catch(() => { if (active) setState({ status: "off", data: null }); });
    return () => { active = false; };
  }, [enabled, publicRoot, forced]);
  if (forced === "off" || !enabled) return { status: "off", data: null };
  if (forced === "loading") return { status: "loading", data: null };
  if (forced === "empty") return { status: "ready", data: { timezone: "Africa/Addis_Ababa", next: null, todayLeft: 0, services: {}, providers: {} } };
  return state;
}
