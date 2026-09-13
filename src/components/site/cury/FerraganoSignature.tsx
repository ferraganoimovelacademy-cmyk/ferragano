import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Bloco } from "@/components/site/Bloco";
import { stagger } from "@/lib/site/motion";
import { MARCA, RESPONSAVEL } from "@/lib/site/posicionamento";
import type { Assinatura } from "@/lib/site/signature";

/**
 * GATE 06.5 — Ferragano Signature.
 * Análise consultiva da Ferragano sobre o empreendimento, com nota por eixo.
 * Não substitui a informação oficial da construtora — é leitura de consultoria.
 */
export function FerraganoSignature({
  a,
  nome,
  extra,
}: {
  a: Assinatura;
  nome: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="gold">
            <Icon name="star" size={14} className="mr-1 align-[-2px]" />
            {MARCA} Recomenda
          </Badge>
          <span className="text-xs text-muted-foreground">Análise consultiva · {RESPONSAVEL}</span>
        </div>

        <p className="gold-rule mt-6 pl-5 font-display text-xl leading-relaxed tracking-tight md:text-2xl">
          {a.resumo}
        </p>

        {extra ? <div className="mt-8">{extra}</div> : null}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Esta análise é opinião da {MARCA} sobre {nome} e não substitui as informações oficiais da
          construtora. Notas derivam de critérios próprios de curadoria (localização, tipologia,
          preço por m², estágio de obra e disponibilidade).
        </p>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <p className="t-caps text-muted-foreground">Score {MARCA}</p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            {a.score.toFixed(1)}
            <span className="text-base font-normal text-muted-foreground">/10</span>
          </p>
        </div>

        <ul className="mt-6 space-y-5">
          {a.notas.map((n, i) => (
            <Bloco as="div" key={n.id} delay={stagger(i)}>
              <li className="list-none">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon name={n.icone} size={16} className="text-primary" />
                    {n.rotulo}
                  </span>
                  <span className="t-data text-sm">{n.nota.toFixed(1)}</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${n.rotulo}: nota ${n.nota.toFixed(1)} de 10`}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-700"
                    style={{ width: `${n.nota * 10}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{n.leitura}</p>
              </li>
            </Bloco>
          ))}
        </ul>
      </aside>
    </div>
  );
}