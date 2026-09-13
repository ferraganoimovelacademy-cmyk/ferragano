import { useEffect, useRef } from "react";

/**
 * Parallax discreto: desloca o elemento em fração da rolagem.
 * Desligado sob prefers-reduced-motion.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(fator = 0.12) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const aplicar = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const centro = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-centro * fator).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(aplicar);
    };
    aplicar();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [fator]);

  return ref;
}
