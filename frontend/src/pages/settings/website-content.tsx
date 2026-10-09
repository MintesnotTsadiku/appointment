import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";
import WebsiteGallery from "./website-gallery";
import { WebsitePreview } from "./website-preview";
import type { ContentDetail } from "@/public-experience/contentContract";
import type { PublishedSnapshot } from "@/public-experience/types";
import { StaffShell } from '@/components/staff-shell';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';

interface Site { name: string; site_title: string; slug: string }
interface Draft { name: string; source_doctype: string; source_name: string; title: string; status: string; last_release?: string }
interface Article { ownership: string; title: string; body: string; summary: string; modified: string; type: string }
interface Release { name: string; route: string; status: string; published_at: string }
const api = "appointment.content.api.";
const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";

/** Place a link where a translated sentence has its {0} placeholder. */
function withLink(text: string, link: ReactNode) {
  const [before, after = ""] = text.split("{0}");
  return <>{before}{link}{after}</>;
}

export default function WebsiteContent() {
  const { t } = useTranslation();
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
    catch (reason) { setError(reason instanceof Error ? reason.message : t("staff.website.content.updateFailed")); }
    finally { setBusy(false); }
  }

  function adopt(next: Article) {
    setArticle(next); setTitle(next.title); setBody(next.body); setSummary(next.summary); setPreview(null);
  }

  const root = sites.find((row) => row.name === site)?.slug;
  return <StaffShell width="default"><div className="mx-auto max-w-5xl space-y-6 p-6" data-page="website-content">
    <header><h1 className="text-3xl font-semibold">{t("staff.website.content.title")}</h1><p>{t("staff.website.content.intro")}</p><Link to="/settings/website">{t("staff.website.setup.title")}</Link> · <Link to="/settings/website/newsletter">{t("staff.website.content.newsletterLink")}</Link></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label className="block">{t("staff.settings.website.title")}<select disabled={busy} aria-label={t("staff.settings.website.title")} className={field} value={site} onChange={(event) => setSite(event.target.value)}>{sites.map((row) => <option key={row.name} value={row.name}>{row.site_title}</option>)}</select></label>
    {!sites.length && <p>{withLink(t("staff.website.content.createIn"), <Link to="/settings/website">{t("staff.website.setup.title")}</Link>)}</p>}
    <section aria-label={t("staff.website.content.draftsLabel")}><h2>{t("staff.website.content.drafts")}</h2>{drafts.length ? drafts.map((row) => <div className="flex gap-3 border-b py-3" key={row.name}><span>{row.title} · {row.status}</span>{row.source_doctype === "Blog Post" && <button className={button} disabled={busy} onClick={() => void run(async () => { adopt(await callGet<Article>(api + "get_content_draft", { ownership: row.name })); })}>{fill(t("staff.website.content.editArticleNamed"), row.title)}</button>}</div>) : <p>{t("staff.website.content.noDrafts")}</p>}</section>
    <section className="space-y-3" aria-label={t("staff.website.content.editorLabel")} aria-busy={busy}><h2>{article ? t("staff.website.content.editArticle") : t("staff.website.content.newArticle")}</h2>
      <label className="block">{t("staff.website.content.articleTitle")}<input disabled={busy} className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      {!article && <label className="block">{t("staff.website.content.articleAddress")}<input disabled={busy} className={field} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="preparing-for-your-visit" /></label>}
      <label className="block">{t("staff.website.content.summary")}<textarea aria-label={t("staff.website.content.summary")} disabled={busy} className={field} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      <label className="block">{t("staff.website.content.articleText")}<textarea aria-label={t("staff.website.content.articleText")} disabled={busy} className={field} rows={12} value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <p>{t("staff.website.content.markdownHint")}</p>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !site || !title || !body || (!article && !slug)} onClick={() => void run(async () => {
        if (article) adopt(await callMethod<Article>(api + "save_article_draft", { ownership: article.ownership, expected_modified: article.modified, title, body, summary }));
        else { const result = await callMethod<{ ownership: string }>(api + "create_article", { public_site: site, title, slug, body, summary }); adopt(await callGet<Article>(api + "get_content_draft", { ownership: result.ownership })); }
        setNotice(t("staff.website.content.draftSaved"));
      })}>{t("staff.website.content.saveDraft")}</button>
      {article && <><button className={button} disabled={busy} onClick={() => void run(async () => {
        const result = await callMethod<{ detail: ContentDetail }>(api + "preview_article", { ownership: article.ownership });
        const context = await callGet<{ sites: Array<{ site: string; draftVersion: number }> }>("appointment.public_experience.api.website_setup_context");
        const draft = context.sites.find((row) => row.site === site);
        if (!draft) throw new Error(t("staff.website.content.reloadBeforePreview"));
        const snapshot = await callMethod<PublishedSnapshot>("appointment.public_experience.api.preview_website_setup", { site, expected_version: draft.draftVersion });
        if (!snapshot.previewContent) throw new Error(t("staff.website.content.previewUnavailable"));
        setPreview({ ...snapshot, previewContent: { ...snapshot.previewContent, article: result.detail } });
      })}>{t("staff.website.content.previewSaved")}</button><button className={button} disabled={busy} onClick={() => void run(async () => {
        await callMethod(api + "publish_article", { ownership: article.ownership, expected_modified: article.modified }); setNotice(t("staff.website.content.published"));
      })}>{t("staff.website.content.publish")}</button><button className={button} disabled={busy} onClick={() => { setArticle(null); setTitle(""); setSlug(""); setBody(""); setSummary(""); }}>{t("staff.website.content.newArticle")}</button></>}
      </div>{preview && <section aria-label={t("staff.website.content.previewLabel")}><h3>{t("staff.website.content.savedPreview")}</h3><WebsitePreview snapshot={preview} initialSurface="article" savedArticle /></section>}
    </section>
    {site && <WebsiteGallery key={site} site={site} onSaved={refresh} />}
    <section aria-label={t("staff.website.content.history")}><h2>{t("staff.website.content.history")}</h2>{releases.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 border-b py-3"><a href={`/${root}${row.route}`}>{row.route}</a><span>{row.status} · <time dateTime={row.published_at}>{row.published_at}</time></span><button className={button} disabled={busy || row.status !== "Active"} onClick={() => void run(async () => { await callMethod(api + "withdraw_release", { release: row.name }); setNotice(t("staff.website.content.withdrawn")); })}>{fill(t("staff.website.content.withdraw"), row.route)}</button><button className={button} disabled={busy || row.status === "Active"} onClick={() => void run(async () => { await callMethod(api + "rollback_release", { release: row.name }); setNotice(t("staff.website.content.restored")); })}>{fill(t("staff.website.content.restore"), row.route)}</button></div>)}</section>
  </div></StaffShell>;
}
