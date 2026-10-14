import { MotionConfig } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useBrandedTranslation } from "@/lib/platform-brand";
import Sky from "../day/components/Sky";
import TemplateGallery from "../day/components/TemplateGallery";
import TopBar from "../day/components/TopBar";
import { WORLDS } from "../day/world";
import { useEntryLinks } from "../shared/useEntryLinks";
import "../day/landing.css";

const HOUR = WORLDS.find((world) => world.id === "gallery")?.hour ?? 23;

/** `/templates`: the landing page's template gallery on its own, to link and share. */
const TemplatesPage = () => {
  const { t, language } = useBrandedTranslation();
  const entry = useEntryLinks();
  return (
    <MotionConfig reducedMotion="user">
      <div className="lw lw-templates-page" data-world="gallery" data-qa="templates-page">
        <Helmet>
          <html lang={language} />
          <title>{t("world.gallery.pageTitle")}</title>
          <meta name="description" content={t("world.gallery.pageDescription")} />
        </Helmet>
        <Sky hour={HOUR} />
        <TopBar hour={HOUR} entry={entry} templatesHref="/templates" onTemplates />
        <main className="lw-main">
          <TemplateGallery entry={entry} heading="h1" />
          <footer className="lw-wrap lw-templates-foot">
            <a href="/" data-qa="templates-back">← {t("world.gallery.backToStory")}</a>
            <span>{t("world.night.fiction")}</span>
          </footer>
        </main>
      </div>
    </MotionConfig>
  );
};

export default TemplatesPage;
