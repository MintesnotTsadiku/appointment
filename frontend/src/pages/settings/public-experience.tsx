import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { callGet, callMethod } from "@/public-experience/api";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { NativeSelect } from "@/components/native-select";
import { SettingsPage, SettingsSection } from "@/components/settings-layout";
import { ErrorState } from "@/components/states";
import { useTranslation } from "@/lib/i18n";
import { humanize, parseInputs, type CompileResult, type Profile, type Recipe, type Site } from "./public-experience-editor/types";
import { ChoiceSelect, EditorSkeleton, Field, StatusMessages } from "./public-experience-editor/EditorParts";
import { DesignGallery } from "./public-experience-editor/DesignGallery";
import { SelectedDesign } from "./public-experience-editor/SelectedDesign";
import { Readiness, type ReadinessCheck } from "./public-experience-editor/Readiness";

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
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);
  const [initialLoad, setInitialLoad] = useState<"loading" | "failed" | "done">("loading");
  const { t } = useTranslation();

  const recipe = useMemo(() => recipes.find((item) => item.key === recipeKey) || recipes[0], [recipes, recipeKey]);
  // A recipe offers only the adjustments it declares.
  const offers = (name: string) => Boolean(recipe?.adjustments[name]);
  const choices = (name: string) => recipe?.adjustments[name]?.choices ?? [];

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
      setInitialLoad("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load public experience settings.");
      setInitialLoad((state) => (state === "loading" ? "failed" : state));
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
    setChecks([]);
  }, [sites, selectedSite]);

  const run = async (operation: () => Promise<void>) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setBusy(false);
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
        // Send only what the recipe offers; the compiler rejects anything else.
        accentColor: offers("accentColor") ? accentColor || undefined : undefined,
        motion: offers("motion") ? motion : undefined,
        presentationDensity: offers("presentationDensity") ? density : undefined,
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

  const checkReadiness = () => run(async () => {
    if (!site) return;
    const result = await callGet<{ ready: boolean; checks: ReadinessCheck[] }>("appointment.public_experience.api.site_readiness", { site: site.name });
    setChecks(result.checks);
    setMessage(result.ready ? t("staff.publicExperience.readyMessage") : t("staff.publicExperience.notReadyMessage"));
  });

  const retryInitial = () => {
    setError("");
    setInitialLoad("loading");
    void load();
  };

  const heroChoices = recipe?.adjustments.heroAsset?.choices ?? [];
  const detailChoices = recipe?.adjustments.detailAsset?.choices ?? [];

  return (
    <SettingsPage
      title={t("staff.settings.publicExperience.title")}
      eyebrow={t("staff.publicExperience.eyebrow")}
      description={t("staff.publicExperience.description")}
      headingQa="public-experience-heading"
    >
      <div className="space-y-6" data-page="public-experience-editor">
        {initialLoad === "loading" ? <EditorSkeleton /> : initialLoad === "failed" ? (
          <ErrorState description={error || undefined} onRetry={retryInitial} />
        ) : (
          <>
            <StatusMessages error={error} message={message} />

            <SettingsSection title={t("staff.publicExperience.brandTitle")} description={t("staff.publicExperience.brandDescription")}>
              <div className="max-w-xl space-y-1.5">
                <Label htmlFor="pe-brand-profile">{t("staff.publicExperience.brandProfile")}</Label>
                <NativeSelect id="pe-brand-profile" data-qa="public-experience-profile" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}>
                  <option value="">{t("staff.publicExperience.selectProfile")}</option>
                  {profiles.map((item) => <option key={item.name} value={item.name}>{item.profile_name} · {item.lifecycle}</option>)}
                </NativeSelect>
              </div>

              {profile ? (
                <div className="mt-6 space-y-6">
                  <div className="space-y-3">
                    <StepTitle step={1} title={t("staff.publicExperience.galleryTitle")} hint={t("staff.publicExperience.galleryHint")} />
                    <DesignGallery recipes={recipes} selected={recipeKey} current={profile.recipe_key} onSelect={setRecipeKey} />
                  </div>
                  <div className="grid grid-cols-1 gap-6 border-t pt-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
                    <div className="min-w-0 space-y-4">
                      <StepTitle
                        step={2}
                        title={t("staff.publicExperience.adjustTitle")}
                        hint={`${t("staff.publicExperience.draftVersion")} ${profile.draft_version} · ${profile.active_revision ? t("staff.publicExperience.brandLive") : t("staff.publicExperience.brandNotLive")}`}
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field id="pe-app-name" label={t("staff.publicExperience.applicationName")}>
                        <Input id="pe-app-name" value={applicationName} onChange={(event) => setApplicationName(event.target.value)} />
                      </Field>
                      <Field id="pe-short-name" label={t("staff.publicExperience.shortName")}>
                        <Input id="pe-short-name" value={shortName} onChange={(event) => setShortName(event.target.value)} />
                      </Field>
                      {offers("accentColor") ? (
                        <Field id="pe-accent" label={t("staff.publicExperience.accentColor")}>
                          {/* Fallback is the recipe's default accent, a brand value rather than UI styling. */}
                          <Input id="pe-accent" className="h-10 cursor-pointer p-1" type="color" value={accentColor || "#aa6a43"} onChange={(event) => setAccentColor(event.target.value)} />
                        </Field>
                      ) : null}
                      {offers("motion") ? (
                        <Field id="pe-motion" label={t("staff.publicExperience.motion")}>
                          <ChoiceSelect id="pe-motion" value={motion} onChange={setMotion} options={choices("motion").map((value) => ({ value, label: t(value === "standard" ? "staff.publicExperience.motionStandard" : "staff.publicExperience.motionCalm") }))} />
                        </Field>
                      ) : null}
                      {offers("presentationDensity") ? (
                        <Field id="pe-density" label={t("staff.publicExperience.density")}>
                          <ChoiceSelect id="pe-density" value={density} onChange={setDensity} options={choices("presentationDensity").map((value) => ({ value, label: t(value === "spacious" ? "staff.publicExperience.densitySpacious" : "staff.publicExperience.densityComfortable") }))} />
                        </Field>
                      ) : null}
                      {heroChoices.length ? (
                        <Field id="pe-hero" label={t("staff.publicExperience.heroImagery")}>
                          <ChoiceSelect id="pe-hero" value={heroAsset} onChange={setHeroAsset} options={heroChoices.map((choice) => ({ value: choice, label: humanize(choice) }))} />
                        </Field>
                      ) : null}
                      {detailChoices.length ? (
                        <Field id="pe-detail" label={t("staff.publicExperience.detailImagery")}>
                          <ChoiceSelect id="pe-detail" value={detailAsset} onChange={setDetailAsset} options={detailChoices.map((choice) => ({ value: choice, label: humanize(choice) }))} />
                        </Field>
                      ) : null}
                      </div>
                      <div className="space-y-3 border-t pt-4">
                        <StepTitle step={3} title={t("staff.publicExperience.saveTitle")} hint={t("staff.publicExperience.saveHint")} />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={save} disabled={busy} data-qa="public-experience-save">{busy && <Loader2 className="animate-spin" aria-hidden="true" />}{t("staff.publicExperience.saveDraft")}</Button>
                          <Button variant="outline" onClick={compileDraft} disabled={busy} data-qa="public-experience-compile">{t("staff.publicExperience.compile")}</Button>
                          <Button variant="secondary" onClick={publishBrand} disabled={busy} data-qa="public-experience-publish-brand">{t("staff.publicExperience.publishBrand")}</Button>
                        </div>
                      </div>
                    </div>
                    <SelectedDesign recipe={recipe} site={site} contentHash={compile?.contentHash} />
                  </div>
                </div>
              ) : <p className="mt-4 text-sm text-muted-foreground">{profiles.length ? t("staff.publicExperience.chooseProfile") : t("staff.publicExperience.noProfiles")}</p>}
            </SettingsSection>

            <SettingsSection
              title={`4. ${t("staff.publicExperience.releaseTitle")}`}
              description={t("staff.publicExperience.releaseDescription")}
              aside={site ? <span className="max-w-full truncate rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{site.status} · /{site.slug}</span> : undefined}
            >
              <div className="max-w-xl space-y-1.5">
                <Label htmlFor="pe-site">{t("staff.publicExperience.publicSite")}</Label>
                <NativeSelect id="pe-site" data-qa="public-experience-site" value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)}>
                  <option value="">{t("staff.publicExperience.selectSite")}</option>
                  {sites.map((item) => <option key={item.name} value={item.name}>{item.site_title} · {item.status}</option>)}
                </NativeSelect>
              </div>
              {site ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => void checkReadiness()} disabled={busy} data-qa="public-experience-readiness">{t("staff.publicExperience.checkReadiness")}</Button>
                    <Button onClick={publishSite} disabled={busy} data-qa="public-experience-publish-site">{t("staff.publicExperience.publishRelease")}</Button>
                  </div>
                  {checks.length ? <Readiness checks={checks} /> : null}
                </>
              ) : null}
            </SettingsSection>
          </>
        )}
      </div>
    </SettingsPage>
  );
};

export default PublicExperienceEditor;

function StepTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">{step}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
