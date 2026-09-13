import { Icon } from "@/components/Icon";
import { DIFERENCIAIS_CURY } from "@/lib/site/posicionamento";

/**
 * Autoridade da construtora parceira dentro da experiência Ferragano.
 * Cards grandes, muito respiro, dourado só no ícone.
 */
export function PorQueCury() {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {DIFERENCIAIS_CURY.map((d, i) => (
        <article
          key={d.titulo}
          className="hover-lift rounded-2xl border border-border bg-background p-7"
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-gold/12 text-gold">
            <Icon name={d.icon} size={24} aria-hidden />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{d.titulo}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{d.texto}</p>
        </article>
      ))}
    </div>
  );
}
