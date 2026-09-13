import { useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Linha do tempo do mercado — recorte público e observacional.
 * Nenhum dado interno de cliente ou workspace é exibido (ADR-023).
 */
const MARCOS = [
  {
    ano: "2020",
    titulo: "Juro baixo e crédito abundante",
    texto: "Financiamento barato amplia a demanda por lançamentos e reduz o tempo de venda.",
  },
  {
    ano: "2021",
    titulo: "Custo de obra em alta",
    texto: "Insumos pressionam o custo de construção e as tabelas de pré-lançamento reagem.",
  },
  {
    ano: "2022",
    titulo: "Aperto monetário",
    texto: "Juro mais alto encurta o prazo aceitável e valoriza fluxo de pagamento flexível.",
  },
  {
    ano: "2023",
    titulo: "Compactos dominam a oferta",
    texto: "Produto menor e melhor localizado passa a liderar a velocidade de vendas.",
  },
  {
    ano: "2024",
    titulo: "Eixos de transporte concentram lançamentos",
    texto: "Regiões com metrô e trem consolidado atraem a maior parte dos novos projetos.",
  },
  {
    ano: "2025",
    titulo: "Seleção por qualidade de projeto",
    texto: "Diferença de desempenho entre bons e maus projetos se amplia no mesmo bairro.",
  },
];

export function LinhaDoTempoMercado() {
  const [ativo, setAtivo] = useState(MARCOS.length - 1);
  const marco = MARCOS[ativo]!;

  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label="Anos da linha do tempo do mercado"
        className="hide-scrollbar flex gap-2 overflow-x-auto pb-2"
      >
        {MARCOS.map((m, i) => (
          <button
            key={m.ano}
            role="tab"
            type="button"
            aria-selected={i === ativo}
            onClick={() => setAtivo(i)}
            className={`t-data min-h-11 shrink-0 rounded-md border px-4 transition-colors ${
              i === ativo
                ? "border-primary bg-primary-soft text-primary-soft-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {m.ano}
          </button>
        ))}
      </div>
      <article className="panel mt-4 p-6">
        <p className="t-caps text-gold">Contexto de mercado · {marco.ano}</p>
        <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{marco.titulo}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{marco.texto}</p>
        <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <Icon name="policy" size={14} className="mt-0.5 shrink-0" />
          Recorte observacional a partir de fontes públicas de mercado. Correlação não implica
          causalidade.
        </p>
      </article>
    </div>
  );
}
