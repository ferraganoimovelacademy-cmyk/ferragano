import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { MidiaOficial } from "@/components/site/cury/MidiaOficial";
import { useReveal } from "@/hooks/use-reveal";
import { useParallax } from "@/hooks/use-parallax";
import { empStatusLabels, formatBRL } from "@/lib/platform/comercial";
import { anoEntrega, ehMcmv, type CuryEmpreendimento } from "@/lib/site/cury";

/**
 * Sprint UI 04 — GATE 02.
 * Vitrine cinematográfica: cada empreendimento ocupa quase uma tela,
 * com imagem full-width, painel de vidro fosco e zoom suave no hover.
 * Apresentação apenas — nenhuma regra de negócio aqui.
 */
function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{rotulo}</dt>
      <dd className="mt-0.5 font-display text-base font-semibold md:text-lg">{valor}</dd>
    </div>
  );
}

function Painel({
  e,
  marcado,
  onComparar,
}: {
  e: CuryEmpreendimento;
  marcado: boolean;
  onComparar: () => void;
}) {
  const { ref, props } = useReveal<HTMLDivElement>();
  const midiaRef = useParallax<HTMLDivElement>(0.06);

  return (
    <article
      ref={ref}
      {...props}
      className="reveal-blur cine-frame group relative overflow-hidden rounded-2xl border border-border"
    >
      <div ref={midiaRef} className="cine-media">
        <MidiaOficial
          src={e.capa_url}
          alt={`${e.nome} — ${[e.bairro, e.cidade].filter(Boolean).join(", ") || "São Paulo"}`}
          proporcao="aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[64vh]"
          sizes="(min-width: 1024px) 1200px, 100vw"
          slot={{
            titulo: e.nome,
            icone: "apartment",
            nota: "Perspectiva oficial em liberação pela construtora.",
          }}
        />
      </div>

      <div className="glass-pane absolute inset-x-3 bottom-3 p-6 md:inset-x-10 md:bottom-10 md:max-w-2xl md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{empStatusLabels[e.status]}</Badge>
          {ehMcmv(e) && <Badge variant="gold">Minha Casa Minha Vida</Badge>}
        </div>

        <h2 className="mt-4 font-display text-3xl leading-[1.02] font-semibold tracking-tight md:mt-6 md:text-6xl">
          {e.nome}
        </h2>
        <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Icon name="location_on" size={16} />
          {[e.bairro, e.cidade, e.uf].filter(Boolean).join(", ") || "Local a confirmar"}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4 md:mt-10">
          <Linha rotulo="A partir de" valor={formatBRL(e.preco_min)} />
          <Linha
            rotulo="Tipologias"
            valor={e.dormitorios.length ? `${e.dormitorios.join(" e ")} dorm.` : "—"}
          />
          <Linha rotulo="Metragem" valor={e.area_min ? `${e.area_min.toFixed(0)} m²+` : "—"} />
          <Linha rotulo="Entrega" valor={anoEntrega(e.entrega_prevista)} />
        </dl>

        <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
          <Link
            to="/empreendimentos/cury/$slug"
            params={{ slug: e.slug }}
            className="press group/cta inline-flex h-11 items-center gap-2 rounded-md border border-foreground/20 px-5 text-sm font-medium hover:border-gold hover:text-gold"
          >
            Conhecer empreendimento
            <Icon
              name="arrow_forward"
              size={16}
              className="transition-transform duration-300 group-hover/cta:translate-x-1"
            />
          </Link>
          <button
            type="button"
            onClick={onComparar}
            aria-pressed={marcado}
            className={`press inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium ${
              marcado ? "border border-primary bg-primary-soft/60" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={marcado ? "check" : "compare_arrows"} size={16} />
            {marcado ? "Selecionado" : "Comparar"}
          </button>
          <span className="text-xs text-muted-foreground">
            {e.disponiveis} de {e.total_unidades} unidades disponíveis
          </span>
        </div>
      </div>
    </article>
  );
}

export function VitrineCury({
  itens,
  selecionados,
  onAlternar,
}: {
  itens: CuryEmpreendimento[];
  selecionados: string[];
  onAlternar: (slug: string) => void;
}) {
  return (
    <div className="mt-12 flex flex-col gap-16 md:mt-20 md:gap-40">
      {itens.map((e) => (
        <Painel
          key={e.id}
          e={e}
          marcado={selecionados.includes(e.slug)}
          onComparar={() => onAlternar(e.slug)}
        />
      ))}
    </div>
  );
}
