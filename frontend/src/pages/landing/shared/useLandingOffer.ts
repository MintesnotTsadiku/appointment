import { useEffect, useState } from "react";
import { usePlatformBrand } from "@/lib/platform-brand";
import { OFFER_API, parseOffer, type LandingOffer } from "./offer";

let cached: unknown = null;

/** The configured free tier and setup time, fetched once per page load. */
export function useLandingOffer(): LandingOffer {
  const { growth } = usePlatformBrand();
  const [raw, setRaw] = useState<unknown>(cached);
  useEffect(() => {
    if (cached) return;
    let active = true;
    fetch(OFFER_API, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!body?.message) return;
        cached = body.message;
        if (active) setRaw(body.message);
      })
      // The careful wording stays when the server cannot answer.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return parseOffer(raw, growth.marketingLiveMinutes);
}
