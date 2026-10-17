import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { TemplateProps } from "../types";
const Panel = lazy(() =>
  import("./BookingPanel").then((module) => ({ default: module.BookingPanel })),
);

export function Reservation({
  props,
  immediate = false,
}: {
  props: TemplateProps;
  immediate?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(immediate);
  useEffect(() => {
    if (ready || !root.current) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [ready]);
  const placeholder = (
    <div className="buna3-reserve-placeholder" aria-hidden="true" />
  );
  return (
    <div ref={root} id="reserve">
      {ready ? (
        <Suspense fallback={placeholder}>
          <Panel props={props} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
