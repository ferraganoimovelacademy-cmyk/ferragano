import { Icon } from "@/components/Icon";
import { stagger } from "@/lib/site/motion";

const LINHAS = [
  {
    tema: "Ponto de partida",
    antes: "Escolhe o imóvel e depois descobre quanto o banco aprova.",
    depois: "Diagnóstico de crédito primeiro; a curadoria já nasce dentro do limite real.",
  },
  {
    tema: "Curadoria",
    antes: "Vê tudo que está em estoque na imobiliária.",
    depois: "Vê de três a cinco produtos compatíveis com objetivo, prazo e renda.",
  },
  {
    tema: "Negociação",
    antes: "Aceita a tabela apresentada.",
    depois: "Entrada, fluxo de obra e desconto negociados direto com a incorporadora.",
  },
  {
    tema: "Depois da assinatura",
    antes: "Fica sozinho com o contrato e o reajuste.",
    depois: "Responsável nomeado acompanha repasse, obra e vistoria até as chaves.",
  },
];

/** GATE 04 — Before × After: mostra a mudança de método, não o produto. */
export function AntesDepois() {
  return (
    <div className="mt-10">
      <div className="hidden gap-4 md:grid md:grid-cols-[160px_1fr_1fr]">
        <span />
        <p className="t-caps text-muted-foreground">Mercado tradicional</p>
        <p className="t-caps text-gold">Com a Ferragano</p>
      </div>
      <div className="mt-3 grid gap-3">
        {LINHAS.map((l, i) => (
          <div
            key={l.tema}
            className="grid gap-3 md:grid-cols-[160px_1fr_1fr] md:items-stretch"
            style={{ transitionDelay: `${stagger(i)}ms` }}
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <Icon name="chevron_right" size={16} aria-hidden className="text-gold" />
              {l.tema}
            </p>
            <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <span className="t-caps mb-1 block text-muted-foreground md:hidden">
                Mercado tradicional
              </span>
              {l.antes}
            </p>
            <p className="hover-lift rounded-xl border border-gold/40 bg-card p-4 text-sm">
              <span className="t-caps mb-1 block text-gold md:hidden">Com a Ferragano</span>
              {l.depois}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
