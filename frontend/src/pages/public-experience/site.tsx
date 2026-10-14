import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider } from "@/public-experience/PublicExperienceProvider";
import { PublicSiteHome } from "@/public-experience/PublicSiteHome";
import type { PublishedSnapshot } from "@/public-experience/types";
import { PublicLoading, PublicUnavailable } from "@/public-experience/PublicStates";
import { previewState } from "@/components/booking-states";

/** The current path for a former site address, or null. */
async function formerAddressTarget(pathname: string, search: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ path: `${pathname}${search}` });
    const response = await fetch(`/api/method/appointment.growth.short_links.resolve?${params}`, { credentials: "same-origin" });
    if (!response.ok) return null;
    const body = (await response.json()) as { message?: string | null };
    return typeof body.message === "string" && body.message.startsWith("/") && !body.message.startsWith("//") ? body.message : null;
  } catch {
    return null;
  }
}

const PublicSitePage = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { locale } = useParams<{ slug: string; locale?: string }>();
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    setResolved(false);
    fetchPublishedSnapshot(locale).then(async (next) => {
      // A former address (changed on the owner's Grow page) forwards to the current one.
      const moved = next ? null : await formerAddressTarget(pathname, search);
      if (!active) return;
      if (moved) {
        navigate(moved, { replace: true });
        return;
      }
      setSnapshot(next);
      setResolved(true);
    });
    return () => {
      active = false;
    };
  }, [locale, pathname, search, navigate]);

  useEffect(() => {
    const title = snapshot?.seo?.title;
    if (typeof title === "string" && title) document.title = title;
  }, [snapshot]);

  if (!resolved) return <PublicLoading />;
  if (!snapshot) return <PublicUnavailable kind="unavailable" />;

  return (
    <PublicExperienceProvider key={pathname} locale={snapshot.locale}>
      {/* Development only: `?preview-state=loading` holds the template's own loading screen. */}
      <PublicSiteHome snapshot={snapshot} forceLoading={previewState() === "loading"} />
    </PublicExperienceProvider>
  );
};

export default PublicSitePage;
