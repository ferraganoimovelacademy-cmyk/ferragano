import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { useReveal } from "@/hooks/use-reveal";

/**
 * Ferragano Insights — leitura pública de mercado.
 * ADR-023/024: dado externo nunca se mistura ao interno e toda afirmação
 * declara natureza (observação, tendência ou contexto) e fonte.
 */
type Natureza = "observacao" | "tendencia" | "contexto";

const NATUREZA: Record<Natureza, { rotulo: string; variante: "secondary" | "gold" | "outline" }> = {
  observacao: { rotulo: "Observação", variante: "secondary" },
  tendencia: { rotulo: "Tendência", variante: "gold" },
  contexto: { rotulo: "Contexto", variante: "outline" },
};

const INSIGHTS: {
  natureza: Natureza;
  titulo: string;
  texto: string;
  fonte: string;
  periodo: string;
}[] = [
  {
    natureza: "observacao",
    titulo: "Zona Oeste concentra os lançamentos do trimestre",
    texto:
      "Vila Leopoldina, Lapa e Água Branca respondem pela maior parte dos novos estandes abertos na região no período observado.",
    fonte: "Coleta pública de lançamentos · Market Intelligence Ferragano",
    periodo: "Últimos 90 dias",
  },
  {
    natureza: "tendencia",
    titulo: "Unidades compactas saem antes das metragens grandes",
    texto:
      "A velocidade de vendas de plantas de 1 e 2 dormitórios tem se mantido acima das de 3 dormitórios nos empreendimentos acompanhados.",
    fonte: "Séries de acompanhamento de estandes · Market Intelligence Ferragano",
    periodo: "Série de 12 meses",
  },
  {
    natureza: "contexto",
    titulo: "Custo de obra pressiona tabela de pré-lançamento",
    texto:
      "Índices setoriais de custo de construção seguem acima da inflação geral, o que costuma antecipar reajustes de tabela.",
    fonte: "Índices setoriais públicos de custo de construção",
    periodo: "Referência do último fechamento divulgado",
  },
];

export function FerraganoInsights() {
  return (
    <div className="mt-10 space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {INSIGHTS.map((item, i) => (
          <Card key={item.titulo} item={item} delay={i * 80} />
        ))}
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        Leitura de mercado com base em dados externos e públicos. Não é recomendação de
        investimento, não usa dados de clientes e não garante resultado futuro.
      </p>
    </div>
  );
}

function Card({ item, delay }: { item: (typeof INSIGHTS)[number]; delay: number }) {
  const { ref, props } = useReveal<HTMLElement>(delay);
  const meta = NATUREZA[item.natureza];
  return (
    <article ref={ref} {...props} className="reveal panel flex h-full flex-col p-6">
      <Badge variant={meta.variante} className="w-fit text-[10px]">
        {meta.rotulo}
      </Badge>
      <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{item.titulo}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.texto}</p>
      <footer className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Fonte:</span> {item.fonte}
        </p>
        <p className="mt-1">{item.periodo}</p>
      </footer>
    </article>
  );
}
