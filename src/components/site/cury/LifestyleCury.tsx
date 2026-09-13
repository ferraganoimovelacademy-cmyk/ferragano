import { Icon } from "@/components/Icon";
import { Bloco } from "@/components/site/Bloco";
import { LIFESTYLE_CENAS } from "@/lib/site/signature";
import { stagger } from "@/lib/site/motion";

/** GATE 03 — Lazer apresentado como experiência, não como lista de itens. */
export function LifestyleCury() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {LIFESTYLE_CENAS.map((c, i) => (
        <Bloco
          key={c.id}
          as="article"
          delay={stagger(i)}
          className="press group flex flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-7 hover:border-primary/60"
        >
          <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-soft-foreground transition-transform group-hover:scale-110">
            <Icon name={c.icone} size={24} />
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight">{c.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.texto}</p>
          </div>
        </Bloco>
      ))}
    </div>
  );
}