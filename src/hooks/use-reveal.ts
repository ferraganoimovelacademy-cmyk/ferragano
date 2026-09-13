import { useEffect, useRef, useState } from "react";

/**
 * Revela um bloco quando ele entra na viewport. Apenas apresentação:
 * o conteúdo já está no DOM (SSR/SEO preservados).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(delayMs = 0) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [revealed]);

  return {
    ref,
    props: {
      "data-revealed": revealed ? "true" : "false",
      style: delayMs ? { animationDelay: `${delayMs}ms` } : undefined,
    },
  };
}
