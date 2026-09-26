import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";
import { buildThemeAttributes } from "@/public-experience/firstPaint";
import { getFallbackPublicUIConfig } from "@/public-experience/tokens";
import { getTemplatePackage } from "@/public-experience/templates/registry";
import type { PublishedSnapshot } from "@/public-experience/types";

interface Owner { type: string; name: string; label: string }
interface Recipe { key: string; label: string; audience: string; mood: string; score: number; industry: string; thumbnail: string }
interface Section { type: string; content: Record<string, unknown> }
interface Website {
  site: string; title: string; slug: string; recipeKey: string; draftVersion: number; url: string;
  setup: { step?: string; features?: string[] }; status: string; sections: Section[];
  brandInputs: Record<string, string>;
  capabilities: Array<{ capability: string; active: boolean }>;
}
interface Context { owners: Owner[]; catalog: Recipe[]; sites: Website[] }

const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";
const steps = ["brand", "content", "features", "readiness"];
const api = "appointment.public_experience.api.";

export default function WebsiteSetup() {
  const navigate = useNavigate();
  const [context, setContext] = useState<Context>({ owners: [], catalog: [], sites: [] });
  const [owner, setOwner] = useState("");
  const [industry, setIndustry] = useState("");
  const [mood, setMood] = useState("");
  const [recipe, setRecipe] = useState("");
  const [site, setSite] = useState<Website | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [accent, setAccent] = useState("");
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [mobile, setMobile] = useState(false);
  const [surface, setSurface] = useState("landing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [readiness, setReadiness] = useState<Array<{ check: string; ok: boolean; remediation: string }>>([]);

  function adopt(next: Website) {
    setSite(next); setTitle(next.title); setSlug(next.slug); setSections(next.sections);
    setFeatures(next.setup.features || []); setAccent(next.brandInputs.accentColor || "");
  }

  useEffect(() => {
    let active = true;
    callGet<Context>(api + "website_setup_context", { industry, mood }).then((result) => {
      if (!active) return;
      setContext(result);
      setOwner((value) => value || result.owners[0]?.name || "");
      setRecipe((value) => value || result.catalog[0]?.key || "");
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [industry, mood]);

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save your website."); }
    finally { setBusy(false); }
  }

  async function save(step: string) {
    if (!site) return;
    const next = await callMethod<Website>(api + "save_website_setup", {
      site: site.site, expected_version: site.draftVersion, step, title, sections, features,
      brand_inputs: { ...site.brandInputs, ...(accent ? { accentColor: accent } : {}) },
    });
    adopt(next); setSnapshot(null); setNotice("Your website draft is saved. You can return at any time.");
  }

  function editText(index: number, key: string, value: string) {
    setSections((rows) => rows.map((row, current) => current === index
      ? { ...row, content: { ...row.content, [key]: { en: value } } } : row));
  }

  const step = site?.setup.step || "brand";
  const template = snapshot && getTemplatePackage(snapshot.compiledDesign.layout.rendererKey);
  const theme = snapshot && buildThemeAttributes({ ...getFallbackPublicUIConfig("en"), compiledDesign: snapshot.compiledDesign }, mode, false);

  return <main className="mx-auto max-w-6xl space-y-6 p-6" data-page="website-setup">
    <header><h1 className="text-3xl font-semibold">Website setup</h1><p>Create your public website when you are ready. Your appointment setup remains available.</p><Link to="/settings/website/content">Articles and publication history</Link></header>
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <Link to="/home" className={button}>Set up my website later</Link>
    {!site ? <section className="space-y-4" aria-label="Choose your website">
      {context.sites.length > 0 && <div><h2>Resume a website</h2>{context.sites.map((row) => <button key={row.site} className={button} onClick={() => adopt(row)}>Resume {row.title}</button>)}</div>}
      {!context.owners.length && <p>Complete your business profile in <Link to="/onboarding">appointment setup</Link> first.</p>}
      <label className="block">Business<select className={field} value={owner} onChange={(event) => setOwner(event.target.value)}>{context.owners.map((row) => <option key={row.name} value={row.name}>{row.label}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label>Business focus<select className={field} value={industry} onChange={(event) => { setIndustry(event.target.value); setRecipe(""); }}><option value="">Any</option>{["wellness", "beauty", "creative", "education", "health"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Feeling<select className={field} value={mood} onChange={(event) => { setMood(event.target.value); setRecipe(""); }}><option value="">Any</option>{["warm", "bold", "editorial", "friendly", "calm"].map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <fieldset><legend>Recommended templates</legend><div className="grid gap-3 md:grid-cols-3">{context.catalog.map((row) => <label key={row.key} className="rounded-xl border p-4"><img src={row.thumbnail} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" /><input type="radio" name="recipe" checked={recipe === row.key} onChange={() => setRecipe(row.key)} /> <strong>{row.label}</strong><p>{row.audience}</p><p>{row.mood}</p></label>)}</div></fieldset>
      <button className={button} disabled={busy || !owner || !recipe} onClick={() => void run(async () => {
        const selected = context.owners.find((row) => row.name === owner);
        if (selected) setSnapshot(await callMethod<PublishedSnapshot>(api + "preview_website_template", { owner_type: selected.type, owner, recipe_key: recipe }));
      })}>Preview selected template</button>
      <label className="block">Website name<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="block">Website address<input className={field} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="your-business" /></label>
      <button className={button} disabled={busy || !owner || !title || !slug || !recipe} onClick={() => void run(async () => {
        const selected = context.owners.find((row) => row.name === owner);
        if (!selected) return;
        adopt(await callMethod<Website>(api + "start_website_setup", { owner_type: selected.type, owner, title, slug, recipe_key: recipe }));
      })}>Create website draft</button>
    </section> : <>
      <nav aria-label="Website setup steps" className="flex flex-wrap gap-3">{steps.map((value) => <button key={value} className={button} aria-current={step === value ? "step" : undefined} disabled={busy} onClick={() => void run(() => save(value))}>{value}</button>)}</nav>
      <p>{site.status} · <a href={site.url}>{site.url}</a> · {site.recipeKey}</p>
      <section className="space-y-4">
        {step === "brand" && <><label className="block">Website name<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block">Accent color (optional)<input className={field} value={accent} onChange={(event) => setAccent(event.target.value)} placeholder="#26765b" /></label><p>Your template protects readable text, focus indicators, and booking controls.</p></>}
        {step === "content" && sections.map((row, index) => <fieldset key={row.type} className="space-y-3 rounded-xl border p-4"><legend>{row.type.replace(/_/g, " ")}</legend>{["title", "subtitle", "body"].filter((key) => row.content[key]).map((key) => <label className="block" key={key}>{key}<textarea className={field} value={String((row.content[key] as Record<string, string>)?.en || "")} onChange={(event) => editText(index, key, event.target.value)} /></label>)}{Array.isArray(row.content.items) && <p>{row.content.items.length} items from your business profile. Add factual details before publication.</p>}</fieldset>)}
        {step === "features" && <fieldset><legend>Website features</legend>{["blog", "gallery", "newsletter"].map((value) => <label key={value} className="block p-2"><input type="checkbox" checked={features.includes(value)} disabled={!site.capabilities.some((row) => row.capability === value && row.active)} onChange={(event) => setFeatures((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} /> {value}</label>)}</fieldset>}
        {(step === "readiness" || step === "published") && <><button className={button} disabled={busy} onClick={() => void run(async () => {
          const result = await callMethod<{ checks: typeof readiness }>(api + "website_setup_readiness", { site: site.site, expected_version: site.draftVersion }); setReadiness(result.checks);
        })}>Check readiness</button><ul>{readiness.map((row) => <li key={row.check}>{row.ok ? "Ready" : "Needs attention"}: {row.check.replace(/_/g, " ")} {row.remediation}</li>)}</ul><button className={button} disabled={busy} onClick={() => void run(async () => { adopt(await callMethod<Website>(api + "publish_website_setup", { site: site.site, expected_version: site.draftVersion })); setNotice("Your website is published."); })}>Publish website</button></>}
      </section>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={() => void run(() => save(step))}>Save draft</button><button className={button} disabled={busy} onClick={() => void run(async () => { await save(step); navigate("/home"); })}>Save and return later</button><button className={button} disabled={busy} onClick={() => void run(async () => { setSnapshot(await callMethod<PublishedSnapshot>(api + "preview_website_setup", { site: site.site, expected_version: site.draftVersion })); })}>Live preview of saved draft</button><Link className={button} to="/settings/public-experience">Publication history and brand settings</Link></div>
    </>}
    {snapshot && template && theme && <section aria-label="Website live preview"><div className="flex flex-wrap gap-3"><button className={button} onClick={() => setMode(mode === "light" ? "dark" : "light")}>Preview {mode === "light" ? "dark" : "light"} mode</button><button className={button} onClick={() => setMobile(!mobile)}>Preview {mobile ? "desktop" : "mobile"}</button><label>Surface<select className={field} value={surface} onChange={(event) => setSurface(event.target.value)}><option value="landing">Landing page</option><option value="booking">Booking handoff</option></select></label></div><div className="mx-auto mt-4 overflow-auto border" style={{ maxWidth: mobile ? 390 : undefined, maxHeight: 750 }}>{surface === "landing" ? <template.Site snapshot={snapshot} locale="en" applicationName={snapshot.compiledDesign.identity.applicationName} publicRoot={site?.url || "/website-preview"} mode={mode} toggleMode={() => setMode(mode === "light" ? "dark" : "light")} rootStyle={theme.variables as CSSProperties} /> : <template.Booking snapshot={snapshot} locale="en" applicationName={snapshot.compiledDesign.identity.applicationName} publicRoot={site?.url || "/website-preview"} mode={mode} toggleMode={() => setMode(mode === "light" ? "dark" : "light")} rootStyle={theme.variables as CSSProperties} bookingPath={null} />}</div></section>}
  </main>;
}
