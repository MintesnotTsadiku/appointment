import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";
import WebsiteGallery from "./website-gallery";
import { WebsitePreview } from "./website-preview";
import type { ContentDetail } from "@/public-experience/contentContract";
import type { PublishedSnapshot } from "@/public-experience/types";

interface Site { name: string; site_title: string; slug: string }
interface Draft { name: string; source_doctype: string; source_name: string; title: string; status: string; last_release?: string }
interface Article { ownership: string; title: string; body: string; summary: string; modified: string; type: string }
interface Release { name: string; route: string; status: string; published_at: string }
const api = "appointment.content.api.";
const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";

export default function WebsiteContent() {
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PublishedSnapshot | null>(null);

  useEffect(() => {
    callGet<{ sites: Site[] }>("appointment.public_experience.api.list_public_sites").then((result) => {
      setSites(result.sites); setSite(result.sites[0]?.name || "");
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  const refresh = useCallback(async () => {
    if (!site) return;
    const [owned, history] = await Promise.all([
      callGet<{ items: Draft[] }>(api + "list_owned_content", { public_site: site }),
      callGet<{ releases: Release[] }>(api + "list_releases", { public_site: site }),
    ]);
    setDrafts(owned.items); setReleases(history.releases);
  }, [site]);

  useEffect(() => {
    setArticle(null); setTitle(""); setSlug(""); setBody(""); setSummary("");
    void refresh().catch((reason: Error) => setError(reason.message));
  }, [site, refresh]);

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update your content."); }
    finally { setBusy(false); }
  }

  function adopt(next: Article) {
    setArticle(next); setTitle(next.title); setBody(next.body); setSummary(next.summary); setPreview(null);
  }

  const root = sites.find((row) => row.name === site)?.slug;
  return <main className="mx-auto max-w-5xl space-y-6 p-6" data-page="website-content">
    <header><h1 className="text-3xl font-semibold">Website content</h1><p>Save drafts, review them, then publish a version for your visitors.</p><Link to="/settings/website">Website setup</Link> · <Link to="/settings/website/newsletter">Newsletters and audience</Link></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label className="block">Website<select disabled={busy} aria-label="Website" className={field} value={site} onChange={(event) => setSite(event.target.value)}>{sites.map((row) => <option key={row.name} value={row.name}>{row.site_title}</option>)}</select></label>
    {!sites.length && <p>Create your website in <Link to="/settings/website">Website setup</Link>.</p>}
    <section aria-label="Content drafts"><h2>Drafts</h2>{drafts.length ? drafts.map((row) => <div className="flex gap-3 border-b py-3" key={row.name}><span>{row.title} · {row.status}</span>{row.source_doctype === "Blog Post" && <button className={button} disabled={busy} onClick={() => void run(async () => { adopt(await callGet<Article>(api + "get_content_draft", { ownership: row.name })); })}>Edit article {row.title}</button>}</div>) : <p>No drafts yet.</p>}</section>
    <section className="space-y-3" aria-label="Article editor" aria-busy={busy}><h2>{article ? "Edit article" : "New article"}</h2>
      <label className="block">Article title<input disabled={busy} className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      {!article && <label className="block">Article address<input disabled={busy} className={field} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="preparing-for-your-visit" /></label>}
      <label className="block">Summary<textarea aria-label="Summary" disabled={busy} className={field} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      <label className="block">Article text<textarea aria-label="Article text" disabled={busy} className={field} rows={12} value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <p>You can use simple Markdown headings, emphasis, and lists.</p>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !site || !title || !body || (!article && !slug)} onClick={() => void run(async () => {
        if (article) adopt(await callMethod<Article>(api + "save_article_draft", { ownership: article.ownership, expected_modified: article.modified, title, body, summary }));
        else { const result = await callMethod<{ ownership: string }>(api + "create_article", { public_site: site, title, slug, body, summary }); adopt(await callGet<Article>(api + "get_content_draft", { ownership: result.ownership })); }
        setNotice("Article draft saved.");
      })}>Save article draft</button>
      {article && <><button className={button} disabled={busy} onClick={() => void run(async () => {
        const result = await callMethod<{ detail: ContentDetail }>(api + "preview_article", { ownership: article.ownership });
        const context = await callGet<{ sites: Array<{ site: string; draftVersion: number }> }>("appointment.public_experience.api.website_setup_context");
        const draft = context.sites.find((row) => row.site === site);
        if (!draft) throw new Error("Reload your website before previewing its article.");
        const snapshot = await callMethod<PublishedSnapshot>("appointment.public_experience.api.preview_website_setup", { site, expected_version: draft.draftVersion });
        if (!snapshot.previewContent) throw new Error("This website preview is unavailable. Reload before retrying.");
        setPreview({ ...snapshot, previewContent: { ...snapshot.previewContent, article: result.detail } });
      })}>Preview saved article</button><button className={button} disabled={busy} onClick={() => void run(async () => {
        await callMethod(api + "publish_article", { ownership: article.ownership, expected_modified: article.modified }); setNotice("Article published.");
      })}>Publish article</button><button className={button} disabled={busy} onClick={() => { setArticle(null); setTitle(""); setSlug(""); setBody(""); setSummary(""); }}>New article</button></>}
      </div>{preview && <section aria-label="Article preview"><h3>Saved article preview</h3><WebsitePreview snapshot={preview} initialSurface="article" savedArticle /></section>}
    </section>
    {site && <WebsiteGallery key={site} site={site} onSaved={refresh} />}
    <section aria-label="Publication history"><h2>Publication history</h2>{releases.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 border-b py-3"><a href={`/${root}${row.route}`}>{row.route}</a><span>{row.status} · <time dateTime={row.published_at}>{row.published_at}</time></span><button className={button} disabled={busy || row.status !== "Active"} onClick={() => void run(async () => { await callMethod(api + "withdraw_release", { release: row.name }); setNotice("Publication withdrawn."); })}>Withdraw {row.route}</button><button className={button} disabled={busy || row.status === "Active"} onClick={() => void run(async () => { await callMethod(api + "rollback_release", { release: row.name }); setNotice("Previous publication restored."); })}>Restore {row.route}</button></div>)}</section>
  </main>;
}
