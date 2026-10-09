import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { callGet, callMethod } from "@/public-experience/api";
import { StaffShell } from '@/components/staff-shell';
import { useTranslation } from '@/lib/i18n';
import { fill } from '@/pages/manage-booking/format';

interface Site { name: string; site_title: string }
interface Sender { name: string; sender_email: string; status: string }
interface Workspace {
  audienceCount: number;
  audience: { name: string; email: string; status: string }[];
  senders: Sender[];
  drafts: { ownership: string; subject: string }[];
  campaigns: { name: string; subject: string; status: string; delivered_count: number; skipped_count: number; last_error?: string }[];
  messages: { name: string; kind: string; recipient: string; subject: string }[];
  entitlement: { active: boolean; state: string; limits: { monthly_sends?: number; audience?: number } };
}
interface Message { kind: string; subject: string; recipient: string; payload: { actionPath?: string; unsubscribePath?: string; message?: string; content?: { blocks?: { text?: string; html?: string; items?: string[] }[] } } }
const api = "appointment.content.newsletter.api.";
const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";

/** Place a link where a translated sentence has its {0} placeholder. */
function withLink(text: string, link: ReactNode) {
  const [before, after = ""] = text.split("{0}");
  return <>{before}{link}{after}</>;
}

export default function NewsletterWorkspace() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sender, setSender] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    callGet<{ sites: Site[] }>("appointment.public_experience.api.list_public_sites").then((result) => {
      setSites(result.sites); setSite(result.sites[0]?.name || "");
    }).catch((reason: Error) => setError(reason.message));
  }, []);
  const refresh = useCallback(async () => {
    if (!site) return;
    const result = await callGet<Workspace>(api + "workspace", { site });
    setWorkspace(result);
    setSender((selected) => result.senders.some((row) => row.name === selected) ? selected : result.senders[0]?.name || "");
    setDraft((selected) => result.drafts.some((row) => row.ownership === selected) ? selected : result.drafts[0]?.ownership || "");
  }, [site]);
  useEffect(() => {
    setWorkspace(null); setMessage(null); setConfirmed(false); setError("");
    void refresh().catch((reason: Error) => setError(reason.message));
  }, [refresh]);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("staff.website.newsletter.updateFailed")); }
    finally { setBusy(false); }
  }
  const enabled = !!workspace?.entitlement.active;
  const verified = workspace?.senders.find((row) => row.name === sender)?.status === "Verified Local";
  return <StaffShell width="default"><div className="mx-auto max-w-5xl space-y-6 p-6" data-page="website-newsletter">
    <header><h1 className="text-3xl font-semibold">{t("staff.website.newsletter.title")}</h1><p>{t("staff.website.newsletter.intro")}</p><Link to="/settings/website/content">{t("staff.website.content.title")}</Link></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label>{t("staff.settings.website.title")}<select aria-label={t("staff.settings.website.title")} className={field} value={site} onChange={(event) => setSite(event.target.value)}>{sites.map((row) => <option key={row.name} value={row.name}>{row.site_title}</option>)}</select></label>
    {!sites.length && <p>{withLink(t("staff.website.newsletter.createIn"), <Link to="/settings/website">{t("staff.website.setup.title")}</Link>)}</p>}
    {workspace && <>
      <p>{fill(t("staff.website.newsletter.access"), workspace.entitlement.state, workspace.entitlement.limits.audience ?? t("staff.website.newsletter.unlimited"), workspace.entitlement.limits.monthly_sends ?? t("staff.website.newsletter.unlimited"))}</p>
      <section className="space-y-3" aria-label={t("staff.website.newsletter.senderLabel")}><h2>{t("staff.website.newsletter.senderVerification")}</h2>
        <label>{t("staff.website.newsletter.senderEmail")}<input type="email" className={field} value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} /></label>
        <label>{t("staff.website.newsletter.senderName")}<input className={field} value={senderName} onChange={(event) => setSenderName(event.target.value)} /></label>
        <button className={button} disabled={busy || !enabled || !senderEmail || !senderName} onClick={() => void run(async () => {
          const result = await callMethod<{ sender: string }>(api + "request_sender", { site, email: senderEmail, name: senderName });
          setSender(result.sender); setNotice(t("staff.website.newsletter.verificationNotice"));
        })}>{t("staff.website.newsletter.requestVerification")}</button>
        <label>{t("staff.website.newsletter.campaignSender")}<select aria-label={t("staff.website.newsletter.campaignSender")} className={field} value={sender} onChange={(event) => setSender(event.target.value)}><option value="">{t("staff.website.newsletter.chooseSender")}</option>{workspace.senders.map((row) => <option key={row.name} value={row.name}>{row.sender_email} · {row.status}</option>)}</select></label>
      </section>
      <section className="space-y-3" aria-label={t("staff.website.newsletter.draftLabel")}><h2>{t("staff.website.newsletter.newNewsletter")}</h2>
        <label>{t("staff.website.newsletter.subject")}<input className={field} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label>{t("staff.website.newsletter.text")}<textarea aria-label={t("staff.website.newsletter.text")} className={field} rows={8} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <p>{t("staff.website.newsletter.markdownHint")}</p>
        <button className={button} disabled={busy || !enabled || !sender || !subject || !body} onClick={() => void run(async () => {
          const result = await callMethod<{ ownership: string }>(api + "create_draft", { site, sender, subject, body });
          setDraft(result.ownership); setNotice(t("staff.website.newsletter.draftSaved"));
        })}>{t("staff.website.newsletter.saveDraft")}</button>
      </section>
      <section className="space-y-3" aria-label={t("staff.website.newsletter.campaignLabel")}><h2>{t("staff.website.newsletter.review")}</h2>
        <label>{t("staff.website.newsletter.savedNewsletter")}<select aria-label={t("staff.website.newsletter.savedNewsletter")} className={field} value={draft} onChange={(event) => { setDraft(event.target.value); setConfirmed(false); setRequestId(crypto.randomUUID()); }}><option value="">{t("staff.website.newsletter.chooseDraft")}</option>{workspace.drafts.map((row) => <option key={row.ownership} value={row.ownership}>{row.subject}</option>)}</select></label>
        <button className={button} disabled={busy || !enabled || !sender || !draft} onClick={() => void run(async () => {
          const result = await callMethod<{ message: string }>(api + "preview_draft", { site, ownership: draft, sender });
          setMessage(await callGet<Message>(api + "get_local_message", { message: result.message }));
          setNotice(t("staff.website.newsletter.previewCaptured"));
        })}>{t("staff.website.newsletter.capturePreview")}</button>
        <label>{t("staff.website.newsletter.schedule")}<input className={field} type="datetime-local" value={scheduled} onChange={(event) => setScheduled(event.target.value)} /></label>
        <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{t("staff.website.newsletter.confirm")}</label>
        <button className={button} disabled={busy || !enabled || !verified || !draft || !confirmed} onClick={() => void run(async () => {
          await callMethod(api + "queue_campaign", { site, ownership: draft, sender, request_id: requestId, scheduled_at: scheduled || null });
          setConfirmed(false); setRequestId(crypto.randomUUID()); setNotice(scheduled ? t("staff.website.newsletter.scheduled") : t("staff.website.newsletter.queued"));
        })}>{t("staff.website.newsletter.confirmCampaign")}</button>
        <button className={button} disabled={busy} onClick={() => void run(async () => { await callMethod(api + "run_due", { site }); setNotice(t("staff.website.newsletter.dueChecked")); })}>{t("staff.website.newsletter.checkDue")}</button>
        {workspace.campaigns.map((row) => <div key={row.name} className="space-y-2 border-b py-3"><p>{fill(t("staff.website.newsletter.campaignCounts"), row.subject, row.status, row.delivered_count, row.skipped_count)}</p>{row.last_error && <p>{row.last_error}</p>}{["Error", "Held"].includes(row.status) && <button className={button} disabled={busy || !enabled} onClick={() => void run(async () => { await callMethod(api + "retry_campaign", { campaign: row.name }); })}>{fill(t("staff.website.newsletter.retry"), row.subject)}</button>}{!["Delivered", "Cancelled"].includes(row.status) && <button className={button} disabled={busy} onClick={() => void run(async () => { await callMethod(api + "cancel_campaign", { campaign: row.name }); })}>{fill(t("staff.website.newsletter.cancel"), row.subject)}</button>}</div>)}
        <button className={button} disabled={busy} onClick={() => void run(async () => {})}>{t("staff.website.newsletter.refreshStatus")}</button>
      </section>
      <section aria-label={t("staff.website.newsletter.audienceLabel")}><h2>{fill(t("staff.website.newsletter.audience"), workspace.audienceCount)}</h2>{workspace.audience.length ? workspace.audience.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 border-b py-3"><span>{row.email} · {row.status}</span>{row.status !== "Suppressed" && <button className={button} disabled={busy} onClick={() => void run(async () => { await callMethod(api + "suppress_member", { member: row.name, reason: "Owner requested no further marketing contact" }); })}>{fill(t("staff.website.newsletter.suppress"), row.email)}</button>}</div>) : <p>{t("staff.website.newsletter.noSubscribers")}</p>}</section>
      <section aria-label={t("staff.website.newsletter.inbox")}><h2>{t("staff.website.newsletter.inbox")}</h2>{workspace.messages.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 border-b py-3"><span>{row.kind} · {row.recipient} · {row.subject}</span><button className={button} disabled={busy} onClick={() => void run(async () => { setMessage(await callGet<Message>(api + "get_local_message", { message: row.name })); })}>{fill(t("staff.website.newsletter.openMessage"), row.kind, row.recipient)}</button></div>)}</section>
      {message && <section className="space-y-3 rounded-xl border p-5" aria-label={t("staff.website.newsletter.messageLabel")}><h2>{message.subject}</h2><p>{message.recipient} · {message.kind}</p><p>{message.payload.message}</p>{message.payload.content && <pre className="whitespace-pre-wrap">{(message.payload.content.blocks || []).map((block) => block.text || block.html?.replace(/<[^>]*>/g, "") || block.items?.map((item) => item.replace(/<[^>]*>/g, "")).join("\n") || "").join("\n\n")}</pre>}{message.payload.actionPath && <a href={message.payload.actionPath} target="_blank" rel="noopener noreferrer">{t("staff.website.newsletter.openAction")}</a>}{message.payload.unsubscribePath && <a href={message.payload.unsubscribePath} target="_blank" rel="noopener noreferrer">{t("staff.website.newsletter.unsubscribe")}</a>}</section>}
    </>}
  </div></StaffShell>;
}
