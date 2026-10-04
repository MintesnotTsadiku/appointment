import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { callGet, callMethod } from "@/public-experience/api";
import { StaffShell } from '@/components/staff-shell';

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

export default function NewsletterWorkspace() {
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
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update newsletters."); }
    finally { setBusy(false); }
  }
  const enabled = !!workspace?.entitlement.active;
  const verified = workspace?.senders.find((row) => row.name === sender)?.status === "Verified Local";
  return <StaffShell width="default"><div className="mx-auto max-w-5xl space-y-6 p-6" data-page="website-newsletter">
    <header><h1 className="text-3xl font-semibold">Business newsletters</h1><p>Messages are captured in the local email sink. External email delivery is disabled.</p><Link to="/settings/website/content">Website content</Link></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label>Website<select aria-label="Website" className={field} value={site} onChange={(event) => setSite(event.target.value)}>{sites.map((row) => <option key={row.name} value={row.name}>{row.site_title}</option>)}</select></label>
    {!sites.length && <p>Create a website in <Link to="/settings/website">Website setup</Link>.</p>}
    {workspace && <>
      <p>Newsletter access: {workspace.entitlement.state}. Audience limit: {workspace.entitlement.limits.audience ?? "Unlimited"}. Monthly campaign limit: {workspace.entitlement.limits.monthly_sends ?? "Unlimited"}.</p>
      <section className="space-y-3" aria-label="Newsletter sender"><h2>Sender verification</h2>
        <label>Sender email<input type="email" className={field} value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} /></label>
        <label>Sender name<input className={field} value={senderName} onChange={(event) => setSenderName(event.target.value)} /></label>
        <button className={button} disabled={busy || !enabled || !senderEmail || !senderName} onClick={() => void run(async () => {
          const result = await callMethod<{ sender: string }>(api + "request_sender", { site, email: senderEmail, name: senderName });
          setSender(result.sender); setNotice("Open the verification message in the local email inbox below.");
        })}>Request sender verification</button>
        <label>Campaign sender<select aria-label="Campaign sender" className={field} value={sender} onChange={(event) => setSender(event.target.value)}><option value="">Choose sender</option>{workspace.senders.map((row) => <option key={row.name} value={row.name}>{row.sender_email} · {row.status}</option>)}</select></label>
      </section>
      <section className="space-y-3" aria-label="Newsletter draft"><h2>New newsletter</h2>
        <label>Newsletter subject<input className={field} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label>Newsletter text<textarea aria-label="Newsletter text" className={field} rows={8} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <p>Use simple Markdown. Drafts are private until you confirm a campaign.</p>
        <button className={button} disabled={busy || !enabled || !sender || !subject || !body} onClick={() => void run(async () => {
          const result = await callMethod<{ ownership: string }>(api + "create_draft", { site, sender, subject, body });
          setDraft(result.ownership); setNotice("Newsletter draft saved.");
        })}>Save newsletter draft</button>
      </section>
      <section className="space-y-3" aria-label="Newsletter campaign"><h2>Review and capture a campaign</h2>
        <label>Saved newsletter<select aria-label="Saved newsletter" className={field} value={draft} onChange={(event) => { setDraft(event.target.value); setConfirmed(false); setRequestId(crypto.randomUUID()); }}><option value="">Choose draft</option>{workspace.drafts.map((row) => <option key={row.ownership} value={row.ownership}>{row.subject}</option>)}</select></label>
        <button className={button} disabled={busy || !enabled || !sender || !draft} onClick={() => void run(async () => {
          const result = await callMethod<{ message: string }>(api + "preview_draft", { site, ownership: draft, sender });
          setMessage(await callGet<Message>(api + "get_local_message", { message: result.message }));
          setNotice("Unsent preview captured. No audience received this preview.");
        })}>Capture unsent preview</button>
        <label>Schedule time (optional, site timezone)<input className={field} type="datetime-local" value={scheduled} onChange={(event) => setScheduled(event.target.value)} /></label>
        <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed the saved newsletter and authorize capture for confirmed subscribers in this business. Unsubscribed and suppressed addresses are excluded.</label>
        <button className={button} disabled={busy || !enabled || !verified || !draft || !confirmed} onClick={() => void run(async () => {
          await callMethod(api + "queue_campaign", { site, ownership: draft, sender, request_id: requestId, scheduled_at: scheduled || null });
          setConfirmed(false); setRequestId(crypto.randomUUID()); setNotice(scheduled ? "Local campaign scheduled." : "Local campaign queued.");
        })}>Confirm local campaign</button>
        <button className={button} disabled={busy} onClick={() => void run(async () => { await callMethod(api + "run_due", { site }); setNotice("Due local campaigns checked."); })}>Check due campaigns</button>
        {workspace.campaigns.map((row) => <div key={row.name} className="space-y-2 border-b py-3"><p>{row.subject} · {row.status} · {row.delivered_count} captured · {row.skipped_count} skipped</p>{row.last_error && <p>{row.last_error}</p>}{["Error", "Held"].includes(row.status) && <button className={button} disabled={busy || !enabled} onClick={() => void run(async () => { await callMethod(api + "retry_campaign", { campaign: row.name }); })}>Retry {row.subject}</button>}{!["Delivered", "Cancelled"].includes(row.status) && <button className={button} disabled={busy} onClick={() => void run(async () => { await callMethod(api + "cancel_campaign", { campaign: row.name }); })}>Cancel {row.subject}</button>}</div>)}
        <button className={button} disabled={busy} onClick={() => void run(async () => {})}>Refresh delivery status</button>
      </section>
      <section aria-label="Newsletter audience"><h2>Audience ({workspace.audienceCount})</h2>{workspace.audience.length ? workspace.audience.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 border-b py-3"><span>{row.email} · {row.status}</span>{row.status !== "Suppressed" && <button className={button} disabled={busy} onClick={() => void run(async () => { await callMethod(api + "suppress_member", { member: row.name, reason: "Owner requested no further marketing contact" }); })}>Suppress {row.email}</button>}</div>) : <p>No subscribers yet. Visitors must explicitly consent and confirm their subscription.</p>}</section>
      <section aria-label="Local email inbox"><h2>Local email inbox</h2>{workspace.messages.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 border-b py-3"><span>{row.kind} · {row.recipient} · {row.subject}</span><button className={button} disabled={busy} onClick={() => void run(async () => { setMessage(await callGet<Message>(api + "get_local_message", { message: row.name })); })}>Open {row.kind} for {row.recipient}</button></div>)}</section>
      {message && <section className="space-y-3 rounded-xl border p-5" aria-label="Local email message"><h2>{message.subject}</h2><p>{message.recipient} · {message.kind}</p><p>{message.payload.message}</p>{message.payload.content && <pre className="whitespace-pre-wrap">{(message.payload.content.blocks || []).map((block) => block.text || block.html?.replace(/<[^>]*>/g, "") || block.items?.map((item) => item.replace(/<[^>]*>/g, "")).join("\n") || "").join("\n\n")}</pre>}{message.payload.actionPath && <a href={message.payload.actionPath} target="_blank" rel="noopener noreferrer">Open newsletter action</a>}{message.payload.unsubscribePath && <a href={message.payload.unsubscribePath} target="_blank" rel="noopener noreferrer">Unsubscribe from this newsletter</a>}</section>}
    </>}
  </div></StaffShell>;
}
