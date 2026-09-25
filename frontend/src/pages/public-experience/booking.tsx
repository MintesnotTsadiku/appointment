import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider, usePublicExperience } from "@/public-experience/PublicExperienceProvider";
import { publicRootForSlug } from "@/public-experience/routes";
import { getTemplatePackage } from "@/public-experience/templates/registry";
import type { PublishedSnapshot } from "@/public-experience/types";
import "@/public-experience/platform.css";

function BookingHandoff({ snapshot, slug }: { snapshot: PublishedSnapshot; slug?: string }) {
  const { config, theme } = usePublicExperience();
  const rootStyle = theme.variables as CSSProperties;
  const publicRoot = publicRootForSlug(slug);
  const template = getTemplatePackage(snapshot.compiledDesign.layout.rendererKey);
  if (!template) return <main data-pe-unsupported className="p-8">Unsupported public template</main>;
  const BookingTemplate = template.Booking;
  return <BookingTemplate
    snapshot={snapshot}
    locale={snapshot.locale}
    applicationName={config.identity.applicationName}
    publicRoot={publicRoot}
    rootStyle={rootStyle}
    bookingPath={snapshot.bookingPath}
  />;
}

const PublicBookingPage = () => {
  const { slug, locale } = useParams<{ slug: string; locale?: string }>();
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPublishedSnapshot(locale).then((next) => {
      if (active) { setSnapshot(next); setResolved(true); }
    });
    return () => { active = false; };
  }, [locale]);

  if (!resolved) return <div data-pe-loading className="p-8 text-sm">Loading public experience…</div>;
  if (!snapshot) {
    return (
      <main data-pe-unavailable className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Booking unavailable</h1>
        <p className="mt-2 text-sm">This address does not have an active published release.</p>
      </main>
    );
  }
  return (
    <PublicExperienceProvider locale={snapshot.locale}>
      <BookingHandoff snapshot={snapshot} slug={slug} />
    </PublicExperienceProvider>
  );
};

export default PublicBookingPage;
