import { useEffect, useState } from "react";

/**
 * Showcase businesses shipped by the explicit demo seeder
 * (`appointment/public_experience/manifest/showcase/catalog.v1.json`).
 * A door is shown only when its site resolves to a published release, so a
 * server without the showcase simply shows none.
 */
const SHOWCASE_SLUGS = ["bloom-studio", "tena-studio", "abugida-studio", "selam-studio", "meron-studio"];

export interface ShowcaseDoor {
  slug: string;
  name: string;
  logo: string | null;
  hero: string | null;
  heroAlt: string;
  accent: string | null;
}

export function useShowcaseDoors(enabled: boolean): ShowcaseDoor[] {
  const [doors, setDoors] = useState<ShowcaseDoor[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Promise.all(SHOWCASE_SLUGS.map(loadDoor)).then((loaded) => {
      if (active) setDoors(loaded.filter((door): door is ShowcaseDoor => door !== null));
    });
    return () => {
      active = false;
    };
  }, [enabled]);
  return doors;
}

async function loadDoor(slug: string): Promise<ShowcaseDoor | null> {
  try {
    const response = await fetch(
      "/api/method/appointment.public_experience.api.get_public_ui_config?public_path=" + encodeURIComponent("/" + slug),
      { credentials: "same-origin", headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const config = (await response.json())?.message;
    if (config?.source !== "experience-release" || !config.identity?.applicationName) return null;
    const hero = config.compiledDesign?.assets?.["hero.primary"];
    return {
      slug,
      name: String(config.identity.applicationName),
      logo: localAsset(config.identity.logoCompact),
      hero: localAsset(hero?.src),
      heroAlt: typeof hero?.alt === "string" ? hero.alt : "",
      accent: safeColor(config.compiledDesign?.tokens?.light?.primary),
    };
  } catch {
    return null;
  }
}

/** Only same-origin shipped assets; never a remote or scriptable URL. */
function localAsset(value: unknown): string | null {
  return typeof value === "string" && /^\/(assets|files)\/[\w./-]+$/.test(value) ? value : null;
}

function safeColor(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value) ? value : null;
}
