import { canonical, jsonLd, linksI18n, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";
import { PathIntl } from "@/lib/site/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Bloco, Faixa, TituloSecao } from "@/components/site/Bloco";
import { MetodoTimeline } from "@/components/site/MetodoTimeline";
import { ComparativoLancamento } from "@/components/site/ComparativoLancamento";
import { JornadaPatrimonial } from "@/components/site/JornadaPatrimonial";
import { CtaFinal } from "@/components/site/CtaFinal";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { ETAPAS } from "@/components/site/MetodoTimeline";

const TITULO = "Método Ferragano — do diagnóstico ao patrimônio construído";
const DESCRICAO =
  "As sete etapas do Método Ferragano: diagnóstico, planejamento, seleção, visita, negociação, compra e acompanhamento até o próximo ativo.";
const URL = "https://ferragano.lovable.app/metodo";

export const Route = createFileRoute("/metodo")({
  head: () => ({
    meta: metaBasica({ titulo: TITULO, descricao: DESCRICAO, path: "/metodo", tipo: "article" }),
    links: [...canonical("/metodo"), ...linksI18n(PathIntl.metodo)],
    scripts: jsonLd(
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Método Ferragano",
        description: DESCRICAO,
        step: ETAPAS.map((e, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: e.titulo,
          text: e.texto,
        })),
      },
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Método Ferragano", path: "/metodo" },
      ]),
    ),
  }),
  component: Metodo,
});

function Metodo() {
  return (
    <SiteLayout>
      <Faixa>
        <p className="t-caps text-gold">Metodologia</p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
          Método Ferragano
        </h1>
        <p className="mt-5 max-w-2xl text-muted-foreground md:text-lg">
          Comprar bem não é sorte de estande. É processo. Sete etapas que começam no seu orçamento e
          terminam no seu segundo imóvel.
        </p>
        <MetodoTimeline />
      </Faixa>

      <section className="border-y border-border bg-card">
        <Bloco as="div" className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Por que lançamento"
            titulo="Comprar pronto × comprar lançamento"
            lead="Quatro dimensões que mudam o resultado final da mesma renda."
          />
          <ComparativoLancamento />
        </Bloco>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="Patrimônio"
          titulo="O ciclo que o método persegue"
          lead="Cada etapa existe para viabilizar a próxima compra, não apenas a atual."
        />
        <JornadaPatrimonial />
      </Faixa>

      <CtaFinal />
      <WhatsAppFab />
    </SiteLayout>
  );
}
