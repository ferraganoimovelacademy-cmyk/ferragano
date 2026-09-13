import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { MapaCury } from "@/components/site/cury/MapaCury";
import { listCuryEmpreendimentos } from "@/lib/platform/cury.functions";
import type { CuryEmpreendimento } from "@/lib/site/cury";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";

export const Route = createFileRoute("/empreendimentos/cury/mapa")({
  loader: (): Promise<CuryEmpreendimento[]> => listCuryEmpreendimentos(),
  head: () => ({
    meta: metaBasica({
      titulo: "Mapa de empreendimentos Cury em São Paulo | Ferragano",
      descricao:
        "Veja onde estão os empreendimentos da Cury atendidos pela Ferragano: bairro, estágio de obra, faixa de preço e disponibilidade.",
      path: "/empreendimentos/cury/mapa",
    }),
    links: canonical("/empreendimentos/cury/mapa"),
    scripts: jsonLd(
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Cury", path: "/empreendimentos/cury" },
        { nome: "Mapa", path: "/empreendimentos/cury/mapa" },
      ]),
    ),
  }),
  component: MapaPage,
});

function MapaPage() {
  const itens: CuryEmpreendimento[] = Route.useLoaderData();

  return (
    <SiteLayout>
      <Faixa>
        <TituloSecao
          eyebrow="Localização"
          titulo="Onde o portfólio está"
          lead="Mapa esquemático por região. Endereço completo e implantação oficial são enviados pelo consultor."
        />

        <div className="mt-6">
          <Link
            to="/empreendimentos/cury"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Icon name="arrow_back" size={16} />
            Voltar ao catálogo
          </Link>
        </div>

        <div className="mt-8">
          <MapaCury itens={itens} />
        </div>

        <AvisoAtivos className="mt-8" />
      </Faixa>
    </SiteLayout>
  );
}