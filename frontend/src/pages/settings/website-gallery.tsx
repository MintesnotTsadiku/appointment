import { useState } from "react";

import { callMethod } from "@/public-experience/api";

const field = "block w-full rounded-lg border p-3 dark:bg-slate-900";
const button = "rounded-lg border px-4 py-2 disabled:opacity-50";
const api = "appointment.content.api.";

export default function WebsiteGallery({ site, onSaved }: { site: string; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [caption, setCaption] = useState("");
  const [alt, setAlt] = useState("");
  const [consent, setConsent] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [ownership, setOwnership] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await operation(); await onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save your gallery."); }
    finally { setBusy(false); }
  }

  function encoded(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read your image."));
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(file);
    });
  }

  return <section aria-label="Gallery editor" className="space-y-3 rounded-xl border p-4">
    <h2>New gallery collection</h2>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label className="block">Collection title<input className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="block">Collection address<input className={field} value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
    <label className="block">Gallery image<input className={field} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label>
    <label className="block">Image description<input className={field} value={alt} onChange={(event) => setAlt(event.target.value)} /></label>
    <label className="block">Caption<input className={field} value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
    <label className="block"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I have permission to publish this image, including consent from identifiable people. Uploading makes the image publicly accessible.</label>
    <div className="flex gap-3"><button className={button} disabled={busy || !site || !image || !consent || !title || !slug || !alt || Boolean(ownership)} onClick={() => void run(async () => {
      if (!image) return;
      const upload = await callMethod<{ url: string }>(api + "upload_gallery_image", { public_site: site, content_base64: await encoded(image), public_consent: 1 });
      const draft = await callMethod<{ ownership: string }>(api + "create_gallery", { public_site: site, title, slug,
        items: [{ media_type: "image", image: upload.url, caption, alt_text: alt, consent_status: "Approved", consent_evidence: "Owner confirmed permission during upload" }] });
      setOwnership(draft.ownership); setNotice("Gallery draft saved.");
    })}>Save gallery draft</button>
    {ownership && <button className={button} disabled={busy} onClick={() => void run(async () => {
      await callMethod(api + "publish_gallery_collection", { ownership }); setNotice("Gallery published.");
    })}>Publish gallery</button>}</div>
  </section>;
}
