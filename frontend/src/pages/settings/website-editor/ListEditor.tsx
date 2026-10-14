import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Label } from "@/components/label";
import { PhoneInput } from "@/components/phone-input";
import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";
import { asRecords, moveItem, newItem, readLocale, removeItem, renumber, replaceItem, type Content, type EditorField, type EditorList, type Issue } from "./core";
import { FormatSelect, IssueList, LocalizedInput, PlainInput } from "./fields";
import { ItemControls } from "./ItemControls";
import { StringsEditor } from "./StringsEditor";

export const FIELD_KEYS: Record<string, string> = {
  title: "staff.website.editor.field.title", intro: "staff.website.editor.field.intro", body: "staff.website.editor.field.body",
  eyebrow: "staff.website.editor.field.eyebrow", subtitle: "staff.website.editor.field.subtitle",
  description: "staff.website.editor.field.description", name: "staff.website.editor.field.name",
  summary: "staff.website.editor.field.summary", role: "staff.website.editor.field.role",
  specialties: "staff.website.editor.field.specialties", credentials: "staff.website.editor.field.credentials",
  label: "staff.website.editor.field.label", value: "staff.website.editor.field.value", detail: "staff.website.editor.field.detail",
  quote: "staff.website.editor.field.quote", attribution: "staff.website.editor.field.attribution",
  question: "staff.website.editor.field.question", answer: "staff.website.editor.field.answer",
  phone: "staff.website.editor.field.phone", email: "staff.website.editor.field.email",
  address: "staff.website.editor.field.address", notes: "staff.website.editor.field.notes",
  hours: "staff.website.editor.field.hours", highlights: "staff.website.editor.field.highlights",
  consent: "staff.website.editor.field.consent",
};

/** Some field names mean something more precise in one section. */
const SECTION_FIELD_KEYS: Record<string, Record<string, string>> = {
  locations: { body: "staff.website.editor.field.placeNote", notes: "staff.website.editor.field.placeNotes" },
};

export function fieldLabel(t: (key: string) => string, section: string, key: string) {
  return t(SECTION_FIELD_KEYS[section]?.[key] || FIELD_KEYS[key] || key);
}

interface FieldProps {
  section: string;
  field: EditorField;
  content: Content;
  onPatch: (patch: Content) => void;
  issues: Issue[];
  prefix: string;
  derived?: Record<string, string>;
  qa: string;
}

/** One editable field of a section or of a list item. */
export function FieldInput({ section, field, content, onPatch, issues, prefix, derived, qa }: FieldProps) {
  const { t } = useTranslation();
  const path = prefix + field.key;
  const own = issues.filter((issue) => issue.path === path || issue.path.startsWith(path + "."));
  const label = fieldLabel(t, section, field.key);
  const value = content[field.key];
  if (field.kind === "text" || field.kind === "long") {
    return <LocalizedInput label={label} value={value} long={field.kind === "long"} required={field.required} maxLength={field.maxLength}
      issues={own} qa={`${qa}-${field.key}`} onChange={(next) => onPatch({ [field.key]: next })} />;
  }
  if (field.kind === "plain" && field.pattern === "phone") {
    return <PhoneLineInput label={label} value={value} maxLength={field.maxLength}
      issues={own} qa={`${qa}-${field.key}`} onChange={(next) => onPatch({ [field.key]: next })} />;
  }
  if (field.kind === "plain") {
    return <PlainInput label={label} value={value} maxLength={field.maxLength} type={field.pattern === "email" ? "email" : "text"}
      issues={own} qa={`${qa}-${field.key}`} onChange={(next) => onPatch({ [field.key]: next })} />;
  }
  if (field.kind === "format") {
    return <FormatSelect item={content} options={field.options || []} derived={derived} place={section === "locations"} qa={`${qa}-format`}
      onChange={(next) => onPatch({ format: next ?? undefined })} />;
  }
  if (field.kind === "strings") {
    return <StringsEditor label={label} lines={Array.isArray(value) ? value : []} maxItems={field.maxItems || 6} maxLength={field.maxLength}
      issues={own} prefix={path} qa={`${qa}-${field.key}`} onChange={(next) => onPatch({ [field.key]: next })} />;
  }
  return <div className="space-y-1"><label className="flex items-center gap-2 text-sm"><Checkbox checked={value === true} data-qa={`${qa}-${field.key}`}
    onCheckedChange={(checked) => onPatch({ [field.key]: checked })} />{t("staff.website.editor.consentLabel")}</label><IssueList issues={own} /></div>;
}

/** A phone line: the shared phone control, with the editor's issue list under it. */
function PhoneLineInput({ label, value, onChange, maxLength, issues, qa }: { label: string; value: unknown; onChange: (value: string) => void; maxLength: number; issues: Issue[]; qa: string }) {
  const id = useId();
  return <div className="space-y-1">
    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    <PhoneInput id={id} value={typeof value === "string" ? value : ""} maxLength={maxLength} data-qa={qa} messages={false}
      aria-invalid={issues.length > 0 || undefined} onChange={onChange} className="md:max-w-sm" />
    <IssueList issues={issues} />
  </div>;
}

interface ListProps {
  section: string;
  list: EditorList;
  items: unknown;
  onChange: (items: Content[]) => void;
  issues: Issue[];
  derived?: Record<string, string>;
  renderImage?: (item: Content, onPatch: (patch: Content) => void, index: number) => ReactNode;
  renderFacts?: (item: Content) => ReactNode;
}

/** The standard list editor: add, edit, reorder and remove records, in English and Amharic. */
export function ListEditor({ section, list, items, onChange, issues, derived, renderImage, renderFacts }: ListProps) {
  const { t } = useTranslation();
  const rows = asRecords(items);
  const [open, setOpen] = useState<number | null>(null);
  const update = (next: Content[]) => onChange(renumber(next, list.numbered));
  const qa = `website-editor-${section}-item`;
  return <div className="space-y-3" data-qa={`website-editor-${section}-list`}>
    <div className="flex items-baseline justify-between gap-3">
      <h4 className="text-sm font-semibold">{t(LIST_KEYS[section] || "staff.website.editor.items")}</h4>
      <span className="text-xs text-muted-foreground">{fill(t("staff.website.editor.itemCount"), String(rows.length), String(list.maxItems))}</span>
    </div>
    {!list.add && <p className="text-xs text-muted-foreground">{t("staff.website.editor.factsNote")}</p>}
    <ol className="space-y-2">
      {rows.map((item, index) => {
        const name = readLocale(item[list.label], "en") || fill(t("staff.website.editor.itemNumber"), String(index + 1));
        const prefix = `${list.key}.${index}.`;
        const own = issues.filter((issue) => issue.path.startsWith(prefix));
        const expanded = open === index;
        return <li key={String(item.id ?? index)} className="rounded-lg border bg-card" data-qa={`${qa}-${index}`} data-invalid={own.length > 0 || undefined}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2 pl-3">
            <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <button type="button" className="flex min-h-10 min-w-[11rem] flex-1 items-center gap-2 rounded-md px-1 text-left text-sm font-medium hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={expanded} data-qa={`${qa}-${index}-toggle`} onClick={() => setOpen(expanded ? null : index)}>
              <span className="truncate">{name}</span>
              {own.length > 0 && <span className="shrink-0 rounded-full bg-destructive/10 px-2 text-xs text-destructive">{t("staff.website.editor.needsAttention")}</span>}
              <ChevronDown className={`ml-auto size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <ItemControls index={index} count={rows.length} name={name} qa={`${qa}-${index}`}
              onMove={(to) => { update(moveItem(rows, index, to)); setOpen(expanded ? to : open === to ? index : open); }}
              onRemove={() => { update(removeItem(rows, index)); setOpen(null); }} />
          </div>
          {expanded && <div className="space-y-4 border-t p-4">
            {renderFacts?.(item)}
            {list.fields.map((field) => <FieldInput key={field.key} section={section} field={field} content={item} prefix={prefix} issues={issues}
              derived={derived} qa={`${qa}-${index}`} onPatch={(patch) => update(replaceItem(rows, index, withoutUndefined({ ...item, ...patch })))} />)}
            {list.image && renderImage?.(item, (patch) => update(replaceItem(rows, index, withoutUndefined({ ...item, ...patch }))), index)}
          </div>}
        </li>;
      })}
    </ol>
    {list.add && <Button type="button" variant="outline" size="sm" disabled={rows.length >= list.maxItems} data-qa={`website-editor-${section}-add`}
      onClick={() => { update([...rows, newItem(list, rows, Date.now().toString(36))]); setOpen(rows.length); }}>
      <Plus />{t(ADD_KEYS[section] || "staff.website.editor.addItem")}</Button>}
  </div>;
}

export function withoutUndefined(value: Content): Content {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

const LIST_KEYS: Record<string, string> = {
  benefits: "staff.website.editor.list.benefits", approaches: "staff.website.editor.list.approaches",
  process: "staff.website.editor.list.process", services: "staff.website.editor.list.services",
  providers: "staff.website.editor.list.providers", proof: "staff.website.editor.list.proof",
  testimonials: "staff.website.editor.list.testimonials", faq: "staff.website.editor.list.faq",
  notice: "staff.website.editor.list.notice", locations: "staff.website.editor.list.locations",
  footer: "staff.website.editor.list.footer",
};

const ADD_KEYS: Record<string, string> = {
  benefits: "staff.website.editor.add.benefit", approaches: "staff.website.editor.add.approach",
  process: "staff.website.editor.add.step", proof: "staff.website.editor.add.credential",
  testimonials: "staff.website.editor.add.testimonial", faq: "staff.website.editor.add.question",
  notice: "staff.website.editor.add.phoneLine", locations: "staff.website.editor.add.place",
};

