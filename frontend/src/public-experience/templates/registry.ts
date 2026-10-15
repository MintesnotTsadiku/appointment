import { TenaContent } from "./tena/TenaContent";
import { AbugidaContent } from "./abugida/AbugidaContent";
import { MeronContent } from "./meron/MeronContent";
import { BloomContent } from "./bloom/BloomContent";
import { SelamContent } from "./selam/SelamContent";
import { ErgataContent } from "./ergata/ErgataContent";
import { AbugidaBooking, AbugidaSite } from "./abugida/AbugidaTemplate";
import { AbugidaBooking as AbugidaV2Booking, AbugidaSite as AbugidaV2Site } from "./abugida-v2/AbugidaTemplate";
import { AbugidaBooking as AbugidaV3Booking, AbugidaLoading as AbugidaV3Loading, AbugidaSite as AbugidaV3Site } from "./abugida-v3/AbugidaTemplate";
import { BloomBooking, BloomSite } from "./bloom/BloomTemplate";
import { ErgataBooking, ErgataSite } from "./ergata/ErgataTemplate";
import { BloomBooking as BloomV2Booking, BloomSite as BloomV2Site } from "./bloom-v2/BloomTemplate";
import { BloomBooking as BloomV3Booking, BloomLoading as BloomV3Loading, BloomSite as BloomV3Site } from "./bloom-v3/BloomTemplate";
import { MeronBooking, MeronSite } from "./meron/MeronTemplate";
import { MeronBooking as MeronV2Booking, MeronSite as MeronV2Site } from "./meron-v2/MeronTemplate";
import { MeronBooking as MeronV3Booking, MeronLoading as MeronV3Loading, MeronSite as MeronV3Site } from "./meron-v3/MeronTemplate";
import { SelamBooking, SelamSite } from "./selam/SelamTemplate";
import { SelamBooking as SelamV2Booking, SelamSite as SelamV2Site } from "./selam-v2/SelamTemplate";
import { SelamBooking as SelamV3Booking, SelamLoading as SelamV3Loading, SelamSite as SelamV3Site } from "./selam-v3/SelamTemplate";
import { TenaBooking, TenaSite } from "./tena/TenaTemplate";
import { TenaBooking as TenaV2Booking, TenaSite as TenaV2Site } from "./tena-v2/TenaTemplate";
import { TenaBooking as TenaV3Booking, TenaLoading as TenaV3Loading, TenaSite as TenaV3Site } from "./tena-v3/TenaTemplate";
import type { PublicTemplatePackage } from "./types";

/**
 * Certified packages by renderer key and renderer version. A release pins the
 * version it was published with, so a redesign never changes a live site until
 * the owner republishes on the new recipe version. Unknown pairs fail closed.
 */
const TEMPLATE_PACKAGES: Record<string, PublicTemplatePackage> = {
  "selam-movement@1": { key: "selam-movement", Site: SelamSite, Booking: SelamBooking, Content: SelamContent },
  "selam-movement@2": { key: "selam-movement", Site: SelamV2Site, Booking: SelamV2Booking, Content: SelamContent },
  "selam-movement@3": { key: "selam-movement", Site: SelamV3Site, Booking: SelamV3Booking, Content: SelamContent, Loading: SelamV3Loading },
  "bloom-hair@1": { key: "bloom-hair", Site: BloomSite, Booking: BloomBooking, Content: BloomContent },
  "bloom-hair@2": { key: "bloom-hair", Site: BloomV2Site, Booking: BloomV2Booking, Content: BloomContent },
  "bloom-hair@3": { key: "bloom-hair", Site: BloomV3Site, Booking: BloomV3Booking, Content: BloomContent, Loading: BloomV3Loading },
  "meron-atelier@1": { key: "meron-atelier", Site: MeronSite, Booking: MeronBooking, Content: MeronContent },
  "meron-atelier@2": { key: "meron-atelier", Site: MeronV2Site, Booking: MeronV2Booking, Content: MeronContent },
  "meron-atelier@3": { key: "meron-atelier", Site: MeronV3Site, Booking: MeronV3Booking, Content: MeronContent, Loading: MeronV3Loading },
  "abugida-language@1": { key: "abugida-language", Site: AbugidaSite, Booking: AbugidaBooking, Content: AbugidaContent },
  "abugida-language@2": { key: "abugida-language", Site: AbugidaV2Site, Booking: AbugidaV2Booking, Content: AbugidaContent },
  "abugida-language@3": { key: "abugida-language", Site: AbugidaV3Site, Booking: AbugidaV3Booking, Content: AbugidaContent, Loading: AbugidaV3Loading },
  "tena-clinic@1": { key: "tena-clinic", Site: TenaSite, Booking: TenaBooking, Content: TenaContent },
  "tena-clinic@2": { key: "tena-clinic", Site: TenaV2Site, Booking: TenaV2Booking, Content: TenaContent },
  "tena-clinic@3": { key: "tena-clinic", Site: TenaV3Site, Booking: TenaV3Booking, Content: TenaContent, Loading: TenaV3Loading },
  "ergata-therapy@1": { key: "ergata-therapy", Site: ErgataSite, Booking: ErgataBooking, Content: ErgataContent },
};

export function getTemplatePackage(rendererKey: string, rendererVersion: number = 1): PublicTemplatePackage | null {
  return TEMPLATE_PACKAGES[`${rendererKey}@${rendererVersion || 1}`] || null;
}

export function registeredTemplateKeys(): string[] {
  return [...new Set(Object.values(TEMPLATE_PACKAGES).map((item) => item.key))];
}
