import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { callGet, callMethod } from "@/public-experience/api";
import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";
import { checkUpload } from "./core";

export interface MediaChoice { url: string; alt?: string }
interface LibraryItem { name: string; url: string; bytes: number; alt: string }

const api = "appointment.public_experience.api.";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: string;
  limits: { maxBytes: number; types: string[] };
  onChoose: (choice: MediaChoice) => void;
  qa: string;
}

/** Upload a new photo (decoded and cleaned on the server) or pick one from this website's media library. */
export function MediaDialog({ open, onOpenChange, site, limits, onChoose, qa }: Props) {
  const { t } = useTranslation();
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(""); setFile(null); setConsent(false);
    callGet<{ items: LibraryItem[] }>(api + "website_media_library", { site })
      .then((result) => { if (active) setLibrary(result.items); })
      .catch(() => { if (active) setLibrary([]); });
    return () => { active = false; };
  }, [open, site]);

  function select(next: File | null) {
    setError("");
    const problem = next ? checkUpload(next, limits) : null;
    if (problem) setError(problem === "type" ? t("staff.website.editor.image.wrongType") : fill(t("staff.website.editor.image.tooLarge"), String(Math.round(limits.maxBytes / 1024 / 1024))));
    setFile(problem ? null : next);
  }

  async function upload() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error(t("staff.website.setup.imageUnreadable")));
        reader.readAsDataURL(file);
      });
      const result = await callMethod<{ url: string }>(api + "upload_website_section_image", { site, content_base64: encoded, public_consent: 1 });
      onChoose({ url: result.url });
    } catch {
      // Server reasons (not an image, library full) are English; the translated message covers each of them.
      setError(fill(t("staff.website.editor.image.uploadFailed"), String(Math.round(limits.maxBytes / 1024 / 1024))));
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-6 sm:max-w-2xl" data-qa={`${qa}-dialog`}>
      <DialogHeader className="pr-8">
        <DialogTitle>{t("staff.website.editor.image.dialogTitle")}</DialogTitle>
        <DialogDescription>{fill(t("staff.website.editor.image.rules"), String(Math.round(limits.maxBytes / 1024 / 1024)))}</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload" data-qa={`${qa}-tab-upload`}>{t("staff.website.editor.image.uploadTab")}</TabsTrigger>
          <TabsTrigger value="library" data-qa={`${qa}-tab-library`}>{t("staff.website.editor.image.libraryTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor={`${qa}-file`}>{t("staff.website.editor.image.file")}</Label>
            <Input id={`${qa}-file`} type="file" accept={limits.types.join(",")} data-qa={`${qa}-file`} onChange={(event) => select(event.target.files?.[0] || null)} />
          </div>
          {preview && <img src={preview} alt="" className="max-h-56 rounded-md border object-contain" />}
          <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={consent} data-qa={`${qa}-consent`} onCheckedChange={setConsent} />{t("staff.website.editor.image.consent")}</label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={!file || !consent || busy} data-qa={`${qa}-upload`} onClick={() => void upload()}><Upload />{busy ? t("staff.website.editor.image.uploading") : t("staff.website.editor.image.upload")}</Button>
        </TabsContent>
        <TabsContent value="library" className="pt-2">
          {library === null ? <p className="text-sm text-muted-foreground">{t("staff.website.editor.image.loading")}</p>
            : library.length === 0 ? <p className="text-sm text-muted-foreground">{t("staff.website.editor.image.emptyLibrary")}</p>
            : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{library.map((item) => <li key={item.name}>
                <button type="button" className="block w-full overflow-hidden rounded-md border text-left hover:border-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  data-qa={`${qa}-library-item`} onClick={() => onChoose({ url: item.url, alt: item.alt || undefined })}>
                  <img src={item.url} alt={item.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  <span className="block truncate px-2 py-1 text-xs text-muted-foreground">{item.alt || fill(t("staff.website.editor.image.size"), String(Math.max(1, Math.round(item.bytes / 1024))))}</span>
                </button>
              </li>)}</ul>}
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>;
}
