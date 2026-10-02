import { useReducedMotion, useInView } from "framer-motion";
import { useEffect, useState, type RefObject } from "react";

/**
 * Loops a small story through `count` steps while its stage is on screen.
 * Reduced motion shows the finished story without looping.
 */
export function useStoryStep(ref: RefObject<Element>, count: number, interval = 2200): number {
  const reduced = useReducedMotion();
  const inView = useInView(ref, { amount: 0.4 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced || !inView) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % count), interval);
    return () => window.clearInterval(timer);
  }, [reduced, inView, count, interval]);

  return reduced ? count - 1 : step;
}
