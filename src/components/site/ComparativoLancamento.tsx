import { Icon } from "@/components/Icon";
import { useReveal } from "@/hooks/use-reveal";

const LINHAS = [
  {
    dimensao: "Patrimônio",
    icon: "account_balance",
    pronto: "Você paga o preço já valorizado. O ganho do ciclo de obra ficou com outro comprador.",
    lancamento:
      "Entra na tabela de pré-obra e captura a valorização do ciclo construtivo até a entrega.",
  },
  {
    dimensao: "Tributação",
    icon: "receipt_long",
    pronto: "ITBI e registro incidem sobre o valor cheio, à vista, no ato da compra.",
    lancamento:
      "Custos de transmissão incidem sobre a base de aquisição inicial e são diluídos no cronograma.",
  },
  {
    dimensao: "Valorização",
    icon: "trending_up",
    pronto: "Valorização passa a depender apenas do mercado e do envelhecimento do imóvel.",
    lancamento: "Soma dois vetores: evolução da obra e maturação da região no mesmo período.",
  },
  {
    dimensao: "Fluxo financeiro",
    icon: "waterfall_chart",
    pronto: "Exige entrada alta e financiamento integral imediato.",
    lancamento:
      "Entrada parcelada, parcelas de obra e financiamento apenas na entrega — caixa preservado.",
  },
];

/** Blocos comparativos: comprar pronto × comprar lançamento. */
export function ComparativoLancamento() {
  return (
    <div className="mt-10 space-y-4">
      <div className="hidden grid-cols-[160px_1fr_1fr] gap-4 px-1 md:grid">
        <span className="t-caps text-muted-foreground">Dimensão</span>
        <span className="t-caps text-muted-foreground">Comprar pronto</span>
        <span className="t-caps text-gold">Comprar lançamento</span>
      </div>
      {LINHAS.map((l, i) => (
        <Linha key={l.dimensao} linha={l} delay={i * 70} />
      ))}
      <p className="pt-2 text-xs text-muted-foreground">
        Comparação estrutural de cenários, não recomendação de investimento. Cada caso depende de
        crédito, prazo e objetivo — avaliados no diagnóstico.
      </p>
    </div>
  );
}

function Linha({ linha, delay }: { linha: (typeof LINHAS)[number]; delay: number }) {
  const { ref, props } = useReveal<HTMLDivElement>(delay);
  return (
    <div
      ref={ref}
      {...props}
      className="reveal grid gap-3 md:grid-cols-[160px_1fr_1fr] md:items-stretch md:gap-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon name={linha.icon} size={18} className="shrink-0 text-muted-foreground" />
        <span className="truncate font-display text-base font-semibold tracking-tight">
          {linha.dimensao}
        </span>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-5">
        <p className="t-caps text-muted-foreground md:hidden">Comprar pronto</p>
        <p className="mt-2 text-sm text-muted-foreground md:mt-0">{linha.pronto}</p>
      </div>
      <div className="gold-rule rounded-lg border border-border bg-card p-5 shadow-e1">
        <p className="t-caps text-gold md:hidden">Comprar lançamento</p>
        <p className="mt-2 text-sm text-foreground md:mt-0">{linha.lancamento}</p>
      </div>
    </div>
  );
}
