import { useEffect, useState } from "react";

/**
 * Sprint UI 06 — navegação cinematográfica entre as seções do empreendimento.
 * Sticky, com scrollspy por IntersectionObserver e rolagem suave respeitando
 * `prefers-reduced-motion`. Acessível: lista de links reais com aria-current.
 */
export type SecaoNav = { id: string; rotulo: string };

export function NavSecoes({ secoes }: { secoes: SecaoNav[] }) {
  const [ativa, setAtiva] = useState(secoes[0]?.id ?? "");

  useEffect(() => {
    const alvos = secoes
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!alvos.length) return;

    const observer = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel?.target.id) setAtiva(visivel.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.01, 0.25, 0.5] },
    );
    alvos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [secoes]);

  return (
    <nav
      aria-label="Seções do empreendimento"
      className="sticky top-16 z-30 border-y border-border bg-background/85 backdrop-blur-md"
    >
      <ul className="mx-auto flex w-full max-w-[1200px] gap-1 overflow-x-auto px-4 py-2 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {secoes.map((s) => {
          const atual = ativa === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={atual ? "true" : undefined}
                onClick={(ev) => {
                  const el = document.getElementById(s.id);
                  if (!el) return;
                  ev.preventDefault();
                  const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
                  el.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
                  setAtiva(s.id);
                }}
                className={`inline-flex h-10 items-center rounded-full px-4 text-sm transition-colors ${
                  atual
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {s.rotulo}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}