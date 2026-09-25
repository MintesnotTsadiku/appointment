import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider } from "@/public-experience/PublicExperienceProvider";
import { PublicSiteHome } from "@/public-experience/PublicSiteHome";
import type { PublishedSnapshot } from "@/public-experience/types";

const PublicSitePage = () => {
  const { locale } = useParams<{ slug: string; locale?: string }>();
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    setResolved(false);
    fetchPublishedSnapshot(locale).then((next) => {
      if (active) {
        setSnapshot(next);
        setResolved(true);
      }
    });
    return () => {
      active = false;
    };
  }, [locale]);

  useEffect(() => {
    const title = snapshot?.seo?.title;
    if (typeof title === "string" && title) document.title = title;
  }, [snapshot]);

  if (!resolved) {
    return <div data-pe-loading className="p-8 text-sm">Loading public experience…</div>;
  }

  if (!snapshot) {
    return (
      <main data-pe-unavailable className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">Public experience unavailable</h1>
        <p className="mt-2 text-sm">This address does not have an active published release.</p>
      </main>
    );
  }

  return (
    <PublicExperienceProvider locale={snapshot.locale}>
      <PublicSiteHome snapshot={snapshot} />
    </PublicExperienceProvider>
  );
};

export default PublicSitePage;
