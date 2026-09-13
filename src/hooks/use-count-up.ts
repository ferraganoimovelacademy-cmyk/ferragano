import { useEffect, useRef, useState } from "react";
import { MOTION } from "@/lib/site/motion";

/**
 * Contador que só anima quando o elemento entra na viewport.
 * Respeita prefers-reduced-motion (mostra o valor final direto).
 */
export function useCountUp(target: number, durationMs = MOTION.duration.cinema) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduzido =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduzido || typeof IntersectionObserver === "undefined") {
      setValor(target);
      return;
    }

    let raf = 0;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        const inicio = performance.now();
        const tick = (agora: number) => {
          const t = Math.min((agora - inicio) / durationMs, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setValor(Math.round(target * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  return { ref, valor };
}
