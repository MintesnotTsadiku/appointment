import { Helmet } from "react-helmet-async";
import { useLandingPageSettingsContext } from "@/context/landingPageSettings";
import { useTranslation } from "@/lib/i18n";

/** Title and description; the platform CMS SEO fields win when an admin set them. */
const LandingHead = () => {
  const { t, language } = useTranslation();
  const { settings } = useLandingPageSettingsContext();
  const pick = (value?: { en: string; am: string }) => (value ? value[language as "en" | "am"] || value.en : "");
  return (
    <Helmet>
      <html lang={language} />
      <title>{pick(settings?.seo?.title) || t("world.meta.title")}</title>
      <meta name="description" content={pick(settings?.seo?.description) || t("world.meta.description")} />
    </Helmet>
  );
};

export default LandingHead;
