import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Bloco } from "@/components/site/Bloco";
import { SONHOS } from "@/lib/site/sonhos";

/**
 * Sprint UI 05 — seção emocional "Seu sonho".
 * Quatro objetivos de vida, cada um levando ao portfólio Cury já filtrado.
 */
export function SeuSonho() {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2">
      {SONHOS.map((s, i) => (
        <Bloco key={s.id} as="article" delay={i * 80} className="min-w-0">
          <Link
            to="/empreendimentos/cury"
            search={{ q: "", dorm: "", faixa: "", status: "", sel: "", ...s.filtro }}
            className="group flex h-full min-w-0 flex-col gap-4 rounded-[24px] border border-border bg-card/70 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-e3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-gold/15 group-hover:text-gold">
              <Icon name={s.icone} size={24} />
            </span>

            <div className="min-w-0">
              <p className="t-caps text-gold">{s.eyebrow}</p>
              <h3 className="mt-2 font-display text-xl font-semibold tracking-tight md:text-2xl">
                {s.titulo}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.texto}</p>
            </div>

            <ul className="mt-auto flex flex-wrap gap-2 pt-2">
              {s.marcadores.map((m) => (
                <li
                  key={m}
                  className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground"
                >
                  {m}
                </li>
              ))}
            </ul>

            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Ver empreendimentos indicados
              <Icon
                name="arrow_forward"
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </Link>
        </Bloco>
      ))}
    </div>
  );
}
