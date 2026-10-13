import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";
import type { Content, Issue, SectionSchema } from "./core";
import { ImageSlot } from "./ImageSlot";
import { FieldInput, ListEditor, withoutUndefined } from "./ListEditor";

export interface EditorContext {
  site: string;
  limits: { maxBytes: number; types: string[] };
  derived: { services?: Record<string, string>; places?: Record<string, string> };
}

interface Props {
  type: string;
  schema: SectionSchema;
  content: Content;
  issues: Issue[];
  context: EditorContext;
  onChange: (content: Content) => void;
}

/** Every editable part of one section, drawn from the server's editor schema. */
export function SectionForm({ type, schema, content, issues, context, onChange }: Props) {
  const { t, language } = useTranslation();
  const patch = (next: Content) => onChange(withoutUndefined({ ...content, ...next }));
  const derived = type === "services" ? context.derived.services : type === "locations" ? context.derived.places : undefined;
  const qa = `website-editor-${type}`;
  return <div className="space-y-6" data-qa={qa}>
    {schema.fields.map((field) => <FieldInput key={field.key} section={type} field={field} content={content} prefix="" issues={issues}
      qa={qa} onPatch={patch} />)}
    {schema.image && <ImageSlot site={context.site} limits={context.limits} content={content} title={content.title} issues={issues} prefix=""
      qa={`${qa}-image`} onPatch={patch} />}
    {schema.list && <ListEditor section={type} list={schema.list} items={content[schema.list.key]} issues={issues} derived={derived}
      onChange={(items) => patch({ [schema.list!.key]: items })}
      renderFacts={schema.list.facts ? (item) => <Facts item={item} language={language} t={t} /> : undefined}
      renderImage={(item, onPatch, index) => <ImageSlot site={context.site} limits={context.limits} content={item} title={item.name}
        issues={issues} prefix={`${schema.list!.key}.${index}.`} qa={`${qa}-item-${index}-image`} onPatch={onPatch} />} />}
  </div>;
}

function Facts({ item, language, t }: { item: Content; language: string; t: (key: string) => string }) {
  const minutes = typeof item.durationMinutes === "number" ? item.durationMinutes : null;
  const price = typeof item.price === "number" ? item.price : null;
  const amount = price === null ? "" : price === 0 ? t("staff.website.editor.free")
    : `${typeof item.currency === "string" ? item.currency + " " : ""}${new Intl.NumberFormat(language === "am" ? "am-ET" : "en").format(price)}`;
  return <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
    {[minutes ? fill(t("staff.website.editor.minutes"), String(minutes)) : "", amount].filter(Boolean).join(" · ")}
    <span className="block text-xs">{t("staff.website.editor.factsSource")}</span>
  </p>;
}
