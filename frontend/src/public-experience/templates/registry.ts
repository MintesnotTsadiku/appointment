import { AbugidaBooking, AbugidaSite } from "./abugida/AbugidaTemplate";
import { AbugidaBooking as AbugidaV2Booking, AbugidaSite as AbugidaV2Site } from "./abugida-v2/AbugidaTemplate";
import { BloomBooking, BloomSite } from "./bloom/BloomTemplate";
import { BloomBooking as BloomV2Booking, BloomSite as BloomV2Site } from "./bloom-v2/BloomTemplate";
import { MeronBooking, MeronSite } from "./meron/MeronTemplate";
import { MeronBooking as MeronV2Booking, MeronSite as MeronV2Site } from "./meron-v2/MeronTemplate";
import { SelamBooking, SelamSite } from "./selam/SelamTemplate";
import { SelamBooking as SelamV2Booking, SelamSite as SelamV2Site } from "./selam-v2/SelamTemplate";
import { TenaBooking, TenaSite } from "./tena/TenaTemplate";
import { TenaBooking as TenaV2Booking, TenaSite as TenaV2Site } from "./tena-v2/TenaTemplate";
import type { PublicTemplatePackage } from "./types";

/**
 * Certified packages by renderer key and renderer version. A release pins the
 * version it was published with, so a redesign never changes a live site until
 * the owner republishes on the new recipe version. Unknown pairs fail closed.
 */
const TEMPLATE_PACKAGES: Record<string, PublicTemplatePackage> = {
  "selam-movement@1": { key: "selam-movement", Site: SelamSite, Booking: SelamBooking },
  "selam-movement@2": { key: "selam-movement", Site: SelamV2Site, Booking: SelamV2Booking },
  "bloom-hair@1": { key: "bloom-hair", Site: BloomSite, Booking: BloomBooking },
  "bloom-hair@2": { key: "bloom-hair", Site: BloomV2Site, Booking: BloomV2Booking },
  "meron-atelier@1": { key: "meron-atelier", Site: MeronSite, Booking: MeronBooking },
  "meron-atelier@2": { key: "meron-atelier", Site: MeronV2Site, Booking: MeronV2Booking },
  "abugida-language@1": { key: "abugida-language", Site: AbugidaSite, Booking: AbugidaBooking },
  "abugida-language@2": { key: "abugida-language", Site: AbugidaV2Site, Booking: AbugidaV2Booking },
  "tena-clinic@1": { key: "tena-clinic", Site: TenaSite, Booking: TenaBooking },
  "tena-clinic@2": { key: "tena-clinic", Site: TenaV2Site, Booking: TenaV2Booking },
};

export function getTemplatePackage(rendererKey: string, rendererVersion: number = 1): PublicTemplatePackage | null {
  return TEMPLATE_PACKAGES[`${rendererKey}@${rendererVersion || 1}`] || null;
}

export function registeredTemplateKeys(): string[] {
  return [...new Set(Object.values(TEMPLATE_PACKAGES).map((item) => item.key))];
}
