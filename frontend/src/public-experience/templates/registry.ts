import { TenaContent } from "./tena/TenaContent";
import { AbugidaContent } from "./abugida/AbugidaContent";
import { MeronContent } from "./meron/MeronContent";
import { BloomContent } from "./bloom/BloomContent";
import { SelamContent } from "./selam/SelamContent";
import { AbugidaBooking, AbugidaSite } from "./abugida/AbugidaTemplate";
import { BloomBooking, BloomSite } from "./bloom/BloomTemplate";
import { MeronBooking, MeronSite } from "./meron/MeronTemplate";
import { SelamBooking, SelamSite } from "./selam/SelamTemplate";
import { TenaBooking, TenaSite } from "./tena/TenaTemplate";
import type { PublicTemplatePackage } from "./types";

const TEMPLATE_PACKAGES: Record<string, PublicTemplatePackage> = {
  "selam-movement": { key: "selam-movement", Site: SelamSite, Booking: SelamBooking, Content: SelamContent },
  "bloom-hair": { key: "bloom-hair", Site: BloomSite, Booking: BloomBooking, Content: BloomContent },
  "meron-atelier": { key: "meron-atelier", Site: MeronSite, Booking: MeronBooking, Content: MeronContent },
  "abugida-language": { key: "abugida-language", Site: AbugidaSite, Booking: AbugidaBooking, Content: AbugidaContent },
  "tena-clinic": { key: "tena-clinic", Site: TenaSite, Booking: TenaBooking, Content: TenaContent },
};

export function getTemplatePackage(rendererKey: string): PublicTemplatePackage | null {
  return TEMPLATE_PACKAGES[rendererKey] || null;
}

export function registeredTemplateKeys(): string[] {
  return Object.keys(TEMPLATE_PACKAGES);
}
