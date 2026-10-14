import { useEffect, useState, type RefObject } from "react";

/**
 * Which section is in the middle of the screen, for section dots or a section nav on long pages.
 * Sections are the root's `[data-section]` elements with an `id`; the label is `data-section`.
 */
export function useSectionProgress(root: RefObject<HTMLElement | null>, key: unknown = null): { sections: Array<{ id: string; label: string }>; active: number } {
  const [sections, setSections] = useState<Array<{ id: string; label: string }>>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    const items = Array.from(node.querySelectorAll<HTMLElement>("[data-section][id]"));
    setSections(items.map((item) => ({ id: item.id, label: item.dataset.section || "" })));
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement));
    }, { rootMargin: "-45% 0px -50% 0px" });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [root, key]);
  return { sections, active };
}
