import { Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";

/** "You chose <Template> from our gallery", shown while the gallery template is the selected one. */
export function GalleryChoiceNote({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <p data-qa="website-gallery-note" className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{fill(t("staff.website.templateChoice.chosenNote"), label)}</span>
    </p>
  );
}

/** The badge on the gallery template's card in the chooser. */
export function GalleryBadge() {
  const { t } = useTranslation();
  return <span data-qa="website-gallery-badge" className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:ml-2 sm:mt-0">{t("staff.website.templateChoice.badge")}</span>;
}
