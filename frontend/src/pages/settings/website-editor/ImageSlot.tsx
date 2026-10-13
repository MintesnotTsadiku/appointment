import { useState, type MouseEvent } from "react";
import { ImageIcon, RotateCcw } from "lucide-react";

import { Button } from "@/components/button";
import { useTranslation } from "@/lib/i18n";
import { asRecord, focusFromPoint, suggestAlt, type Content, type Issue } from "./core";
import { IssueList, LocalizedInput } from "./fields";
import { MediaDialog, type MediaChoice } from "./MediaDialog";

interface Props {
  site: string;
  content: Content;
  title: unknown;
  limits: { maxBytes: number; types: string[] };
  issues: Issue[];
  prefix: string;
  qa: string;
  onPatch: (patch: Content) => void;
}

/**
 * One image slot: the owner's photo with alt text and a focal point, or the template's own photo.
 * The template crops the photo to its shape (arch, card, band) around the focal point.
 */
export function ImageSlot({ site, content, title, limits, issues, prefix, qa, onPatch }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const image = typeof content.image === "string" ? content.image : "";
  const focus = asRecord(content.imageFocus);
  const position = typeof focus.x === "number" && typeof focus.y === "number" ? `${focus.x}% ${focus.y}%` : "50% 50%";
  const own = issues.filter((issue) => issue.path.startsWith(`${prefix}image`));

  function choose(choice: MediaChoice) {
    // A new photo needs its own description; start from the library's alt text or the section title.
    onPatch({ image: choice.url, imageAlt: choice.alt ? { en: choice.alt } : suggestAlt(title), imageFocus: { x: 50, y: 50 } });
    setOpen(false);
  }

  function pickFocus(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    onPatch({ imageFocus: focusFromPoint(event.clientX - box.left, event.clientY - box.top, box.width, box.height) });
  }

  return <section className="space-y-3 rounded-lg border bg-muted/30 p-4" data-qa={qa} aria-label={t("staff.website.editor.image.label")}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold">{t("staff.website.editor.image.label")}</h4>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" data-qa={`${qa}-choose`} onClick={() => setOpen(true)}><ImageIcon />{image ? t("staff.website.editor.image.change") : t("staff.website.editor.image.choose")}</Button>
        {image && <Button type="button" variant="ghost" size="sm" data-qa={`${qa}-reset`} onClick={() => onPatch({ image: undefined, imageAlt: undefined, imageFocus: undefined })}><RotateCcw />{t("staff.website.editor.image.reset")}</Button>}
      </div>
    </div>
    {image ? <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <button type="button" className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          onClick={pickFocus} data-qa={`${qa}-focus`} aria-label={t("staff.website.editor.image.focusHelp")}>
          <img src={image} alt="" className="size-full object-contain bg-muted" />
          <span aria-hidden="true" className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.45)]"
            style={{ left: `${typeof focus.x === "number" ? focus.x : 50}%`, top: `${typeof focus.y === "number" ? focus.y : 50}%` }} />
        </button>
        <div className="flex gap-3 sm:flex-col" aria-hidden="true">
          <figure className="space-y-1"><img src={image} alt="" className="h-20 w-32 rounded-md border object-cover" style={{ objectPosition: position }} /><figcaption className="text-xs text-muted-foreground">{t("staff.website.editor.image.wide")}</figcaption></figure>
          <figure className="space-y-1"><img src={image} alt="" className="h-28 w-20 rounded-t-full border object-cover" style={{ objectPosition: position }} /><figcaption className="text-xs text-muted-foreground">{t("staff.website.editor.image.tall")}</figcaption></figure>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("staff.website.editor.image.focusHelp")}</p>
      <LocalizedInput label={t("staff.website.editor.image.alt")} value={content.imageAlt} required maxLength={240} qa={`${qa}-alt`}
        issues={own.filter((issue) => issue.path.includes("imageAlt"))} onChange={(next) => onPatch({ imageAlt: next })} />
      <p className="text-xs text-muted-foreground">{t("staff.website.editor.image.altHelp")}</p>
    </> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImageIcon className="size-4" aria-hidden="true" />{t("staff.website.editor.image.templateDefault")}</p>}
    <IssueList issues={own.filter((issue) => !issue.path.includes("imageAlt"))} />
    <MediaDialog open={open} onOpenChange={setOpen} site={site} limits={limits} onChoose={choose} qa={qa} />
  </section>;
}
