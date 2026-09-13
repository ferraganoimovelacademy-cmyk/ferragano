import { useEffect, useState } from "react";

/**
 * Sprint UI 07 · Gate 05 — fio dourado de progresso de leitura no topo.
 * Apenas apresentação: não interfere em foco, leitura de tela ou layout.
 */
export function ScrollProgress() {
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      setProgresso(total <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / total)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-gold/40 via-gold to-gold/70 transition-[transform] duration-150 ease-out"
        style={{ transform: `scaleX(${progresso})` }}
      />
    </div>
  );
}
