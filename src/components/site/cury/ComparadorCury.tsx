import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Bloco } from "@/components/site/Bloco";
import { stagger } from "@/lib/site/motion";
import { empStatusLabels, formatBRL, segmentoLabels } from "@/lib/platform/comercial";
import { anoEntrega, ehMcmv, LAZER_ITENS, type CuryEmpreendimento } from "@/lib/site/cury";
import { MARCA } from "@/lib/site/posicionamento";
import { assinaturaFerragano } from "@/lib/site/signature";

/** GATE 06 — comparação premium de até três empreendimentos. */
export const LIMITE_COMPARACAO = 3;

function Campo({
  rotulo,
  destaque = false,
  children,
}: {
  rotulo: string;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border py-4">
      <dt className="t-caps text-muted-foreground">{rotulo}</dt>
      <dd
        className={
          destaque
            ? "mt-1.5 font-display text-lg font-semibold tracking-tight"
            : "mt-1.5 text-sm leading-relaxed"
        }
      >
        {children}
      </dd>
    </div>
  );
}

export function ComparadorCury({ itens }: { itens: CuryEmpreendimento[] }) {
  if (!itens.length) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Selecione até {LIMITE_COMPARACAO} empreendimentos no catálogo para comparar lado a lado.
      </p>
    );
  }

  const melhorScore = Math.max(
    ...itens.map((e) => assinaturaFerragano(e).score),
  );

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {itens.map((e, i) => {
        const a = assinaturaFerragano(e);
        const lider = a.score === melhorScore && itens.length > 1;
        return (
          <Bloco
            as="article"
            key={e.id}
            delay={stagger(i)}
            className={`flex flex-col rounded-2xl border bg-card p-6 ${
              lider ? "border-gold/60 shadow-[var(--elevation-2)]" : "border-border"
            }`}
          >
            <header>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="t-caps text-gold">{segmentoLabels[e.segmento]}</p>
                  <h3 className="mt-2 font-display text-2xl leading-tight font-semibold tracking-tight">
                    {e.nome}
                  </h3>
                </div>
                {lider && <Badge variant="gold">Melhor score</Badge>}
              </div>
              <div
                className="mt-5 flex items-baseline gap-2"
                aria-label={`Score ${MARCA}: ${a.score.toFixed(1)} de 10`}
              >
                <span className="font-display text-4xl font-semibold tracking-tight">
                  {a.score.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">Score {MARCA} · 0 a 10</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gold transition-[width] duration-700"
                  style={{ width: `${a.score * 10}%` }}
                />
              </div>
            </header>

            <dl className="mt-6 grow">
              <Campo rotulo="Localização">
                {[e.bairro, e.cidade, e.uf].filter(Boolean).join(", ") || "A confirmar"}
              </Campo>
              <Campo rotulo="A partir de" destaque>
                {formatBRL(e.preco_min)}
                {e.preco_max ? (
                  <span className="block text-xs font-normal text-muted-foreground">
                    até {formatBRL(e.preco_max)}
                  </span>
                ) : null}
              </Campo>
              <Campo rotulo="Metragem privativa">
                {e.area_min && e.area_max
                  ? `${e.area_min.toFixed(0)} a ${e.area_max.toFixed(0)} m²`
                  : "A confirmar"}
              </Campo>
              <Campo rotulo="Dormitórios">
                {e.dormitorios.length
                  ? e.dormitorios.map((d) => `${d} dorm.`).join(" · ")
                  : "A confirmar"}
              </Campo>
              <Campo rotulo="Varanda">
                {e.segmento === "comercial" ? "Não aplicável" : "Prevista no memorial"}
              </Campo>
              <Campo rotulo="Lazer">
                <span className="flex flex-wrap gap-1.5">
                  {LAZER_ITENS.slice(0, 6).map((l) => (
                    <span
                      key={l.nome}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
                    >
                      <Icon name={l.icone} size={14} className="text-primary" />
                      {l.nome}
                    </span>
                  ))}
                </span>
              </Campo>
              <Campo rotulo="Entrega">
                {anoEntrega(e.entrega_prevista)}
                <span className="block text-xs text-muted-foreground">
                  {empStatusLabels[e.status]}
                </span>
              </Campo>
              <Campo rotulo="Diferenciais">
                {ehMcmv(e) && (
                  <Badge variant="gold" className="mb-2">
                    Elegível ao MCMV
                  </Badge>
                )}
                <span className="block text-xs text-muted-foreground">
                  {e.descricao ?? "Ficha técnica oficial em liberação."}
                </span>
              </Campo>
              <Campo rotulo={`Leitura ${MARCA}`}>
                <span className="text-xs leading-relaxed text-muted-foreground">{a.fortes[0]}</span>
              </Campo>
              <Campo rotulo="Disponibilidade">
                {e.disponiveis} de {e.total_unidades} unidades
              </Campo>
            </dl>

            <Link
              to="/empreendimentos/cury/$slug"
              params={{ slug: e.slug }}
              className="press mt-6 inline-flex h-12 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Conhecer {e.nome}
              <Icon name="arrow_forward" size={16} />
            </Link>
          </Bloco>
        );
      })}
    </div>
  );
}