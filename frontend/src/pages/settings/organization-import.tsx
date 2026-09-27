import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";

interface Business { name: string; label: string }
interface CellError { sheet: string; row: number; cell: string; message: string }
interface Review {
  valid: boolean; sha256: string; errors: CellError[]; summary: Record<string, number>;
  changes: Record<string, { create: number; update: number }>;
}
const api = "appointment.organization_import.api.";
const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";

export default function OrganizationImport() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [organization, setOrganization] = useState("");
  const [content, setContent] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    callGet<{ organizations: Business[] }>(api + "import_context").then((result) => {
      if (active) { setBusinesses(result.organizations); setOrganization(result.organizations[0]?.name || ""); }
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to review this workbook."); }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    setReview(null); setConfirmed(false); setContent("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error("Choose a workbook smaller than 5 MB.");
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Unable to read this workbook. Choose it again."));
      reader.readAsDataURL(file);
    });
    setContent(encoded);
  }

  return <main className="mx-auto max-w-4xl space-y-6 p-6" data-page="organization-import">
    <header><h1 className="text-3xl font-semibold">Import organization workbook</h1><p>Review changes before applying them to your business. Stable keys make corrections and retries safe.</p></header>
    <Link to="/settings/business">Business settings</Link>
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <a className={button} href={"/api/method/" + api + "download_template"}>Download workbook template</a>
    <p>The workbook includes instructions and example rows. Examples are never imported. Do not enter passwords, formulas, or external links. Staff accounts must accept their invitations before you link them.</p>
    <label className="block">Organization<select className={field} value={organization} onChange={(event) => { setOrganization(event.target.value); setReview(null); setConfirmed(false); }}><option value="">Create a new organization from this workbook</option>{businesses.map((business) => <option key={business.name} value={business.name}>{business.label}</option>)}</select></label>
    <label className="block">Organization workbook<input className={field} type="file" accept=".xlsx" onChange={(event) => void run(() => chooseFile(event.target.files?.[0]))} /></label>
    <button className={button} disabled={busy || !content} onClick={() => void run(async () => {
      setConfirmed(false); setReview(await callMethod<Review>(api + "preview_import", { organization, content_base64: content }));
      setNotice("Review complete. No business records were changed.");
    })}>Review workbook</button>
    {review && <section aria-label="Workbook review" className="space-y-4">
      <h2 className="text-xl font-semibold">{review.valid ? "Ready for confirmation" : "Correct these cells and upload again"}</h2>
      {review.errors.length > 0 && <table className="w-full"><thead><tr><th>Sheet</th><th>Cell</th><th>Correction</th></tr></thead><tbody>{review.errors.map((item, index) => <tr key={index}><td>{item.sheet}</td><td>{item.cell}</td><td>{item.message}</td></tr>)}</tbody></table>}
      {review.valid && <><table className="w-full"><thead><tr><th>Records</th><th>Create</th><th>Update</th></tr></thead><tbody>{Object.entries(review.changes).map(([sheet, changes]) => <tr key={sheet}><td>{sheet}</td><td>{changes.create}</td><td>{changes.update}</td></tr>)}</tbody></table><p>Organization facts, team assignments, availability, and approved website text will also be applied. Missing rows do not delete existing records. This import does not send email.</p><label className="block"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I reviewed these changes and want to apply them to this organization.</label><button className={button} disabled={busy || !confirmed} onClick={() => void run(async () => {
        const result = await callMethod<{ valid: boolean; audit: string; replayed: boolean; organization: string; errors?: CellError[] }>(api + "confirm_import", { organization, content_base64: content, expected_hash: review.sha256, confirmed: 1 });
        if (!result.valid) { setReview({ ...review, valid: false, errors: result.errors || [] }); return; }
        setNotice(result.replayed ? "This workbook was already applied. No duplicate records were created." : "Workbook applied. The import audit was saved.");
        if (!organization) { setBusinesses((rows) => [...rows, { name: result.organization, label: result.organization }]); setOrganization(result.organization); }
        setReview(null); setConfirmed(false);
      })}>Confirm import</button></>}
    </section>}
  </main>;
}
