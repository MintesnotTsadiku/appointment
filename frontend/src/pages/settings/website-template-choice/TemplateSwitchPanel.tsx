import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/alert-dialog";
import { Button } from "@/components/button";
import { useTranslation } from "@/lib/i18n";
import { choiceFirst } from "@/lib/template-choice";
import { fill } from "@/pages/manage-booking/format";
import { GalleryBadge } from "./GalleryChoiceNote";

export interface TemplateCard { key: string; label: string; audience: string; thumbnail: string }

interface Props {
  catalog: TemplateCard[];
  current: string;
  chosen: string;
  busy: boolean;
  onSwitch: (key: string) => Promise<void> | void;
  onKeep: () => void;
}

/**
 * An owner whose website exists came from the landing gallery with another template.
 * The chooser opens on that template; nothing changes until the owner confirms the switch.
 */
export function TemplateSwitchPanel({ catalog, current, chosen, busy, onSwitch, onKeep }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(chosen);
  const [confirming, setConfirming] = useState(false);
  const name = (key: string) => catalog.find((row) => row.key === key)?.label || key;

  return (
    <section data-qa="website-template-switch" aria-labelledby="website-template-switch-title" style={{ order: -5 }} className="space-y-4 rounded-2xl border border-primary/30 bg-card p-4 shadow-card sm:p-6">
      <header className="space-y-1">
        <h2 id="website-template-switch-title" className="text-xl font-semibold">{fill(t("staff.website.templateChoice.switchTitle"), name(chosen))}</h2>
        <p className="text-sm text-muted-foreground">{fill(t("staff.website.templateChoice.switchIntro"), name(chosen), name(current))}</p>
      </header>
      <fieldset>
        <legend className="sr-only">{t("staff.website.setup.recommendedTemplates")}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {choiceFirst(catalog, chosen).map((row) => (
            <label key={row.key} data-qa={`website-switch-template-${row.key}`} data-selected={selected === row.key || undefined}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors sm:block ${selected === row.key ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/40"}`}>
              <img src={row.thumbnail} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover sm:mb-3 sm:h-28 sm:w-full" />
              <span className="min-w-0">
                <span className="flex items-center">
                  <input type="radio" name="switch-recipe" className="shrink-0" checked={selected === row.key} onChange={() => setSelected(row.key)} />
                  <strong className="min-w-0">{row.label}</strong>
                </span>
                {row.key === chosen && <GalleryBadge />}
                {row.key === current && <span data-qa="website-current-badge" className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("staff.website.templateChoice.current")}</span>}
                <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{row.audience}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button data-qa="website-switch-template" className="min-h-11" disabled={busy || selected === current} onClick={() => setConfirming(true)}>
          {fill(t("staff.website.templateChoice.switchAction"), name(selected))}
        </Button>
        <Button data-qa="website-keep-template" variant="outline" className="min-h-11" disabled={busy} onClick={onKeep}>
          {fill(t("staff.website.templateChoice.keep"), name(current))}
        </Button>
      </div>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent data-qa="website-switch-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{fill(t("staff.website.templateChoice.confirmTitle"), name(selected))}</AlertDialogTitle>
            <AlertDialogDescription>{fill(t("staff.website.templateChoice.confirmBody"), name(selected))}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-qa="website-switch-cancel">{t("staff.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction data-qa="website-switch-confirm-action" onClick={() => void onSwitch(selected)}>{t("staff.website.templateChoice.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
