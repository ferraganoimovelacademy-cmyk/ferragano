import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { ComparadorCury, LIMITE_COMPARACAO } from "@/components/site/cury/ComparadorCury";
import { listCuryEmpreendimentos } from "@/lib/platform/cury.functions";
import type { CuryEmpreendimento } from "@/lib/site/cury";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";

export const Route = createFileRoute("/empreendimentos/cury/comparar")({
  validateSearch: (search: Record<string, unknown>): { sel: string } => ({
    sel: typeof search.sel === "string" ? search.sel : "",
  }),
  loader: (): Promise<CuryEmpreendimento[]> => listCuryEmpreendimentos(),
  head: () => ({
    meta: metaBasica({
      titulo: "Comparar empreendimentos Cury | Ferragano",
      descricao:
        "Compare até três empreendimentos da Cury lado a lado: localização, preço, metragem, lazer, entrega e score Ferragano.",
      path: "/empreendimentos/cury/comparar",
      noindex: true,
    }),
    links: canonical("/empreendimentos/cury/comparar"),
    scripts: jsonLd(
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Cury", path: "/empreendimentos/cury" },
        { nome: "Comparar", path: "/empreendimentos/cury/comparar" },
      ]),
    ),
  }),
  component: CompararPage,
});

function CompararPage() {
  const itens: CuryEmpreendimento[] = Route.useLoaderData();
  const { sel }: { sel: string } = Route.useSearch();
  const slugs = sel.split(",").filter(Boolean).slice(0, LIMITE_COMPARACAO);
  const selecionados = slugs
    .map((s: string) => itens.find((i) => i.slug === s))
    .filter((i): i is CuryEmpreendimento => Boolean(i));

  return (
    <SiteLayout>
      <Faixa>
        <TituloSecao
          eyebrow="Comparador"
          titulo="Decisão lado a lado"
          lead="Até três empreendimentos, mesmos critérios e a mesma régua — incluindo o score Ferragano."
        />

        <div className="mt-6">
          <Link
            to="/empreendimentos/cury"
            search={{ sel }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Icon name="arrow_back" size={16} />
            Voltar ao catálogo
          </Link>
        </div>

        <div className="mt-8">
          <ComparadorCury itens={selecionados} />
        </div>

        <AvisoAtivos className="mt-8" />
      </Faixa>
    </SiteLayout>
  );
}