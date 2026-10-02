import { ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/button";
import { humanize, type Recipe, type Site } from "./types";

/** Summary of the chosen design and links to see it live. */
export function SelectedDesign({ recipe, site, contentHash }: { recipe?: Recipe; site: Site | null; contentHash?: string }) {
  const { t } = useTranslation();
  if (!recipe) return null;
  const live = site?.status === "Published";
  return (
    <aside className="min-w-0 overflow-hidden rounded-xl border bg-muted/30" data-qa="selected-design">
      {recipe.showcase?.heroAsset ? <img src={recipe.showcase.heroAsset} alt="" className="aspect-[16/9] w-full object-cover" /> : null}
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{recipe.label}</h3>
          {recipe.description ? <p className="text-xs text-muted-foreground">{recipe.description}</p> : null}
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
          {recipe.audience ? (<><dt className="text-muted-foreground">{t("staff.publicExperience.bestFor")}</dt><dd className="text-foreground">{recipe.audience}</dd></>) : null}
          <dt className="text-muted-foreground">{t("staff.publicExperience.languages")}</dt>
          <dd className="text-foreground">{recipe.supportedLocales.map((locale) => locale.toUpperCase()).join(" · ")}</dd>
          <dt className="text-muted-foreground">{t("staff.publicExperience.sections")}</dt>
          <dd className="text-foreground">{recipe.requiredSections.map(humanize).join(", ")}</dd>
        </dl>
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {live ? (
            <>
              <Button asChild size="sm" variant="outline">
                <a href={`/${site!.slug}`} target="_blank" rel="noopener noreferrer" data-qa="public-experience-open-site">
                  <ExternalLink aria-hidden="true" />
                  {t("staff.publicExperience.openLiveSite")}
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={`/${site!.slug}/book`} target="_blank" rel="noopener noreferrer">{t("staff.publicExperience.openBooking")}</a>
              </Button>
            </>
          ) : recipe.showcase?.path ? (
            <Button asChild size="sm" variant="outline">
              <a href={recipe.showcase.path} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                {t("staff.publicExperience.viewExample")}
              </a>
            </Button>
          ) : null}
        </div>
        {contentHash ? <p className="text-xs text-success">{t("staff.publicExperience.designChecked")}</p> : null}
      </div>
    </aside>
  );
}
