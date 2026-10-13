import { Fragment } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";
import { LOCALES, moveItem, readLocale, removeItem, replaceItem, setLocale, type Issue } from "./core";
import { IssueList } from "./fields";
import { ItemControls } from "./ItemControls";

interface Props {
  label: string;
  lines: unknown[];
  maxItems: number;
  maxLength: number;
  issues: Issue[];
  prefix: string;
  onChange: (lines: Record<string, string>[]) => void;
  qa: string;
}

const LOCALE_KEYS: Record<string, string> = { en: "staff.website.editor.english", am: "staff.website.editor.amharic" };

/** A short list of lines (place notes, steps, highlights), each in English and Amharic. */
export function StringsEditor({ label, lines, maxItems, maxLength, issues, prefix, onChange, qa }: Props) {
  const { t } = useTranslation();
  const rows = lines.map((line) => setLocale(line, "en", readLocale(line, "en")));
  return <fieldset className="space-y-2" data-qa={qa}>
    <legend className="flex w-full items-baseline justify-between gap-3 text-sm font-medium">
      <span>{label}</span>
      <span className="text-xs font-normal text-muted-foreground">{fill(t("staff.website.editor.itemCount"), String(rows.length), String(maxItems))}</span>
    </legend>
    <ol className="space-y-2">
      {rows.map((line, index) => {
        const name = readLocale(line, "en") || fill(t("staff.website.editor.lineNumber"), String(index + 1));
        const own = issues.filter((issue) => issue.path.startsWith(`${prefix}.${index}.`));
        return <li key={index} className="space-y-2 rounded-lg border p-2 pl-3" data-qa={`${qa}-${index}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <ItemControls index={index} count={rows.length} name={name} qa={`${qa}-${index}`}
              onMove={(to) => onChange(moveItem(rows, index, to))} onRemove={() => onChange(removeItem(rows, index))} />
          </div>
          <div className="grid items-center gap-x-2 gap-y-1 @sm:grid-cols-[4.5rem_minmax(0,1fr)] @sm:gap-y-2">
            {LOCALES.map((locale) => <Fragment key={locale}>
              <span className="text-xs text-muted-foreground" aria-hidden="true">{t(LOCALE_KEYS[locale])}</span>
              <Input lang={locale} value={readLocale(line, locale)} maxLength={maxLength}
                aria-label={`${name} · ${t(LOCALE_KEYS[locale])}`} data-qa={`${qa}-${index}-${locale}`}
                aria-invalid={own.some((issue) => issue.path.endsWith(`.${locale}`)) || undefined}
                onChange={(event) => onChange(replaceItem(rows, index, setLocale(line, locale, event.target.value)))} />
            </Fragment>)}
            <div className="@sm:col-span-2"><IssueList issues={own} /></div>
          </div>
        </li>;
      })}
    </ol>
    <Button type="button" variant="outline" size="sm" disabled={rows.length >= maxItems} data-qa={`${qa}-add`}
      onClick={() => onChange([...rows, { en: "", am: "" }])}><Plus />{t("staff.website.editor.addLine")}</Button>
  </fieldset>;
}
