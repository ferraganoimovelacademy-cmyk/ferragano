import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { listCuryEmpreendimentos } from "@/lib/platform/cury.functions";
import { anoEntrega, type CuryEmpreendimento } from "@/lib/site/cury";
import { empStatusLabels, formatBRL } from "@/lib/platform/comercial";

/** Selos da curadoria do gerente — ordem fixa, aplicada aos destaques publicados. */
const SELOS = [
  "Escolha do mês",
  "Melhor para investir",
  "Melhor para primeira compra",
  "Melhor potencial de valorização",
] as const;

/**
 * Seleção do gerente: cada lançamento ocupa quase a tela inteira,
 * no registro Apple. Dados vêm do portfólio público já existente.
 */
export function SelecaoDoGerente() {
  const buscar = useServerFn(listCuryEmpreendimentos);
  const { data, isPending, isError } = useQuery<CuryEmpreendimento[]>({
    queryKey: ["cury-selecao-gerente"],
    queryFn: () => buscar(),
    staleTime: 60_000,
  });

  if (isError) return null;
  if (isPending) {
    return (
      <div className="mt-10 grid gap-6">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const itens = (data ?? []).slice(0, SELOS.length);
  if (itens.length === 0) return null;

  return (
    <div className="mt-10 grid gap-6">
      {itens.map((emp, i) => (
        <article
          key={emp.id}
          className="relative isolate overflow-hidden rounded-2xl border border-border bg-inverse-surface"
        >
          {emp.capa_url ? (
            <img
              src={emp.capa_url}
              alt={`Fachada do empreendimento ${emp.nome}`}
              loading="lazy"
              className="absolute inset-0 -z-10 size-full object-cover opacity-60 transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div aria-hidden className="absolute inset-0 -z-10 bg-inverse-surface" />
          )}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-inverse-surface via-inverse-surface/70 to-inverse-surface/20"
          />
          <div className="flex min-h-[420px] flex-col justify-end p-7 md:min-h-[560px] md:p-12">
            <p className="t-caps text-gold">{SELOS[i]}</p>
            <h3 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight text-inverse-on-surface md:text-5xl">
              {emp.nome}
            </h3>
            <p className="mt-4 max-w-xl text-base text-inverse-on-surface/85 md:text-lg">
              Justificativa técnica: Este ativo apresenta o melhor equilíbrio entre fluxo de pagamento e localização estratégica no eixo da Zona Oeste.
            </p>
            <p className="mt-2 text-sm text-inverse-on-surface/65 md:text-base">
              {[emp.bairro, emp.cidade, emp.uf].filter(Boolean).join(" · ") ||
                "Localização sob consulta"}
            </p>
            <dl className="mt-7 grid gap-5 border-t border-inverse-on-surface/15 pt-6 sm:grid-cols-4">
              {[
                {
                  t: "Tipologias",
                  v: emp.dormitorios.length
                    ? `${emp.dormitorios.join(" e ")} dorm.`
                    : "Sob consulta",
                },
                {
                  t: "Área privativa",
                  v: emp.area_min ? `de ${emp.area_min} m²` : "Sob consulta",
                },
                { t: "A partir de", v: formatBRL(emp.preco_min ? Number(emp.preco_min) : null) },
                { t: empStatusLabels[emp.status], v: anoEntrega(emp.entrega_prevista) },
              ].map((s) => (
                <div key={s.t}>
                  <dt className="text-xs text-inverse-on-surface/60">{s.t}</dt>
                  <dd className="mt-1 text-sm font-medium text-inverse-on-surface">{s.v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8">
              <Link
                to="/empreendimentos/cury/$slug"
                params={{ slug: emp.slug }}
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] hover:bg-primary-hover"
              >
                Conhecer
                <Icon name="arrow_forward" size={18} aria-hidden />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
