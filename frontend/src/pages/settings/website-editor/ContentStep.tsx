import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { useTranslation } from "@/lib/i18n";
import type { PublishedSnapshot } from "@/public-experience/types";
import { AppearancePreview } from "../appearance/AppearancePreview";
import { cleanContent, previewSections, readLocale, validateSection, type Content, type Issue, type SectionSchema } from "./core";
import { SectionForm, type EditorContext } from "./SectionForm";

export interface DraftSection { type: string; content: Content }

const SECTION_KEYS: Record<string, string> = {
  hero: "staff.website.editor.section.hero", benefits: "staff.website.editor.section.benefits",
  approaches: "staff.website.editor.section.approaches", about: "staff.website.editor.section.about",
  process: "staff.website.editor.section.process", services: "staff.website.editor.section.services",
  providers: "staff.website.editor.section.providers", proof: "staff.website.editor.section.proof",
  testimonials: "staff.website.editor.section.testimonials", faq: "staff.website.editor.section.faq",
  notice: "staff.website.editor.section.notice", locations: "staff.website.editor.section.locations",
  contact: "staff.website.editor.section.contact", booking_cta: "staff.website.editor.section.booking_cta",
  footer: "staff.website.editor.section.footer",
};

/**
 * Issues of every section, by section type, checked on the content that will be saved.
 * `stored` is the saved draft: its phone numbers are not checked again.
 */
export function draftIssues(sections: DraftSection[], schemas: Record<string, SectionSchema>, stored: DraftSection[] = []): Record<string, Issue[]> {
  const result: Record<string, Issue[]> = {};
  for (const row of sections) {
    const schema = schemas[row.type];
    const before = stored.find((saved) => saved.type === row.type)?.content;
    const issues = schema ? validateSection(schema, cleanContent(row.content), before) : [];
    if (issues.length) result[row.type] = issues;
  }
  return result;
}

export function savedSections(sections: DraftSection[]): DraftSection[] {
  return sections.map((row) => ({ type: row.type, content: cleanContent(row.content) }));
}

interface Props {
  sections: DraftSection[];
  /** The saved draft, to tell changed phone numbers from stored ones. */
  stored: DraftSection[];
  schemas: Record<string, SectionSchema>;
  context: EditorContext;
  snapshot: PublishedSnapshot | null;
  dirty: boolean;
  fullPreview: boolean;
  onClosePreview: () => void;
  onChange: (sections: DraftSection[]) => void;
  focus?: string;
}

/** The content step: pick a section, edit it in both languages, and watch the page change beside it. */
export function ContentStep({ sections, stored, schemas, context, snapshot, dirty, fullPreview, onClosePreview, onChange, focus }: Props) {
  const { t } = useTranslation();
  const editable = sections.filter((row) => schemas[row.type]);
  const [selected, setSelected] = useState(editable[0]?.type || "");
  const issues = useMemo(() => draftIssues(sections, schemas, stored), [sections, schemas, stored]);
  useEffect(() => { if (focus) setSelected(focus); }, [focus]);
  const current = sections.find((row) => row.type === selected);
  const live = useMemo(() => snapshot ? { ...snapshot, sections: previewSections(snapshot.sections, savedSections(sections), context.derived) } : null,
    [snapshot, sections, context.derived]);
  useScrollPreviewTo(`${readLocale(current?.content.title, "en")}\n${readLocale(current?.content.title, "am")}`, snapshot);

  return <div className="appearance-workspace website-editor-workspace">
    <section className="appearance-controls @container space-y-5" aria-label={t("staff.website.editor.title")}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("staff.website.editor.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("staff.website.editor.intro")}</p>
      </div>
      <nav aria-label={t("staff.website.editor.sections")} className="flex flex-wrap gap-1.5" data-qa="website-editor-sections">
        {editable.map((row) => <button key={row.type} type="button" aria-current={row.type === selected ? "true" : undefined}
          data-qa={`website-editor-tab-${row.type}`} onClick={() => setSelected(row.type)}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${row.type === selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
          {t(SECTION_KEYS[row.type] || row.type)}
          {issues[row.type] && <span className="size-2 rounded-full bg-destructive" aria-label={t("staff.website.editor.needsAttention")} />}
        </button>)}
      </nav>
      {current && schemas[current.type] && <div className="space-y-4 border-t pt-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{t(SECTION_KEYS[current.type] || current.type)}</h3>
          {issues[current.type] ? <Badge variant="destructive">{t("staff.website.editor.needsAttention")}</Badge> : null}
        </div>
        <SectionForm key={current.type} type={current.type} schema={schemas[current.type]} content={current.content}
          issues={issues[current.type] || []} context={context}
          onChange={(content) => onChange(sections.map((row) => row.type === current.type ? { ...row, content } : row))} />
      </div>}
    </section>
    <AppearancePreview snapshot={live} fullScreen={fullPreview} onClose={onClosePreview} dirty={dirty} />
  </div>;
}

/** Bring the edited section into view in the preview, found by its English or Amharic heading. */
function useScrollPreviewTo(titles: string, snapshot: PublishedSnapshot | null) {
  useEffect(() => {
    const wanted = titles.split("\n").map((text) => text.trim()).filter(Boolean);
    if (!wanted.length) return;
    const timer = window.setTimeout(() => {
      const frame = window.document.querySelector<HTMLIFrameElement>(".appearance-preview iframe");
      const view = frame?.contentWindow;
      const heading = Array.from(frame?.contentDocument?.querySelectorAll("h1,h2") || []).find((element) => wanted.includes(element.textContent?.trim() || ""));
      // Scroll only the preview's own page; scrollIntoView would also move the editor.
      if (view && heading) view.scrollTo({ top: Math.max(0, heading.getBoundingClientRect().top + view.scrollY - 96) });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [titles, snapshot]);
}
