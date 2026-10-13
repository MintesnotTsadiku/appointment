import { useId } from "react";

import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { OptionSelect } from "@/components/select/OptionSelect";
import { Textarea } from "@/components/textarea";
import { Badge } from "@/components/badge";
import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";
import { LOCALES, readLocale, setLocale, shownMeet, type Content, type Issue, type Meet } from "./core";

const LOCALE_KEYS: Record<string, string> = { en: "staff.website.editor.english", am: "staff.website.editor.amharic" };
export const MEET_KEYS: Record<Meet, string> = {
  in_person: "staff.website.editor.format.inPerson",
  online: "staff.website.editor.format.online",
  phone: "staff.website.editor.format.phone",
};
const ISSUE_KEYS: Record<Issue["code"], string> = {
  required: "staff.website.editor.issue.required",
  tooLong: "staff.website.editor.issue.tooLong",
  tooMany: "staff.website.editor.issue.tooMany",
  phone: "staff.website.editor.issue.phone",
  email: "staff.website.editor.issue.email",
  altRequired: "staff.website.editor.issue.altRequired",
  consent: "staff.website.editor.issue.consent",
};

/** The translated message of one validation issue. */
export function useIssueText() {
  const { t } = useTranslation();
  return (issue: Issue) => fill(t(ISSUE_KEYS[issue.code]), String(issue.limit ?? ""));
}

export function IssueList({ issues }: { issues: Issue[] }) {
  const text = useIssueText();
  if (!issues.length) return null;
  return <ul className="space-y-1 text-sm text-destructive" role="alert">{issues.map((issue) => <li key={issue.path + issue.code}>{text(issue)}</li>)}</ul>;
}

interface LocalizedProps {
  label: string;
  value: unknown;
  onChange: (value: Record<string, string>) => void;
  long?: boolean;
  required?: boolean;
  maxLength: number;
  issues?: Issue[];
  qa?: string;
}

/** English and Amharic side by side. Each box changes only its own language. */
export function LocalizedInput({ label, value, onChange, long, required, maxLength, issues = [], qa }: LocalizedProps) {
  const { t } = useTranslation();
  const id = useId();
  const Control = long ? Textarea : Input;
  return <fieldset className="space-y-2" data-qa={qa}>
    <legend className="text-sm font-medium">{label}{required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}</legend>
    <div className="grid gap-3 @lg:grid-cols-2">
      {LOCALES.map((locale) => {
        const text = readLocale(value, locale);
        const invalid = issues.some((issue) => issue.path.endsWith(`.${locale}`));
        return <div key={locale} className="space-y-1">
          <Label htmlFor={`${id}-${locale}`} className="text-xs font-normal text-muted-foreground">{t(LOCALE_KEYS[locale])}</Label>
          <Control id={`${id}-${locale}`} lang={locale} value={text} maxLength={maxLength} aria-invalid={invalid || undefined}
            data-qa={qa ? `${qa}-${locale}` : undefined} required={required && locale === "en"}
            className={long ? "min-h-[96px]" : undefined}
            onChange={(event) => onChange(setLocale(value, locale, event.target.value))} />
        </div>;
      })}
    </div>
    <IssueList issues={issues} />
  </fieldset>;
}

export function PlainInput({ label, value, onChange, maxLength, type = "text", issues = [], qa }: { label: string; value: unknown; onChange: (value: string) => void; maxLength: number; type?: string; issues?: Issue[]; qa?: string }) {
  const id = useId();
  return <div className="space-y-1">
    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    <Input id={id} type={type} value={typeof value === "string" ? value : ""} maxLength={maxLength} data-qa={qa}
      aria-invalid={issues.length > 0 || undefined} onChange={(event) => onChange(event.target.value)} className="md:max-w-sm" />
    <IssueList issues={issues} />
  </div>;
}

const AUTO = "";

/**
 * How a session or place meets. "Auto" follows its Location (or its name, until the Location says);
 * a choice here changes only the website text.
 */
export function FormatSelect({ item, options, derived, place, onChange, qa }: { item: Content; options: Meet[]; derived?: Record<string, string>; place?: boolean; onChange: (value: Meet | null) => void; qa?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const auto = shownMeet({ ...item, format: undefined }, derived, place);
  const autoLabel = fill(t("staff.website.editor.format.auto"), t(MEET_KEYS[auto.meet]));
  const current = item.format === "in_person" || item.format === "online" || item.format === "phone" ? item.format : AUTO;
  return <div className="space-y-1">
    <Label htmlFor={id} className="text-sm font-medium">{place ? t("staff.website.editor.format.placeLabel") : t("staff.website.editor.format.label")}</Label>
    <div className="flex flex-wrap items-center gap-2">
      <OptionSelect id={id} data-qa={qa} className="w-64" value={current} onValueChange={(value) => onChange(value ? value as Meet : null)}
        options={[{ value: AUTO, label: autoLabel }, ...options.map((value) => ({ value, label: t(MEET_KEYS[value]) }))]} />
      <Badge variant={current ? "info" : "secondary"} data-qa={qa ? `${qa}-source` : undefined}>
        {current ? t("staff.website.editor.format.ownerChoice") : auto.source === "location" ? t("staff.website.editor.format.fromLocation") : t("staff.website.editor.format.fromName")}
      </Badge>
    </div>
  </div>;
}
