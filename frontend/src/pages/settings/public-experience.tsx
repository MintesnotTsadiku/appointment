import { useEffect, useMemo, useState } from "react";

import { callGet, callMethod } from "@/public-experience/api";

interface Recipe {
  key: string;
  version: number;
  label: string;
  description: string;
  audience: string;
  mood: string;
  supportedLocales: string[];
  requiredSections: string[];
  adjustments: Record<string, { type: string; choices?: string[]; optional?: boolean }>;
  accessibility: Record<string, unknown>;
}

interface Profile {
  name: string;
  profile_name: string;
  application_name: string;
  short_name?: string;
  owner_type: string;
  organization?: string;
  provider?: string;
  recipe_key: string;
  recipe_version: number;
  brand_inputs_json?: string;
  lifecycle: string;
  active_revision?: string;
  draft_version: number;
}

interface Site {
  name: string;
  site_title: string;
  slug: string;
  status: string;
  brand_profile?: string;
  recipe_key: string;
  recipe_version: number;
  current_release?: string;
  draft_version: number;
}

interface CompileResult {
  contentHash: string;
  compiledDesign: { identity?: { applicationName?: string }; layout?: { rendererKey?: string }; validation?: { ok?: boolean } };
  valid: boolean;
}

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";
const input = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950";
const button = "rounded-lg px-4 py-2 text-sm font-medium transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

function parseInputs(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

const PublicExperienceEditor = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [recipeKey, setRecipeKey] = useState("");
  const [applicationName, setApplicationName] = useState("");
  const [shortName, setShortName] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [motion, setMotion] = useState("calm");
  const [density, setDensity] = useState("comfortable");
  const [heroAsset, setHeroAsset] = useState("");
  const [detailAsset, setDetailAsset] = useState("");
  const [compile, setCompile] = useState<CompileResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recipe = useMemo(() => recipes.find((item) => item.key === recipeKey) || recipes[0], [recipes, recipeKey]);

  const load = async () => {
    try {
      const [profileResult, siteResult, recipeResult] = await Promise.all([
        callGet<{ profiles: Profile[] }>("appointment.public_experience.api.list_brand_profiles"),
        callGet<{ sites: Site[] }>("appointment.public_experience.api.list_public_sites"),
        callGet<{ recipes: Recipe[] }>("appointment.public_experience.api.list_curated_recipes"),
      ]);
      setProfiles(profileResult.profiles || []);
      setSites(siteResult.sites || []);
      setRecipes(recipeResult.recipes || []);
      if (!selectedProfile && profileResult.profiles?.[0]) setSelectedProfile(profileResult.profiles[0].name);
      if (!selectedSite && siteResult.sites?.[0]) setSelectedSite(siteResult.sites[0].name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load public experience settings.");
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const next = profiles.find((item) => item.name === selectedProfile) || null;
    setProfile(next);
    if (next) {
      const inputs = parseInputs(next.brand_inputs_json);
      setRecipeKey(next.recipe_key);
      setApplicationName(next.application_name || "");
      setShortName(next.short_name || "");
      setAccentColor(inputs.accentColor || inputs.accent_color || "");
      setMotion(inputs.motion || "calm");
      setDensity(inputs.presentationDensity || inputs.presentation_density || "comfortable");
      setHeroAsset(inputs.heroAsset || inputs.hero_asset || "");
      setDetailAsset(inputs.detailAsset || inputs.detail_asset || "");
      setCompile(null);
    }
  }, [profiles, selectedProfile]);

  useEffect(() => {
    const heroChoices = recipe?.adjustments.heroAsset?.choices || [];
    const detailChoices = recipe?.adjustments.detailAsset?.choices || [];
    if (heroChoices.length && !heroChoices.includes(heroAsset)) setHeroAsset(heroChoices[0]);
    if (detailChoices.length && !detailChoices.includes(detailAsset)) setDetailAsset(detailChoices[0]);
  }, [recipe, heroAsset, detailAsset]);

  useEffect(() => {
    setSite(sites.find((item) => item.name === selectedSite) || null);
  }, [sites, selectedSite]);

  const run = async (operation: () => Promise<void>) => {
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    }
  };

  const save = () => run(async () => {
    if (!profile) return;
    const result = await callMethod<{ draftVersion: number }>("appointment.public_experience.api.save_brand_draft", {
      profile: profile.name,
      expected_draft_version: profile.draft_version,
      recipe_key: recipeKey,
      recipe_version: recipe?.version || 1,
      application_name: applicationName,
      short_name: shortName,
      brand_inputs_json: JSON.stringify({
        accentColor: accentColor || undefined,
        motion,
        presentationDensity: density,
        heroAsset: heroAsset || undefined,
        detailAsset: detailAsset || undefined,
      }),
    });
    setMessage("Draft saved. Compile it before publishing.");
    setProfiles((current) => current.map((item) => item.name === profile.name ? { ...item, draft_version: result.draftVersion, application_name: applicationName, short_name: shortName, recipe_key: recipeKey, recipe_version: recipe?.version || 1 } : item));
  });

  const compileDraft = () => run(async () => {
    if (!profile) return;
    const result = await callGet<CompileResult>("appointment.public_experience.api.compile_brand", {
      profile: profile.name,
      expected_draft_version: profile.draft_version,
    });
    setCompile(result);
    setMessage(result.valid ? "Compiled design is valid." : "Compilation returned validation issues.");
  });

  const publishBrand = () => run(async () => {
    if (!profile) return;
    await callMethod("appointment.public_experience.api.publish_brand", {
      profile: profile.name,
      expected_draft_version: profile.draft_version,
    });
    setMessage("Brand Revision published.");
    await load();
  });

  const publishSite = () => run(async () => {
    if (!site) return;
    await callMethod("appointment.public_experience.api.publish_experience", {
      site: site.name,
      expected_version: site.draft_version,
    });
    setMessage("Experience Release published.");
    await load();
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" data-page="public-experience-editor">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Public Experience</p>
        <h1 className="mt-2 text-3xl font-semibold">Curated public presence</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Choose a certified recipe, adjust its safe inputs, compile the design, then publish one immutable release.
        </p>
      </header>

      {error ? <p data-status="error" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {message ? <p data-status="ok" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}

      <section className={card}>
        <label className="block text-sm font-medium">Brand Profile
          <select className={input} value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}>
            <option value="">Select a profile…</option>
            {profiles.map((item) => <option key={item.name} value={item.name}>{item.profile_name} · {item.lifecycle}</option>)}
          </select>
        </label>

        {profile ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Recipe and identity</h2>
                  <p className="mt-1 text-xs text-slate-500">Draft {profile.draft_version}{profile.active_revision ? " · live revision " + profile.active_revision : ""}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">{recipe?.mood || "certified"}</span>
              </div>

              <label className="mt-4 block text-sm">Certified recipe
                <select className={input} value={recipeKey} onChange={(event) => setRecipeKey(event.target.value)}>
                  {recipes.map((item) => <option key={item.key} value={item.key}>{item.label} · v{item.version}</option>)}
                </select>
              </label>
              {recipe ? <p className="mt-2 text-sm text-slate-500">{recipe.description}</p> : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">Application name<input className={input} value={applicationName} onChange={(event) => setApplicationName(event.target.value)} /></label>
                <label className="text-sm">Short name<input className={input} value={shortName} onChange={(event) => setShortName(event.target.value)} /></label>
                <label className="text-sm">Accent color<input className={input + " h-10 p-1"} type="color" value={accentColor || "#aa6a43"} onChange={(event) => setAccentColor(event.target.value)} /></label>
                <label className="text-sm">Motion
                  <select className={input} value={motion} onChange={(event) => setMotion(event.target.value)}><option value="calm">Calm</option><option value="standard">Standard</option></select>
                </label>
                <label className="text-sm">Presentation density
                  <select className={input} value={density} onChange={(event) => setDensity(event.target.value)}><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select>
                </label>
                {recipe?.adjustments.heroAsset?.choices?.length ? <label className="text-sm">Hero imagery
                  <select className={input} value={heroAsset} onChange={(event) => setHeroAsset(event.target.value)}>{recipe.adjustments.heroAsset.choices.map((choice) => <option key={choice} value={choice}>{choice.replace("hero.", "").split("-").join(" ")}</option>)}</select>
                </label> : null}
                {recipe?.adjustments.detailAsset?.choices?.length ? <label className="text-sm">Detail imagery
                  <select className={input} value={detailAsset} onChange={(event) => setDetailAsset(event.target.value)}>{recipe.adjustments.detailAsset.choices.map((choice) => <option key={choice} value={choice}>{choice.replace("detail.", "").split("-").join(" ")}</option>)}</select>
                </label> : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className={button + " bg-slate-900 text-white"} onClick={save}>Save draft</button>
                <button className={button + " border border-slate-300"} onClick={compileDraft}>Compile design</button>
                <button className={button + " bg-amber-700 text-white"} onClick={publishBrand}>Publish brand revision</button>
              </div>
            </div>

            <aside className="rounded-xl bg-[#fbf7f1] p-5 text-[#332821]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#aa6a43]">Quiet Trust</p>
              <h3 className="mt-3 font-serif text-2xl">Warm editorial</h3>
              <p className="mt-3 text-sm leading-6">A quiet hierarchy, generous rhythm and a direct path to booking—designed for clinics and thoughtful services.</p>
              <ul className="mt-5 space-y-2 text-xs text-[#6c5b4f]">
                <li>✓ Local Latin + Ethiopic font coverage</li>
                <li>✓ Protected booking and state tokens</li>
                <li>✓ Structured content only</li>
                <li>✓ Contrast and focus checks at compile time</li>
              </ul>
              {compile ? <p className="mt-5 break-all border-t border-[#d9c9b8] pt-4 font-mono text-[10px]">Compiled {compile.contentHash}</p> : null}
            </aside>
          </div>
        ) : <p className="mt-4 text-sm text-slate-500">Choose a profile to edit its certified design.</p>}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Experience Release</h2><p className="mt-1 text-sm text-slate-500">The release pins the brand revision, recipe, compiled design and typed site content.</p></div>
          {site ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{site.status} · {site.slug}</span> : null}
        </div>
        <label className="mt-4 block max-w-xl text-sm font-medium">Public Site
          <select className={input} value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)}>
            <option value="">Select a site…</option>
            {sites.map((item) => <option key={item.name} value={item.name}>{item.site_title} · {item.status}</option>)}
          </select>
        </label>
        {site ? <div className="mt-4 flex flex-wrap items-center gap-3"><button className={button + " bg-slate-900 text-white"} onClick={() => void run(async () => { const result = await callGet<{ ready: boolean; checks: Array<{ check: string; ok: boolean; remediation?: string }> }>("appointment.public_experience.api.site_readiness", { site: site.name }); setMessage(result.ready ? "Site is ready." : result.checks.filter((item) => !item.ok).map((item) => item.check + ": " + (item.remediation || "not ready")).join(" · ")); })}>Check readiness</button><button className={button + " bg-emerald-700 text-white"} onClick={publishSite}>Publish Experience Release</button></div> : null}
      </section>
    </div>
  );
};

export default PublicExperienceEditor;
