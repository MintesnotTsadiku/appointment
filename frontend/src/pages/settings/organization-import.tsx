import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { callGet, callMethod } from "@/public-experience/api";
import { StaffShell } from '@/components/staff-shell';
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
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
    catch (reason) { setError(reason instanceof Error ? reason.message : t("staff.orgImport.reviewFailed")); }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    setReview(null); setConfirmed(false); setContent("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error(t("staff.orgImport.tooLarge"));
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error(t("staff.orgImport.readFailed")));
      reader.readAsDataURL(file);
    });
    setContent(encoded);
  }

  return <StaffShell width="default"><div className="mx-auto max-w-4xl space-y-6 p-6" data-page="organization-import">
    <header><h1 className="text-3xl font-semibold">{t("staff.orgImport.title")}</h1><p>{t("staff.orgImport.intro")}</p></header>
    <Link to="/settings/business">{t("staff.orgImport.businessSettings")}</Link>
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <a className={`${button} inline-block`} href={"/api/method/" + api + "download_template"}>{t("staff.orgImport.downloadTemplate")}</a>
    <p>{t("staff.orgImport.guidance")}</p>
    <label className="block">{t("staff.availability.organization")}<select className={field} value={organization} onChange={(event) => { setOrganization(event.target.value); setReview(null); setConfirmed(false); }}><option value="">{t("staff.orgImport.createNew")}</option>{businesses.map((business) => <option key={business.name} value={business.name}>{business.label}</option>)}</select></label>
    <label className="block">{t("staff.settings.organizationImport.title")}<input className={field} type="file" accept=".xlsx" onChange={(event) => void run(() => chooseFile(event.target.files?.[0]))} /></label>
    <button className={button} disabled={busy || !content} onClick={() => void run(async () => {
      setConfirmed(false); setReview(await callMethod<Review>(api + "preview_import", { organization, content_base64: content }));
      setNotice(t("staff.orgImport.reviewComplete"));
    })}>{t("staff.orgImport.review")}</button>
    {review && <section aria-label={t("staff.orgImport.reviewLabel")} className="space-y-4">
      <h2 className="text-xl font-semibold">{review.valid ? t("staff.orgImport.ready") : t("staff.orgImport.correct")}</h2>
      {review.errors.length > 0 && <table className="w-full"><thead><tr><th>{t("staff.orgImport.sheet")}</th><th>{t("staff.orgImport.cell")}</th><th>{t("staff.orgImport.correction")}</th></tr></thead><tbody>{review.errors.map((item, index) => <tr key={index}><td>{item.sheet}</td><td>{item.cell}</td><td>{item.message}</td></tr>)}</tbody></table>}
      {review.valid && <><table className="w-full"><thead><tr><th>{t("staff.orgImport.records")}</th><th>{t("staff.locations.create")}</th><th>{t("staff.locations.update")}</th></tr></thead><tbody>{Object.entries(review.changes).map(([sheet, changes]) => <tr key={sheet}><td>{sheet}</td><td>{changes.create}</td><td>{changes.update}</td></tr>)}</tbody></table><p>{t("staff.orgImport.applyNote")}</p><label className="block"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> {t("staff.orgImport.confirmLabel")}</label><button className={button} disabled={busy || !confirmed} onClick={() => void run(async () => {
        const result = await callMethod<{ valid: boolean; audit: string; replayed: boolean; organization: string; errors?: CellError[] }>(api + "confirm_import", { organization, content_base64: content, expected_hash: review.sha256, confirmed: 1 });
        if (!result.valid) { setReview({ ...review, valid: false, errors: result.errors || [] }); return; }
        setNotice(result.replayed ? t("staff.orgImport.replayed") : t("staff.orgImport.applied"));
        if (!organization) { setBusinesses((rows) => [...rows, { name: result.organization, label: result.organization }]); setOrganization(result.organization); }
        setReview(null); setConfirmed(false);
      })}>{t("staff.orgImport.confirm")}</button></>}
    </section>}
  </div></StaffShell>;
}
