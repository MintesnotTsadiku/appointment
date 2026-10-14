import { motion, useInView } from "framer-motion";
import { useRef, useState, type CSSProperties } from "react";
import { useBrandedTranslation } from "@/lib/platform-brand";
import { fill } from "../../shared/offer";
import { templateStartHref, type GalleryTemplate } from "../../shared/templateGallery";
import type { EntryLinks } from "../../shared/useEntryLinks";
import { useTemplateGallery } from "../../shared/useTemplateGallery";
import TemplatePreview from "./TemplatePreview";
import "./gallery.css";

type Translate = (key: string) => string;

/**
 * 23:00. Every certified website template as a lit shop window, from the
 * server's template list: a new template appears here without code changes.
 */
const TemplateGallery = ({ entry, heading = "h2" }: { entry: EntryLinks; heading?: "h1" | "h2" }) => {
  const { t } = useBrandedTranslation();
  const ref = useRef<HTMLElement>(null);
  const near = useInView(ref, { once: true, margin: "900px 0px" });
  const { templates, loaded } = useTemplateGallery(near);
  const [open, setOpen] = useState<GalleryTemplate | null>(null);
  const Title = heading;
  return (
    <section ref={ref} id="gallery" className="lw-gallery" data-world-section="gallery" aria-labelledby="lw-gallery-title" data-qa="template-gallery">
      <div className="lw-wrap">
        <p className="lw-eyebrow">{t("world.gallery.eyebrow")}</p>
        <Title id="lw-gallery-title" className="lw-gallery-title">{t("world.gallery.title")}</Title>
        <p className="lw-lede">{t("world.gallery.lede")}</p>
        {loaded && templates.length === 0 && <p className="lw-gallery-empty" role="status">{t("world.gallery.empty")}</p>}
        <ul className="lw-gallery-grid" aria-label={t("world.gallery.listLabel")} aria-busy={!loaded} data-qa="template-gallery-list">
          {templates.map((template, order) => (
            <TemplateCard key={template.key} template={template} order={order} start={startFor(entry)} onPreview={() => setOpen(template)} />
          ))}
        </ul>
      </div>
      {open && <TemplatePreview template={open} useHref={templateStartHref(startFor(entry), open.key)} onClose={() => setOpen(null)} />}
    </section>
  );
};

/** Guests start an account; signed-in owners go to their website setup. Both carry the template. */
function startFor(entry: EntryLinks): string {
  return entry.authenticated ? "/settings/website" : entry.start;
}

const TemplateCard = ({ template, order, start, onPreview }: {
  template: GalleryTemplate;
  order: number;
  start: string;
  onPreview: () => void;
}) => {
  const { t } = useBrandedTranslation();
  const name = { template: template.label };
  return (
    <motion.li
      className="lw-template"
      style={{ "--template-accent": template.accent ?? "var(--lw-accent)" } as CSSProperties}
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ delay: (order % 3) * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      data-qa="template-card"
      data-template={template.key}
    >
      <button type="button" className="lw-window" onClick={onPreview} aria-label={fill(t("world.gallery.previewOf"), name)}>
        <Window template={template} t={t} />
      </button>
      <div className="lw-template-body">
        <p className="lw-template-focus">{industryLabel(template, t)}</p>
        <h3 className="lw-template-name">{template.label}</h3>
        <p className="lw-template-for">{audienceLabel(template, t)}</p>
        <ul className="lw-template-facts">
          <li data-qa="template-modes">{modesLabel(template, t)}</li>
          <li data-qa="template-languages">{languagesLabel(template, t)}</li>
        </ul>
        <div className="lw-template-actions">
          <button type="button" className="lw-btn lw-btn-solid lw-btn-small" onClick={onPreview} data-qa="template-preview-open">
            {t("world.gallery.preview")}
          </button>
          <a className="lw-btn lw-btn-ghost lw-btn-small" href={templateStartHref(start, template.key)} data-qa="template-use" aria-label={fill(t("world.gallery.useOf"), name)}>
            {t("world.gallery.use")}
          </a>
        </div>
        {template.showcase ? (
          <a className="lw-template-live" href={template.showcase.path} target="_blank" rel="noopener" data-qa="template-live" aria-label={fill(t("world.gallery.liveOf"), name)}>
            {t("world.gallery.live")} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <p className="lw-template-live lw-template-soon" data-qa="template-no-live">{t("world.gallery.noLive")}</p>
        )}
      </div>
    </motion.li>
  );
};

/** The shop window: the desktop page with the phone layout leaning against it. */
const Window = ({ template, t }: { template: GalleryTemplate; t: Translate }) => {
  const desktop = template.previews.desktop ?? template.hero;
  const name = { template: template.label };
  return (
    <>
      <span className="lw-window-frame">
        <span className="lw-window-bar" aria-hidden="true"><i /><i /><i /></span>
        {desktop ? (
          <img className="lw-window-desktop" src={desktop} alt={fill(t("world.gallery.desktopAlt"), name)} loading="lazy" decoding="async" width={1280} height={800} />
        ) : (
          <span className="lw-window-blank" aria-hidden="true">{template.label}</span>
        )}
      </span>
      {template.previews.mobile && (
        <img className="lw-window-mobile" src={template.previews.mobile} alt={fill(t("world.gallery.mobileAlt"), name)} loading="lazy" decoding="async" width={420} height={909} />
      )}
    </>
  );
};

export function industryLabel(template: GalleryTemplate, t: Translate): string {
  return translated(t, `world.gallery.industry.${template.industry}`) ?? "";
}

/** Who the template is for, in the page language, or the template's own English description. */
export function audienceLabel(template: GalleryTemplate, t: Translate): string {
  return translated(t, `world.gallery.for.${template.industry}`) ?? template.audience;
}

export function modesLabel(template: GalleryTemplate, t: Translate): string {
  if (template.themes.length === 2) return t("world.gallery.modes");
  return template.themes.map((mode) => t(`world.gallery.${mode}`)).join(" · ");
}

export function languagesLabel(template: GalleryTemplate, t: Translate): string {
  if (template.locales.includes("en") && template.locales.includes("am")) return t("world.gallery.languages");
  return template.locales.map((locale) => t(locale === "am" ? "world.gallery.amharic" : "world.gallery.english")).join(" · ");
}

function translated(t: Translate, key: string): string | null {
  if (key.endsWith(".")) return null;
  const value = t(key);
  return value && value !== key ? value : null;
}

export default TemplateGallery;
