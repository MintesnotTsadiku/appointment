import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";
import type { PublishedSnapshot } from "@/public-experience/types";
import { AppearancePreview } from "./appearance/AppearancePreview";
import { AppearanceCards, type AppearanceOptions } from "./appearance/AppearanceCards";
import { AppearanceCheckbox } from "./appearance/AppearanceCheckbox";
import { AppearanceSelect } from "./appearance/AppearanceSelect";
import { WebsitePreview } from "./website-preview";
import { StaffShell } from '@/components/staff-shell';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';
import { ContentStep, draftIssues, savedSections } from "./website-editor/ContentStep";
import type { SectionSchema } from "./website-editor/core";
import { GalleryBadge, GalleryChoiceNote } from "./website-template-choice/GalleryChoiceNote";
import { TemplateSwitchPanel } from "./website-template-choice/TemplateSwitchPanel";
import { TEMPLATE_CHOICE_API, addressFromName, choiceFirst, pickGalleryTemplate, templateFromSearch, withoutTemplate } from "@/lib/template-choice";

interface Owner { type: string; name: string; label: string }
interface Recipe { key: string; label: string; audience: string; mood: string; score: number; industry: string; thumbnail: string; rankingReasons: string[]; fontPairing: string }
interface Section { type: string; content: Record<string, unknown> }
interface Website {
  owner: string; site: string; title: string; slug: string; recipeKey: string; draftVersion: number; url: string;
  /** The website name on Amharic pages; empty shows the business's Amharic name. */
  titleAm?: string;
  /** The template version of the draft and the latest one; an older draft can upgrade, then publish. */
  recipeVersion?: number; latestRecipeVersion?: number;
  setup: { step?: string; features?: string[]; preferences?: Record<string, string> }; status: string; sections: Section[];
  brandInputs: Record<string, string>;
  /** Booking options of the public website; live availability is off until the owner turns it on. */
  booking?: { liveAvailability?: boolean; holidayGreetings?: boolean };
  appearanceOptions: AppearanceOptions;
  identityAssets: Record<string, string | null>;
  capabilities: Array<{ capability: string; active: boolean }>;
  editorSchema?: Record<string, SectionSchema>;
  derivedFormats?: { services?: Record<string, string>; places?: Record<string, string> };
  mediaLimits?: { maxBytes: number; types: string[] };
}
interface Context { selectedOwner?: string; owners: Owner[]; catalog: Recipe[]; sites: Website[]; galleryTemplate?: string | null }

const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";
const steps = ["brand", "content", "features", "readiness"];
const api = "appointment.public_experience.api.";
const industryKeys: Record<string, string> = { photography: "staff.website.setup.industry.photography", automotive: "staff.website.setup.industry.automotive", accounting: "staff.website.setup.industry.accounting", coffee: "staff.website.setup.industry.coffee", creator: "staff.website.setup.industry.creator", specialist: "staff.website.setup.industry.specialist",  wellness: "staff.website.setup.industry.wellness", beauty: "staff.website.setup.industry.beauty", creative: "staff.website.setup.industry.creative", education: "staff.website.setup.industry.education", health: "staff.website.setup.industry.health", therapy: "staff.website.setup.industry.therapy" };
const moodKeys: Record<string, string> = { warm: "staff.website.setup.mood.warm", bold: "staff.website.setup.mood.bold", editorial: "staff.website.setup.mood.editorial", friendly: "staff.website.setup.mood.friendly", calm: "staff.publicExperience.motionCalm" };
const audienceKeys: Record<string, string> = { clients: "staff.website.setup.audience.clients", learners: "staff.website.setup.audience.learners", patients: "staff.website.setup.audience.patients" };
const densityKeys: Record<string, string> = { comfortable: "staff.publicExperience.densityComfortable", spacious: "staff.publicExperience.densitySpacious", expressive: "staff.website.setup.density.expressive" };
const stepKeys: Record<string, string> = { brand: "staff.website.setup.step.brand", content: "staff.website.setup.step.content", features: "footer.features", readiness: "staff.website.setup.step.readiness" };
const featureKeys: Record<string, string> = { blog: "footer.blog", gallery: "publicSite.gallery", newsletter: "staff.website.setup.feature.newsletter" };
const identityKeys: Record<string, string> = { logo_primary: "staff.website.setup.identity.logoPrimary", logo_compact: "staff.website.setup.identity.logoCompact", favicon: "staff.website.setup.identity.favicon" };

/** Place a link where a translated sentence has its {0} placeholder. */
function withLink(text: string, link: ReactNode) {
  const [before, after = ""] = text.split("{0}");
  return <>{before}{link}{after}</>;
}

export default function WebsiteSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const entryResolved = useRef(false);
  const [context, setContext] = useState<Context>({ owners: [], catalog: [], sites: [] });
  const [owner, setOwner] = useState("");
  const [industry, setIndustry] = useState("");
  const [mood, setMood] = useState("");
  const [audience, setAudience] = useState("");
  const [density, setDensity] = useState("");
  const [mainAction, setMainAction] = useState("booking");
  const [recipe, setRecipe] = useState("");
  const [site, setSite] = useState<Website | null>(null);
  const [title, setTitle] = useState("");
  const [titleAm, setTitleAm] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [palette, setPalette] = useState("default");
  const [font, setFont] = useState("default");
  const [resetUndo, setResetUndo] = useState<{palette:string;font:string;accent:string} | null>(null);
  const [fullPreview, setFullPreview] = useState(false);
  const [accent, setAccent] = useState("");
  const [presentationDensity, setPresentationDensity] = useState("comfortable");
  const [motion, setMotion] = useState("");
  const [liveAvailability, setLiveAvailability] = useState(false);
  const [holidayGreetings, setHolidayGreetings] = useState(false);
  const [identityKind, setIdentityKind] = useState("logo_primary");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [imageConsent, setImageConsent] = useState(false);
  const identityInput = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contentFocus, setContentFocus] = useState<string | undefined>();
  const [readiness, setReadiness] = useState<Array<{ check: string; ok: boolean; remediation: string }>>([]);
  // The template chosen in the landing gallery: preselected for a new website, offered (never applied) for an existing one.
  const [gallery, setGallery] = useState("");
  const [switchOffer, setSwitchOffer] = useState("");
  const galleryPreviewed = useRef(false);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  function adopt(next: Website) {
    setResetUndo(null);
    setSite(next); setTitle(next.title); setTitleAm(next.titleAm || ""); setSlug(next.slug); setSections(next.sections);
    setPalette(next.brandInputs.paletteChoice || next.brandInputs.palette_choice || "default");
    setFont(next.brandInputs.fontChoice || next.brandInputs.font_choice || "default");
    setFeatures(next.setup.features || []); setAccent(next.brandInputs.accentColor || next.brandInputs.accent_color || "");
    setPresentationDensity(next.brandInputs.presentationDensity || next.brandInputs.presentation_density || "comfortable");
    setMotion(next.brandInputs.motion || ""); setLiveAvailability(Boolean(next.booking?.liveAvailability)); setHolidayGreetings(Boolean(next.booking?.holidayGreetings));
    const preferences = next.setup.preferences;
    if (preferences) {
      setIndustry(preferences.industry || ""); setMood(preferences.mood || "");
      setAudience(preferences.audience || ""); setDensity(preferences.density || "");
      setMainAction(preferences.main_action || "booking");
    }
  }

  useEffect(() => {
    let active = true;
    callGet<Context>(api + "website_setup_context", { industry, mood, audience, density }).then((result) => {
      if (!active) return;
      setContext(result);
      if (!entryResolved.current) {
        entryResolved.current = true;
        const existing = result.selectedOwner ? result.sites.find(row => row.owner === result.selectedOwner) : result.sites.length === 1 ? result.sites[0] : undefined;
        if (result.selectedOwner) setOwner(result.selectedOwner);
        if (existing) adopt({ ...existing, setup: { ...existing.setup, step: "brand" } });
        resolveGalleryChoice(result, existing);
      }
      setOwner((value) => value || result.owners[0]?.name || "");
      setRecipe((value) => value || result.catalog[0]?.key || "");
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [industry, mood, audience, density]);

  const previewSite = site?.site;
  const previewVersion = site?.draftVersion;
  useEffect(() => {
    if (!previewSite) return;
    let active = true;
    const timer = window.setTimeout(() => callMethod<PublishedSnapshot>(api + "preview_website_setup", { site: previewSite, expected_version: previewVersion, brand_inputs: { paletteChoice: palette, fontChoice: font, accentColor: accent || null, presentationDensity, ...(motion ? { motion } : {}) } })
      .then(next => { if (active) setSnapshot(next); })
      .catch((reason: Error) => { if (active) setError(reason.message); }), 150);
    return () => { active = false; window.clearTimeout(timer); };
  }, [previewSite, previewVersion, palette, font, accent, presentationDensity, motion]);

  useEffect(() => {
    const selected = context.owners.find((row) => row.name === owner);
    if (!gallery || site || !selected || galleryPreviewed.current) return;
    galleryPreviewed.current = true;
    callMethod<PublishedSnapshot>(api + "preview_website_template", { owner_type: selected.type, owner, recipe_key: gallery, preferences: { main_action: "booking" } })
      .then(setSnapshot).catch((reason: Error) => setError(reason.message));
  }, [gallery, site, owner, context.owners]);

  function resolveGalleryChoice(result: Context, existing?: Website) {
    const fromLink = templateFromSearch(window.location.search);
    const chosen = pickGalleryTemplate(fromLink, existing ? null : result.galleryTemplate, result.catalog.map((row) => row.key));
    if (fromLink && !result.owners.length) void callMethod(TEMPLATE_CHOICE_API + ".note_template", { template: fromLink }).catch(() => undefined);
    if (!chosen) return;
    if (existing) {
      if (chosen === fromLink && chosen !== existing.recipeKey) setSwitchOffer(chosen);
      return;
    }
    const name = result.owners.find((row) => row.name === (result.selectedOwner || result.owners[0]?.name))?.label || "";
    setGallery(chosen); setRecipe(chosen);
    setTitle((value) => value || name); setSlug((value) => value || addressFromName(name));
  }

  function clearGalleryLink() {
    navigate({ search: withoutTemplate(window.location.search) }, { replace: true });
  }

  /** Preferences re-rank the templates; they never replace the template chosen in the gallery. */
  function rerank() {
    if (!gallery) setRecipe("");
  }

  async function switchTemplate(key: string) {
    if (!site) return;
    await run(async () => {
      const next = await callMethod<Website>(api + "switch_website_template", { site: site.site, expected_version: site.draftVersion, recipe_key: key });
      adopt(next); setSnapshot(null); setSwitchOffer(""); clearGalleryLink();
      setNotice(fill(t("staff.website.templateChoice.switched"), context.catalog.find((row) => row.key === key)?.label || key));
      // The offer closes; bring the owner to the confirmation instead of the middle of the page.
      window.setTimeout(() => noticeRef.current?.scrollIntoView({ block: "center" }), 0);
    });
  }

  async function run(operation: () => Promise<unknown>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : t("staff.website.setup.saveFailed")); }
    finally { setBusy(false); }
  }

  async function save(step: string) {
    if (!site) return;
    const pending = changedIssues(site, sections);
    if (pending) {
      setContentFocus(pending);
      setSite({ ...site, setup: { ...site.setup, step: "content" } });
      throw new Error(t("staff.website.editor.fixBeforeSaving"));
    }
    const next = await callMethod<Website>(api + "save_website_setup", {
      site: site.site, expected_version: site.draftVersion, step, title, title_am: titleAm, sections: savedSections(sections), features,
      brand_inputs: { ...site.brandInputs, presentationDensity, palette_choice: undefined, font_choice: undefined, paletteChoice: palette, fontChoice: font, accentColor: accent || undefined, accent_color: undefined, ...(motion ? { motion } : {}) },
      booking: { liveAvailability, holidayGreetings },
    });
    adopt(next); setSnapshot(null); setNotice(t("staff.website.setup.draftSaved"));
    return next;
  }


  const step = site?.setup.step || "brand";
  const preferences = { industry, mood, audience, density, main_action: mainAction };

  return <StaffShell width="full"><div className="mx-auto max-w-[1600px] space-y-6 p-6" data-page="website-setup">
    <header className="website-setup-header"><div><h1 className="text-3xl font-semibold">{t("staff.website.setup.title")}</h1><p>{t("staff.website.setup.intro")}</p></div><div className="website-setup-links"><button className="underline" disabled={!site || busy} onClick={() => void run(() => save("content"))}>{t("staff.website.setup.pageContent")}</button> · <Link to="/settings/website/content">{t("staff.website.setup.articlesGallery")}</Link><Link to="/home" className={button}>{t("staff.website.setup.backToWorkspace")}</Link></div></header>
    {site && context.owners.length > 1 && <label>{t("staff.team.business")}<AppearanceSelect aria-label={t("staff.team.business")} value={site.owner} onChange={event => { const next = context.sites.find(row => row.owner === event.target.value); setOwner(event.target.value); setSnapshot(null); if (next) adopt({ ...next, setup: { ...next.setup, step: "brand" } }); else { setSite(null); setTitle(""); setSlug(""); } }}>{context.owners.map(row => <option key={row.name} value={row.name}>{row.label}</option>)}</AppearanceSelect></label>}
    {site && context.sites.length > 1 && <label>{t("staff.settings.website.title")}<AppearanceSelect aria-label={t("staff.settings.website.title")} value={site.site} onChange={event => { const next = context.sites.find(row => row.site === event.target.value); if (next) adopt({ ...next, setup: { ...next.setup, step: "brand" } }); }}>{context.sites.map(row => <option key={row.site} value={row.site}>{row.title}</option>)}</AppearanceSelect></label>}
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    {notice && <p ref={noticeRef} role="status" data-qa="website-setup-notice">{notice}</p>}
    {!site ? <section className="space-y-4" aria-label={t("staff.website.setup.chooseWebsite")}>
      {gallery && recipe === gallery && <GalleryChoiceNote label={context.catalog.find((row) => row.key === gallery)?.label || gallery} />}
      {context.sites.length > 0 && <div><h2>{t("staff.website.setup.resumeHeading")}</h2>{context.sites.map((row) => <button key={row.site} className={button} onClick={() => adopt(row)}>{fill(t("staff.website.setup.resumeSite"), row.title)}</button>)}</div>}
      {!context.owners.length && <p>{withLink(t("staff.website.setup.completeProfile"), <Link to="/onboarding">{t("staff.website.setup.appointmentSetup")}</Link>)}</p>}
      <label className="block">{t("staff.team.business")}<AppearanceSelect aria-label={t("staff.team.business")} value={owner} onChange={(event) => setOwner(event.target.value)}>{context.owners.map((row) => <option key={row.name} value={row.name}>{row.label}</option>)}</AppearanceSelect></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label>{t("staff.website.setup.businessFocus")}<AppearanceSelect aria-label={t("staff.website.setup.businessFocus")} value={industry} onChange={(event) => { setIndustry(event.target.value); rerank(); }}><option value="">{t("staff.website.setup.any")}</option>{Object.keys(industryKeys).map((value) => <option key={value} value={value}>{t(industryKeys[value])}</option>)}</AppearanceSelect></label>
        <label>{t("staff.website.setup.feeling")}<AppearanceSelect aria-label={t("staff.website.setup.feeling")} value={mood} onChange={(event) => { setMood(event.target.value); rerank(); }}><option value="">{t("staff.website.setup.any")}</option>{["warm", "bold", "editorial", "friendly", "calm"].map((value) => <option key={value} value={value}>{t(moodKeys[value])}</option>)}</AppearanceSelect></label>
        <label>{t("staff.website.setup.primaryAudience")}<AppearanceSelect aria-label={t("staff.website.setup.primaryAudience")} value={audience} onChange={(event) => { setAudience(event.target.value); rerank(); }}><option value="">{t("staff.website.setup.any")}</option>{["clients", "learners", "patients"].map((value) => <option key={value} value={value}>{t(audienceKeys[value])}</option>)}</AppearanceSelect></label>
        <label>{t("staff.website.setup.contentDensity")}<AppearanceSelect aria-label={t("staff.website.setup.contentDensity")} value={density} onChange={(event) => { setDensity(event.target.value); rerank(); }}><option value="">{t("staff.website.setup.any")}</option>{["comfortable", "spacious", "expressive"].map((value) => <option key={value} value={value}>{t(densityKeys[value])}</option>)}</AppearanceSelect></label>
        <label>{t("staff.website.setup.mainAction")}<AppearanceSelect aria-label={t("staff.website.setup.mainAction")} value={mainAction} onChange={event => setMainAction(event.target.value)}><option value="booking">{t("staff.website.setup.bookAppointment")}</option><option value="contact">{t("staff.website.setup.contactBusiness")}</option></AppearanceSelect></label>
      </div>
      <fieldset><legend>{t("staff.website.setup.recommendedTemplates")}</legend><div className="grid gap-3 md:grid-cols-3">{choiceFirst(context.catalog, gallery).map((row) => <label key={row.key} className={`rounded-xl border p-4 ${row.key === gallery ? "border-primary ring-2 ring-primary/30" : ""}`} data-qa={`website-template-${row.key}`} data-selected={recipe === row.key || undefined}><img src={row.thumbnail} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" /><input type="radio" name="recipe" checked={recipe === row.key} onChange={() => setRecipe(row.key)} /> <strong>{row.label}</strong>{row.key === gallery && <GalleryBadge />}<p>{row.audience}</p><p>{row.mood}</p><p>{fill(t("staff.website.setup.fontPairingValue"), row.fontPairing)}</p>{row.rankingReasons.length > 0 && <p>{fill(t("staff.website.setup.matches"), row.rankingReasons.join(", "))}</p>}</label>)}</div></fieldset>
      <button className={button} data-qa="website-preview-template" disabled={busy || !owner || !recipe} onClick={() => void run(async () => {
        const selected = context.owners.find((row) => row.name === owner);
        if (selected) setSnapshot(await callMethod<PublishedSnapshot>(api + "preview_website_template", { owner_type: selected.type, owner, recipe_key: recipe, preferences }));
      })}>{t("staff.website.setup.previewTemplate")}</button>
      <label className="block">{t("staff.website.setup.websiteName")}<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="block">{t("staff.website.setup.websiteAddress")}<input className={field} data-qa="website-address" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="your-business" /></label>
      <button className={button} data-qa="website-create-draft" disabled={busy || !owner || !title || !slug || !recipe} onClick={() => void run(async () => {
        const selected = context.owners.find((row) => row.name === owner);
        if (!selected) return;
        adopt(await callMethod<Website>(api + "start_website_setup", { owner_type: selected.type, owner, title, slug, recipe_key: recipe, preferences }));
        if (gallery) clearGalleryLink();
      })}>{t("staff.website.setup.createDraft")}</button>
    </section> : <>
      {!switchOffer && site.recipeVersion && site.latestRecipeVersion && site.recipeVersion < site.latestRecipeVersion ? <div role="status" data-qa="website-template-upgrade" className="rounded-lg border p-4"><strong>{t("staff.website.setup.upgradeTitle")}</strong><p className="text-sm text-muted-foreground">{t("staff.website.setup.upgradeBody")}</p><button className={button} disabled={busy} data-qa="website-template-upgrade-button" onClick={() => void switchTemplate(site.recipeKey)}>{t("staff.website.setup.upgradeAction")}</button></div> : null}
      {switchOffer && <TemplateSwitchPanel catalog={context.catalog} current={site.recipeKey} chosen={switchOffer} busy={busy} onSwitch={switchTemplate} onKeep={() => { setSwitchOffer(""); clearGalleryLink(); }} />}
      <nav aria-label={t("staff.website.setup.stepsLabel")} className="flex flex-wrap gap-3">{steps.map((value) => <button key={value} className={button} data-qa={`website-step-${value}`} aria-current={step === value ? "step" : undefined} disabled={busy} onClick={() => void run(() => save(value))}>{t(stepKeys[value])}</button>)}</nav>
      <p className="website-setup-status">{site.status} · <a href={site.url}>{site.url}</a> · {site.recipeKey}</p>
      {step === "content" && site.editorSchema ? <ContentStep sections={sections} stored={site.sections} schemas={site.editorSchema} snapshot={snapshot} focus={contentFocus}
        context={{ site: site.site, limits: site.mediaLimits || { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] }, derived: site.derivedFormats || {} }}
        dirty={JSON.stringify(savedSections(sections)) !== JSON.stringify(savedSections(site.sections))} fullPreview={fullPreview}
        onClosePreview={() => setFullPreview(false)} onChange={setSections} /> : <div className={step === "brand" ? "appearance-workspace" : ""}><section className={step === "brand" ? "appearance-controls space-y-4" : "space-y-4"}>
        {step === "brand" && <><div className="appearance-template"><img src={context.catalog.find(row => row.key === site.recipeKey)?.thumbnail} alt=""/><div><strong>{context.catalog.find(row => row.key === site.recipeKey)?.label || site.recipeKey}</strong><p>{t("staff.website.setup.selectedTemplate")}</p></div></div><label className="block">{t("staff.website.setup.websiteName")}<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block">{t("staff.website.setup.websiteNameAm")}<input className={field} lang="am" data-qa="website-name-am" value={titleAm} onChange={(event) => setTitleAm(event.target.value)} /><span className="mt-1 block text-sm text-muted-foreground">{t("staff.website.setup.websiteNameAmHelp")}</span></label><AppearanceCards options={site.appearanceOptions} palette={palette} font={font} disabled={busy} onPalette={key => { setPalette(key); setAccent(""); setResetUndo(null); }} onFont={key => { setFont(key); setResetUndo(null); }} onReset={() => { setResetUndo({ palette, font, accent }); setPalette("default"); setFont("default"); setAccent(""); }} onUndo={resetUndo ? () => { setPalette(resetUndo.palette); setFont(resetUndo.font); setAccent(resetUndo.accent); setResetUndo(null); } : undefined}/><label className="block">{t("staff.website.setup.accentColor")}<input className={field} value={accent} onChange={(event) => setAccent(event.target.value)} placeholder="#26765b" /></label><label className="block">{t("staff.publicExperience.density")}<AppearanceSelect aria-label={t("staff.publicExperience.density")} value={presentationDensity} onChange={(event) => setPresentationDensity(event.target.value)}><option value="comfortable">{t("staff.publicExperience.densityComfortable")}</option><option value="spacious">{t("staff.publicExperience.densitySpacious")}</option></AppearanceSelect></label>{site.appearanceOptions.motion?.length ? <label className="block">{t("staff.website.setup.motion")}<AppearanceSelect aria-label={t("staff.website.setup.motion")} value={motion || "standard"} onChange={(event) => setMotion(event.target.value)}>{site.appearanceOptions.motion.map((value) => <option key={value} value={value}>{t(`staff.website.setup.motionLevel.${value}`)}</option>)}</AppearanceSelect><span className="mt-1 block text-sm text-muted-foreground">{t("staff.website.setup.motionHelp")}</span></label> : null}<p>{t("staff.website.setup.templateNote")}</p>
          <details className="appearance-identity"><summary>{t("staff.website.setup.logoFavicon")}</summary><fieldset className="space-y-3 rounded-xl border p-4"><legend className="sr-only">{t("staff.website.setup.logoFavicon")}</legend>
            <label className="block">{t("staff.website.setup.identityType")}<AppearanceSelect aria-label={t("staff.website.setup.identityType")} value={identityKind} onChange={(event) => setIdentityKind(event.target.value)}><option value="logo_primary">{t(identityKeys.logo_primary)}</option><option value="logo_compact">{t(identityKeys.logo_compact)}</option><option value="favicon">{t(identityKeys.favicon)}</option></AppearanceSelect></label>
            <label className="block">{t("staff.website.setup.identityImage")}<input ref={identityInput} className={field} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setIdentityFile(event.target.files?.[0] || null); setImageConsent(false); }} /></label>
            <AppearanceCheckbox checked={imageConsent} onChange={setImageConsent}>{t("staff.website.setup.identityConsent")}</AppearanceCheckbox>
            <button className={button} disabled={busy || !identityFile || !imageConsent} onClick={() => void run(async () => {
              if (!identityFile || identityFile.size > 5 * 1024 * 1024) throw new Error(t("staff.website.setup.imageTooLarge"));
              const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error(t("staff.website.setup.imageUnreadable"))); reader.readAsDataURL(identityFile); });
              const saved = await save("brand");
              if (!saved) return;
              adopt(await callMethod<Website>(api + "upload_website_identity", { site: saved.site, expected_version: saved.draftVersion, kind: identityKind, content_base64: encoded, public_consent: 1 }));
              setIdentityFile(null); setImageConsent(false);
              if (identityInput.current) identityInput.current.value = "";
              setNotice(t("staff.website.setup.identitySaved"));
            })}>{t("staff.website.setup.uploadIdentity")}</button>
            {Object.entries(site.identityAssets || {}).filter(([, url]) => url).map(([kind, url]) => <figure key={kind}><img src={url || undefined} alt={fill(t("staff.website.setup.identityPreviewAlt"), identityKeys[kind] ? t(identityKeys[kind]) : kind.replace(/_/g, " "))} className="h-16 w-16 object-contain" /><figcaption>{identityKeys[kind] ? t(identityKeys[kind]) : kind.replace(/_/g, " ")}</figcaption></figure>)}
          </fieldset></details></>}
        {step === "features" && <fieldset><legend>{t("staff.website.setup.websiteFeatures")}</legend>{["blog", "gallery", "newsletter"].map((value) => <AppearanceCheckbox key={value} checked={features.includes(value)} disabled={!site.capabilities.some((row) => row.capability === value && row.active)} onChange={(checked) => setFeatures((current) => checked ? [...current, value] : current.filter((item) => item !== value))}>{t(featureKeys[value])}</AppearanceCheckbox>)}<p>{t("staff.website.setup.newsletterNote")}</p><Link to="/settings/website/newsletter">{t("staff.website.setup.manageNewsletter")}</Link><AppearanceCheckbox checked={liveAvailability} onChange={setLiveAvailability} qa="website-setup-live-availability">{t("staff.website.setup.liveAvailability")}</AppearanceCheckbox><p>{t("staff.website.setup.liveAvailabilityHelp")}</p><AppearanceCheckbox checked={holidayGreetings} onChange={setHolidayGreetings} qa="website-setup-holiday-greetings">{t("staff.website.setup.holidayGreetings")}</AppearanceCheckbox><p>{t("staff.website.setup.holidayGreetingsHelp")}</p></fieldset>}
        {(step === "readiness" || step === "published") && <><button className={button} disabled={busy} onClick={() => void run(async () => {
          const result = await callMethod<{ checks: typeof readiness }>(api + "website_setup_readiness", { site: site.site, expected_version: site.draftVersion }); setReadiness(result.checks);
        })}>{t("staff.publicExperience.checkReadiness")}</button><ul>{readiness.map((row) => <li key={row.check}>{row.ok ? t("staff.website.setup.ready") : t("staff.manage.validation.warning")}: {row.check.replace(/_/g, " ")} {row.remediation}</li>)}</ul><button className={button} data-qa="website-publish" disabled={busy} onClick={() => void run(async () => { adopt(await callMethod<Website>(api + "publish_website_setup", { site: site.site, expected_version: site.draftVersion })); setNotice(t("staff.website.setup.published")); })}>{t("staff.publicExperience.publishRelease")}</button></>}
      </section>{step === "brand" && <AppearancePreview snapshot={snapshot} fullScreen={fullPreview} onClose={() => setFullPreview(false)} dirty={palette !== (site.brandInputs.paletteChoice || site.brandInputs.palette_choice || "default") || font !== (site.brandInputs.fontChoice || site.brandInputs.font_choice || "default") || accent !== (site.brandInputs.accentColor || site.brandInputs.accent_color || "") || title !== site.title || presentationDensity !== (site.brandInputs.presentationDensity || site.brandInputs.presentation_density || "comfortable")}/>}</div>}
      <div className="appearance-actions flex flex-wrap gap-3"><button className="appearance-primary" data-qa="website-save-preview" disabled={busy} onClick={() => void run(async () => { const saved = await save(step); if (saved) setSnapshot(await callMethod<PublishedSnapshot>(api + "preview_website_setup", { site: saved.site, expected_version: saved.draftVersion })); })}>{t("staff.website.setup.savePreview")}</button><button className="appearance-mobile-preview" data-qa="website-open-preview" disabled={!snapshot} onClick={() => setFullPreview(true)}>{t("staff.website.setup.openPreview")}</button><button className={button} disabled={busy} onClick={() => void run(() => save(step))}>{t("staff.publicExperience.saveDraft")}</button><button className={button} disabled={busy} onClick={() => void run(async () => { await save(step); navigate("/home"); })}>{t("staff.website.setup.saveReturn")}</button><Link className={button} to="/settings/public-experience">{t("staff.website.setup.historyLink")}</Link></div>
    </>}
    {snapshot && (!site || (step !== "brand" && step !== "content")) && <div data-qa="website-setup-preview" data-recipe={snapshot.recipeKey}><WebsitePreview snapshot={snapshot} /></div>}
  </div></StaffShell>;
}

/** The first changed section that the server would refuse, so the owner fixes it before saving. */
function changedIssues(site: Website, sections: Section[]): string | undefined {
  if (!site.editorSchema) return undefined;
  const stored = new Map(savedSections(site.sections).map((row) => [row.type, JSON.stringify(row.content)]));
  const changed = savedSections(sections).filter((row) => stored.get(row.type) !== JSON.stringify(row.content));
  return Object.keys(draftIssues(changed, site.editorSchema, site.sections))[0];
}
