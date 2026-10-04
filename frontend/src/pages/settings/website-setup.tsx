import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";
import type { PublishedSnapshot } from "@/public-experience/types";
import { AppearancePreview } from "./appearance/AppearancePreview";
import { AppearanceCards, type AppearanceOptions } from "./appearance/AppearanceCards";
import { AppearanceCheckbox } from "./appearance/AppearanceCheckbox";
import { AppearanceSelect } from "./appearance/AppearanceSelect";
import { WebsitePreview } from "./website-preview";
import { StaffShell } from '@/components/staff-shell';

interface Owner { type: string; name: string; label: string }
interface Recipe { key: string; label: string; audience: string; mood: string; score: number; industry: string; thumbnail: string; rankingReasons: string[]; fontPairing: string }
interface Section { type: string; content: Record<string, unknown> }
interface Website {
  owner: string; site: string; title: string; slug: string; recipeKey: string; draftVersion: number; url: string;
  setup: { step?: string; features?: string[]; preferences?: Record<string, string> }; status: string; sections: Section[];
  brandInputs: Record<string, string>;
  appearanceOptions: AppearanceOptions;
  identityAssets: Record<string, string | null>;
  capabilities: Array<{ capability: string; active: boolean }>;
}
interface Context { selectedOwner?: string; owners: Owner[]; catalog: Recipe[]; sites: Website[] }

const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";
const steps = ["brand", "content", "features", "readiness"];
const api = "appointment.public_experience.api.";

export default function WebsiteSetup() {
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
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [palette, setPalette] = useState("default");
  const [font, setFont] = useState("default");
  const [resetUndo, setResetUndo] = useState<{palette:string;font:string;accent:string} | null>(null);
  const [fullPreview, setFullPreview] = useState(false);
  const [accent, setAccent] = useState("");
  const [presentationDensity, setPresentationDensity] = useState("comfortable");
  const [identityKind, setIdentityKind] = useState("logo_primary");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [imageConsent, setImageConsent] = useState(false);
  const identityInput = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [readiness, setReadiness] = useState<Array<{ check: string; ok: boolean; remediation: string }>>([]);

  function adopt(next: Website) {
    setResetUndo(null);
    setSite(next); setTitle(next.title); setSlug(next.slug); setSections(next.sections);
    setPalette(next.brandInputs.paletteChoice || next.brandInputs.palette_choice || "default");
    setFont(next.brandInputs.fontChoice || next.brandInputs.font_choice || "default");
    setFeatures(next.setup.features || []); setAccent(next.brandInputs.accentColor || next.brandInputs.accent_color || "");
    setPresentationDensity(next.brandInputs.presentationDensity || next.brandInputs.presentation_density || "comfortable");
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
    const timer = window.setTimeout(() => callMethod<PublishedSnapshot>(api + "preview_website_setup", { site: previewSite, expected_version: previewVersion, brand_inputs: { paletteChoice: palette, fontChoice: font, accentColor: accent || null, presentationDensity } })
      .then(next => { if (active) setSnapshot(next); })
      .catch((reason: Error) => { if (active) setError(reason.message); }), 150);
    return () => { active = false; window.clearTimeout(timer); };
  }, [previewSite, previewVersion, palette, font, accent, presentationDensity]);

  async function run(operation: () => Promise<unknown>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save your website."); }
    finally { setBusy(false); }
  }

  async function save(step: string) {
    if (!site) return;
    const next = await callMethod<Website>(api + "save_website_setup", {
      site: site.site, expected_version: site.draftVersion, step, title, sections, features,
      brand_inputs: { ...site.brandInputs, presentationDensity, palette_choice: undefined, font_choice: undefined, paletteChoice: palette, fontChoice: font, accentColor: accent || undefined, accent_color: undefined },
    });
    adopt(next); setSnapshot(null); setNotice("Your website draft is saved. You can return at any time.");
    return next;
  }

  function editText(index: number, key: string, value: string) {
    setSections((rows) => rows.map((row, current) => current === index
      ? { ...row, content: { ...row.content, [key]: { en: value } } } : row));
  }

  const step = site?.setup.step || "brand";
  const preferences = { industry, mood, audience, density, main_action: mainAction };

  return <StaffShell width="full"><div className="mx-auto max-w-[1600px] space-y-6 p-6" data-page="website-setup">
    <header className="website-setup-header"><div><h1 className="text-3xl font-semibold">Website setup</h1><p>Create your public website when you are ready. Your appointment setup remains available.</p></div><div className="website-setup-links"><button className="underline" disabled={!site || busy} onClick={() => void run(() => save("content"))}>Page content</button> · <Link to="/settings/website/content">Articles & gallery</Link><Link to="/home" className={button}>Back to workspace</Link></div></header>
    {site && context.owners.length > 1 && <label>Business<AppearanceSelect aria-label="Business" value={site.owner} onChange={event => { const next = context.sites.find(row => row.owner === event.target.value); setOwner(event.target.value); setSnapshot(null); if (next) adopt({ ...next, setup: { ...next.setup, step: "brand" } }); else { setSite(null); setTitle(""); setSlug(""); } }}>{context.owners.map(row => <option key={row.name} value={row.name}>{row.label}</option>)}</AppearanceSelect></label>}
    {site && context.sites.length > 1 && <label>Website<AppearanceSelect aria-label="Website" value={site.site} onChange={event => { const next = context.sites.find(row => row.site === event.target.value); if (next) adopt({ ...next, setup: { ...next.setup, step: "brand" } }); }}>{context.sites.map(row => <option key={row.site} value={row.site}>{row.title}</option>)}</AppearanceSelect></label>}
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!site ? <section className="space-y-4" aria-label="Choose your website">
      {context.sites.length > 0 && <div><h2>Resume a website</h2>{context.sites.map((row) => <button key={row.site} className={button} onClick={() => adopt(row)}>Resume {row.title}</button>)}</div>}
      {!context.owners.length && <p>Complete your business profile in <Link to="/onboarding">appointment setup</Link> first.</p>}
      <label className="block">Business<AppearanceSelect aria-label="Business" value={owner} onChange={(event) => setOwner(event.target.value)}>{context.owners.map((row) => <option key={row.name} value={row.name}>{row.label}</option>)}</AppearanceSelect></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label>Business focus<AppearanceSelect aria-label="Business focus" value={industry} onChange={(event) => { setIndustry(event.target.value); setRecipe(""); }}><option value="">Any</option>{["wellness", "beauty", "creative", "education", "health"].map((value) => <option key={value}>{value}</option>)}</AppearanceSelect></label>
        <label>Feeling<AppearanceSelect aria-label="Feeling" value={mood} onChange={(event) => { setMood(event.target.value); setRecipe(""); }}><option value="">Any</option>{["warm", "bold", "editorial", "friendly", "calm"].map((value) => <option key={value}>{value}</option>)}</AppearanceSelect></label>
        <label>Primary audience<AppearanceSelect aria-label="Primary audience" value={audience} onChange={(event) => { setAudience(event.target.value); setRecipe(""); }}><option value="">Any</option>{["clients", "learners", "patients"].map((value) => <option key={value}>{value}</option>)}</AppearanceSelect></label>
        <label>Preferred content density<AppearanceSelect aria-label="Preferred content density" value={density} onChange={(event) => { setDensity(event.target.value); setRecipe(""); }}><option value="">Any</option>{["comfortable", "spacious", "expressive"].map((value) => <option key={value}>{value}</option>)}</AppearanceSelect></label>
        <label>Main visitor action<AppearanceSelect aria-label="Main visitor action" value={mainAction} onChange={event => setMainAction(event.target.value)}><option value="booking">Book an appointment</option><option value="contact">Contact the business</option></AppearanceSelect></label>
      </div>
      <fieldset><legend>Recommended templates</legend><div className="grid gap-3 md:grid-cols-3">{context.catalog.map((row) => <label key={row.key} className="rounded-xl border p-4"><img src={row.thumbnail} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" /><input type="radio" name="recipe" checked={recipe === row.key} onChange={() => setRecipe(row.key)} /> <strong>{row.label}</strong><p>{row.audience}</p><p>{row.mood}</p><p>Font pairing: {row.fontPairing}</p>{row.rankingReasons.length > 0 && <p>Matches: {row.rankingReasons.join(", ")}</p>}</label>)}</div></fieldset>
      <button className={button} disabled={busy || !owner || !recipe} onClick={() => void run(async () => {
        const selected = context.owners.find((row) => row.name === owner);
        if (selected) setSnapshot(await callMethod<PublishedSnapshot>(api + "preview_website_template", { owner_type: selected.type, owner, recipe_key: recipe, preferences }));
      })}>Preview selected template</button>
      <label className="block">Website name<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="block">Website address<input className={field} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="your-business" /></label>
      <button className={button} disabled={busy || !owner || !title || !slug || !recipe} onClick={() => void run(async () => {
        const selected = context.owners.find((row) => row.name === owner);
        if (!selected) return;
        adopt(await callMethod<Website>(api + "start_website_setup", { owner_type: selected.type, owner, title, slug, recipe_key: recipe, preferences }));
      })}>Create website draft</button>
    </section> : <>
      <nav aria-label="Website setup steps" className="flex flex-wrap gap-3">{steps.map((value) => <button key={value} className={button} aria-current={step === value ? "step" : undefined} disabled={busy} onClick={() => void run(() => save(value))}>{value}</button>)}</nav>
      <p className="website-setup-status">{site.status} · <a href={site.url}>{site.url}</a> · {site.recipeKey}</p>
      <div className={step === "brand" ? "appearance-workspace" : ""}><section className={step === "brand" ? "appearance-controls space-y-4" : "space-y-4"}>
        {step === "brand" && <><div className="appearance-template"><img src={context.catalog.find(row => row.key === site.recipeKey)?.thumbnail} alt=""/><div><strong>{context.catalog.find(row => row.key === site.recipeKey)?.label || site.recipeKey}</strong><p>Selected template · layout retained</p></div></div><label className="block">Website name<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label><AppearanceCards options={site.appearanceOptions} palette={palette} font={font} disabled={busy} onPalette={key => { setPalette(key); setAccent(""); setResetUndo(null); }} onFont={key => { setFont(key); setResetUndo(null); }} onReset={() => { setResetUndo({ palette, font, accent }); setPalette("default"); setFont("default"); setAccent(""); }} onUndo={resetUndo ? () => { setPalette(resetUndo.palette); setFont(resetUndo.font); setAccent(resetUndo.accent); setResetUndo(null); } : undefined}/><label className="block">Accent color (optional)<input className={field} value={accent} onChange={(event) => setAccent(event.target.value)} placeholder="#26765b" /></label><label className="block">Presentation density<AppearanceSelect aria-label="Presentation density" value={presentationDensity} onChange={(event) => setPresentationDensity(event.target.value)}><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></AppearanceSelect></label><p>Your selected template includes an approved font pairing and protects readable text, focus indicators, and booking controls. Default scene images are fictional examples owned by the project.</p>
          <details className="appearance-identity"><summary>Logo and favicon</summary><fieldset className="space-y-3 rounded-xl border p-4"><legend className="sr-only">Logo and favicon</legend>
            <label className="block">Identity image type<AppearanceSelect aria-label="Identity image type" value={identityKind} onChange={(event) => setIdentityKind(event.target.value)}><option value="logo_primary">Primary logo</option><option value="logo_compact">Compact logo</option><option value="favicon">Favicon</option></AppearanceSelect></label>
            <label className="block">Logo or favicon image<input ref={identityInput} className={field} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setIdentityFile(event.target.files?.[0] || null); setImageConsent(false); }} /></label>
            <AppearanceCheckbox checked={imageConsent} onChange={setImageConsent}>I have permission to display this identity image publicly.</AppearanceCheckbox>
            <button className={button} disabled={busy || !identityFile || !imageConsent} onClick={() => void run(async () => {
              if (!identityFile || identityFile.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
              const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("Unable to read this image.")); reader.readAsDataURL(identityFile); });
              const saved = await save("brand");
              if (!saved) return;
              adopt(await callMethod<Website>(api + "upload_website_identity", { site: saved.site, expected_version: saved.draftVersion, kind: identityKind, content_base64: encoded, public_consent: 1 }));
              setIdentityFile(null); setImageConsent(false);
              if (identityInput.current) identityInput.current.value = "";
              setNotice("Your identity image is saved to the website draft.");
            })}>Upload identity image</button>
            {Object.entries(site.identityAssets || {}).filter(([, url]) => url).map(([kind, url]) => <figure key={kind}><img src={url || undefined} alt={`${kind.replace(/_/g, " ")} preview`} className="h-16 w-16 object-contain" /><figcaption>{kind.replace(/_/g, " ")}</figcaption></figure>)}
          </fieldset></details></>}
        {step === "content" && sections.map((row, index) => <fieldset key={row.type} className="space-y-3 rounded-xl border p-4"><legend>{row.type.replace(/_/g, " ")}</legend>{["title", "subtitle", "body"].filter((key) => row.content[key]).map((key) => <label className="block" key={key}>{key}<textarea aria-label={key} className={field} value={String((row.content[key] as Record<string, string>)?.en || "")} onChange={(event) => editText(index, key, event.target.value)} /></label>)}{Array.isArray(row.content.items) && <p>{row.content.items.length} items from your business profile. Add factual details before publication.</p>}</fieldset>)}
        {step === "features" && <fieldset><legend>Website features</legend>{["blog", "gallery", "newsletter"].map((value) => <AppearanceCheckbox key={value} checked={features.includes(value)} disabled={!site.capabilities.some((row) => row.capability === value && row.active)} onChange={(checked) => setFeatures((current) => checked ? [...current, value] : current.filter((item) => item !== value))}>{value}</AppearanceCheckbox>)}<p>Newsletter signup requires consent and confirmation. Campaigns require a verified sender and available audience and sending limits. This development environment captures email locally.</p><Link to="/settings/website/newsletter">Manage newsletter setup</Link></fieldset>}
        {(step === "readiness" || step === "published") && <><button className={button} disabled={busy} onClick={() => void run(async () => {
          const result = await callMethod<{ checks: typeof readiness }>(api + "website_setup_readiness", { site: site.site, expected_version: site.draftVersion }); setReadiness(result.checks);
        })}>Check readiness</button><ul>{readiness.map((row) => <li key={row.check}>{row.ok ? "Ready" : "Needs attention"}: {row.check.replace(/_/g, " ")} {row.remediation}</li>)}</ul><button className={button} disabled={busy} onClick={() => void run(async () => { adopt(await callMethod<Website>(api + "publish_website_setup", { site: site.site, expected_version: site.draftVersion })); setNotice("Your website is published."); })}>Publish website</button></>}
      </section>{step === "brand" && <AppearancePreview snapshot={snapshot} fullScreen={fullPreview} onClose={() => setFullPreview(false)} dirty={palette !== (site.brandInputs.paletteChoice || site.brandInputs.palette_choice || "default") || font !== (site.brandInputs.fontChoice || site.brandInputs.font_choice || "default") || accent !== (site.brandInputs.accentColor || site.brandInputs.accent_color || "") || title !== site.title || presentationDensity !== (site.brandInputs.presentationDensity || site.brandInputs.presentation_density || "comfortable")}/>}</div>
      <div className="appearance-actions flex flex-wrap gap-3"><button className="appearance-primary" disabled={busy} onClick={() => void run(async () => { const saved = await save(step); if (saved) setSnapshot(await callMethod<PublishedSnapshot>(api + "preview_website_setup", { site: saved.site, expected_version: saved.draftVersion })); })}>Save & preview</button><button className="appearance-mobile-preview" disabled={!snapshot} onClick={() => setFullPreview(true)}>Open preview</button><button className={button} disabled={busy} onClick={() => void run(() => save(step))}>Save draft</button><button className={button} disabled={busy} onClick={() => void run(async () => { await save(step); navigate("/home"); })}>Save and return later</button><Link className={button} to="/settings/public-experience">Publication history and brand settings</Link></div>
    </>}
    {snapshot && (!site || step !== "brand") && <WebsitePreview snapshot={snapshot} />}
  </div></StaffShell>;
}
