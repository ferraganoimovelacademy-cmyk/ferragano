import { canonical, jsonLd, linksI18n, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";
import { PathIntl } from "@/lib/site/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { CalculadoraPatrimonial } from "@/components/site/CalculadoraPatrimonial";
import { ExperienceCalculator } from "@/components/site/ExperienceCalculator";
import { JornadaPatrimonial } from "@/components/site/JornadaPatrimonial";
import { CtaFinal } from "@/components/site/CtaFinal";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { listCuryEmpreendimentos } from "@/lib/platform/cury.functions";
import type { CuryEmpreendimento } from "@/lib/site/cury";

const TITULO = "Simulador de financiamento e calculadora patrimonial | Ferragano";
const DESCRICAO =
  "Informe renda, FGTS e entrada e veja parcela estimada, faixa de imóvel viável e os empreendimentos compatíveis — com recomendação consultiva da Ferragano.";
const URL = "https://ferragano.lovable.app/simulacao";

export const Route = createFileRoute("/simulacao")({
  loader: (): Promise<CuryEmpreendimento[]> => listCuryEmpreendimentos(),
  head: () => ({
    meta: metaBasica({ titulo: TITULO, descricao: DESCRICAO, path: "/simulacao", tipo: "website" }),
    links: [...canonical("/simulacao"), ...linksI18n(PathIntl.simulacao)],
    scripts: jsonLd(
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calculadora Patrimonial Ferragano",
        applicationCategory: "FinanceApplication",
        description: DESCRICAO,
        url: URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
      },
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Calculadora patrimonial", path: "/simulacao" },
      ]),
    ),
  }),
  component: Simulacao,
});

function Simulacao() {
  const itens: CuryEmpreendimento[] = Route.useLoaderData();

  return (
    <SiteLayout>
      <Faixa>
        <p className="t-caps text-gold">Experience Calculator</p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
          Quanto imóvel a sua renda compra hoje?
        </h1>
        <p className="mt-5 max-w-2xl text-muted-foreground md:text-lg">
          Renda, FGTS, entrada, cidade e faixa do programa. A simulação roda no seu navegador, não
          grava nada e já mostra quais empreendimentos entram no seu teto.
        </p>
        <div className="mt-10">
          <ExperienceCalculator itens={itens} />
        </div>
      </Faixa>

      <div className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Longo prazo"
            titulo="E quanto patrimônio isso vira em 10 anos?"
            lead="Mesma lógica, outro horizonte: projeção com premissas declaradas."
          />
          <div className="mt-10">
            <CalculadoraPatrimonial />
          </div>
        </div>
      </div>

      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Como o número acontece"
            titulo="A projeção só se realiza dentro de um ciclo"
            lead="Valorização e renda viram entrada do próximo ativo."
          />
          <JornadaPatrimonial />
        </div>
      </section>

      <CtaFinal />
      <WhatsAppFab />
    </SiteLayout>
  );
}
