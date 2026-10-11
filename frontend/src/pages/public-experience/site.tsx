import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider } from "@/public-experience/PublicExperienceProvider";
import { PublicSiteHome } from "@/public-experience/PublicSiteHome";
import type { PublishedSnapshot } from "@/public-experience/types";

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
    <PublicExperienceProvider key={pathname} locale={snapshot.locale}>
      <PublicSiteHome snapshot={snapshot} />
    </PublicExperienceProvider>
  );
};

export default PublicSitePage;
