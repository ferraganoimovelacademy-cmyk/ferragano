import { Icon } from "@/components/Icon";
import { useCountUp } from "@/hooks/use-count-up";
import { CARD_MOTION, stagger } from "@/lib/site/motion";

export type Estatistica = {
  valor: number;
  sufixo?: string;
  prefixo?: string;
  label: string;
  nota?: string;
  icon: string;
};

function Numero({ valor, prefixo, sufixo }: { valor: number; prefixo?: string; sufixo?: string }) {
  const { ref, valor: atual } = useCountUp(valor);
  return (
    <span ref={ref} className="font-mono text-3xl tabular-nums md:text-4xl">
      {prefixo}
      {atual.toLocaleString("pt-BR")}
      {sufixo}
    </span>
  );
}

/** GATE 04 — Statistic Cards com contador padronizado pelo Motion System. */
export function Estatisticas({ itens }: { itens: Estatistica[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((e, i) => (
        <div
          key={e.label}
          className={`${CARD_MOTION} glass-pane p-6 transition-all hover:bg-gold/5`}
          style={{ transitionDelay: `${stagger(i)}ms` }}
        >
          <Icon name={e.icon} size={22} aria-hidden className="text-gold" />
          <dd className="mt-4 font-display font-semibold">
            <Numero valor={e.valor} prefixo={e.prefixo} sufixo={e.sufixo} />
          </dd>
          <dt className="mt-2 text-sm font-medium">{e.label}</dt>
          {e.nota && <p className="mt-1 text-xs text-muted-foreground">{e.nota}</p>}
        </div>
      ))}
    </dl>
  );
}
