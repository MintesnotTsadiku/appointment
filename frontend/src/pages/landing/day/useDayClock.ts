import { useEffect, useState } from "react";
import { WORLDS, hourAt } from "./world";

export interface DayClock {
  index: number;
  hour: number;
}

/**
 * Tracks which world holds the middle of the viewport and how far through it
 * the visitor is. Worlds are found by their `data-world-section` attribute.
 */
export function useDayClock(): DayClock {
  const [clock, setClock] = useState<DayClock>({ index: 0, hour: WORLDS[0].hour });

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = readClock();
      setClock((current) =>
        current.index === next.index && Math.abs(current.hour - next.hour) < 1 / 12 ? current : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return clock;
}

function readClock(): DayClock {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-world-section]"));
  const middle = window.innerHeight / 2;
  for (const section of sections) {
    const box = section.getBoundingClientRect();
    if (box.top <= middle && box.bottom > middle) {
      const index = WORLDS.findIndex((world) => world.id === section.dataset.worldSection);
      const fraction = (middle - box.top) / Math.max(1, box.height);
      return { index, hour: hourAt(index, fraction) };
    }
  }
  const atEnd = sections.length > 0 && sections[sections.length - 1].getBoundingClientRect().bottom <= middle;
  const index = atEnd ? WORLDS.length - 1 : 0;
  return { index, hour: WORLDS[index].hour };
}
