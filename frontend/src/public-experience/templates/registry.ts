import { AbugidaBooking, AbugidaSite } from "./abugida/AbugidaTemplate";
import { BloomBooking, BloomSite } from "./bloom/BloomTemplate";
import { MeronBooking, MeronSite } from "./meron/MeronTemplate";
import { SelamBooking, SelamSite } from "./selam/SelamTemplate";
import { TenaBooking, TenaSite } from "./tena/TenaTemplate";
import type { PublicTemplatePackage } from "./types";

const TEMPLATE_PACKAGES: Record<string, PublicTemplatePackage> = {
  "selam-movement": { key: "selam-movement", Site: SelamSite, Booking: SelamBooking },
  "bloom-hair": { key: "bloom-hair", Site: BloomSite, Booking: BloomBooking },
  "meron-atelier": { key: "meron-atelier", Site: MeronSite, Booking: MeronBooking },
  "abugida-language": { key: "abugida-language", Site: AbugidaSite, Booking: AbugidaBooking },
  "tena-clinic": { key: "tena-clinic", Site: TenaSite, Booking: TenaBooking },
};

export function getTemplatePackage(rendererKey: string): PublicTemplatePackage | null {
  return TEMPLATE_PACKAGES[rendererKey] || null;
}

export function registeredTemplateKeys(): string[] {
  return Object.keys(TEMPLATE_PACKAGES);
}
