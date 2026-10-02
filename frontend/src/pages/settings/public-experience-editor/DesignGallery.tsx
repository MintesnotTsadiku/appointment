import { Check, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import type { Recipe } from "./types";

interface DesignGalleryProps {
  recipes: Recipe[];
  selected: string;
  current: string;
  onSelect: (key: string) => void;
}

/** Visual catalog of certified designs with a live example for each. */
export function DesignGallery({ recipes, selected, current, onSelect }: DesignGalleryProps) {
  const { t } = useTranslation();
  return (
    <div role="list" aria-label={t("staff.publicExperience.galleryTitle")} className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3" data-qa="design-gallery">
      {recipes.map((recipe) => {
        const isSelected = recipe.key === selected;
        return (
          <div
            role="listitem"
            key={recipe.key}
            data-qa={`design-${recipe.key}`}
            className={cn("flex w-[78%] min-w-0 shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-card transition-shadow sm:w-auto", isSelected ? "border-primary ring-2 ring-primary/30" : "hover:shadow-card")}
          >
            <div className="relative aspect-[16/9] bg-muted">
              {recipe.showcase?.heroAsset ? <img src={recipe.showcase.heroAsset} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
              <div className="absolute left-2 top-2 flex gap-1.5">
                {recipe.key === current ? <Badge variant="default">{t("staff.publicExperience.currentDesign")}</Badge> : null}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                {recipe.showcase?.logoAsset ? <img src={recipe.showcase.logoAsset} alt="" className="h-6 w-6 shrink-0 rounded object-contain" /> : null}
                <h4 className="min-w-0 truncate text-sm font-semibold text-foreground">{recipe.label}</h4>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">v{recipe.version}</span>
              </div>
              {/* The description says what the design is for and how it looks; owners compare on it. */}
              <p className="line-clamp-4 text-xs text-muted-foreground">{recipe.description || recipe.audience}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                <Button type="button" size="sm" variant={isSelected ? "secondary" : "outline"} onClick={() => onSelect(recipe.key)} aria-pressed={isSelected} data-qa={`design-use-${recipe.key}`}>
                  {isSelected ? <Check aria-hidden="true" /> : null}
                  {isSelected ? t("staff.publicExperience.selectedDesign") : t("staff.publicExperience.useDesign")}
                </Button>
                {recipe.showcase?.path ? (
                  <Button asChild size="sm" variant="ghost">
                    <a href={recipe.showcase.path} target="_blank" rel="noopener noreferrer" aria-label={`${t("staff.publicExperience.viewExample")}: ${recipe.label}`}>
                      <ExternalLink aria-hidden="true" />
                      {t("staff.publicExperience.viewExample")}
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
