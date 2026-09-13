import { Icon } from "@/components/Icon";
import { useReveal } from "@/hooks/use-reveal";

export const ETAPAS = [
  {
    icon: "stethoscope",
    titulo: "Diagnóstico",
    texto:
      "Renda, reservas, crédito disponível e objetivo real: moradia, renda ou construção de patrimônio.",
  },
  {
    icon: "event_note",
    titulo: "Planejamento",
    texto: "Definição de tese: prazo, tipo de produto, região e fluxo de pagamento suportável.",
  },
  {
    icon: "filter_alt",
    titulo: "Seleção",
    texto: "Curadoria de lançamentos compatíveis com a tese — normalmente três, nunca trinta.",
  },
  {
    icon: "tour",
    titulo: "Visita",
    texto: "Visita técnica com leitura de planta, memorial, entorno e cronograma de obra.",
  },
  {
    icon: "handshake",
    titulo: "Negociação",
    texto: "Tabela, entrada, parcelas de obra e desconto direto com a construtora.",
  },
  {
    icon: "task_alt",
    titulo: "Compra",
    texto: "Contrato revisado, financiamento estruturado e cronograma financeiro assinado.",
  },
  {
    icon: "support_agent",
    titulo: "Acompanhamento",
    texto:
      "Da assinatura às chaves — e depois: locação, valorização e próximo passo do patrimônio.",
  },
];

/** Timeline do Método Ferragano com entrada escalonada por scroll. */
export function MetodoTimeline() {
  return (
    <ol className="relative mt-10 space-y-4 border-l border-border pl-6 md:space-y-6 md:pl-10">
      {ETAPAS.map((e, i) => (
        <Etapa key={e.titulo} etapa={e} indice={i} />
      ))}
    </ol>
  );
}

function Etapa({ etapa, indice }: { etapa: (typeof ETAPAS)[number]; indice: number }) {
  const { ref, props } = useReveal<HTMLLIElement>(indice * 80);
  return (
    <li ref={ref} {...props} className="reveal relative">
      <span
        aria-hidden
        className="absolute top-6 -left-[31px] grid size-6 place-items-center rounded-full border border-border bg-background md:-left-[47px]"
      >
        <span className="size-2 rounded-full bg-gold" />
      </span>
      <article className="panel glass-pane flex min-w-0 items-start gap-4 p-6 transition-all duration-300 hover:shadow-e3 hover:bg-gold/5">
        <Icon name={etapa.icon} size={22} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="t-caps text-muted-foreground">Etapa {indice + 1}</p>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">{etapa.titulo}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{etapa.texto}</p>
        </div>
      </article>
    </li>
  );
}
