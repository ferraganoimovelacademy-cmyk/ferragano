import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Bloco, Faixa, TituloSecao } from "@/components/site/Bloco";
import { FaqPremium } from "@/components/site/FaqPremium";
import { AtivoSlot, AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { AnaliseFerraganoBloco } from "@/components/site/cury/AnaliseFerragano";
import { AtivosOficiais } from "@/components/site/cury/AtivosOficiais";
import { CtaContextual } from "@/components/site/cury/CtaContextual";
import { CtaFixoCury } from "@/components/site/cury/CtaFixoCury";
import { FerraganoSignature } from "@/components/site/cury/FerraganoSignature";
import { GaleriaPremium } from "@/components/site/cury/GaleriaPremium";
import { HeroEmpreendimento } from "@/components/site/cury/HeroEmpreendimento";
import { LifestyleCury } from "@/components/site/cury/LifestyleCury";
import { NavSecoes } from "@/components/site/cury/NavSecoes";
import { PlantasPremium } from "@/components/site/cury/PlantasPremium";
import { SimuladorEmpreendimento } from "@/components/site/cury/SimuladorEmpreendimento";
import { SmartLocation } from "@/components/site/cury/SmartLocation";
import { TourCinematografico } from "@/components/site/cury/TourCinematografico";
import { UnidadesTabela } from "@/components/site/cury/UnidadesTabela";
import { empStatusLabels, formatBRL, segmentoLabels } from "@/lib/platform/comercial";
import { getCuryEmpreendimento, listCuryEmpreendimentos } from "@/lib/platform/cury.functions";
import { anoEntrega, ATIVOS_SLOTS, type CuryDetalhe, type CuryEmpreendimento } from "@/lib/site/cury";
import {
  analiseFerragano,
  assinaturaFerragano,
  comparativoVitrine,
  liquidez,
  narrativa,
} from "@/lib/site/signature";
import { entornoDoBairro, tempoAoMetro } from "@/lib/site/localizacao";
import { stagger } from "@/lib/site/motion";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb, schemaFaq } from "@/lib/site/seo";

type DadosPagina = { detalhe: CuryDetalhe; vitrine: CuryEmpreendimento[] };

export const Route = createFileRoute("/empreendimentos/cury/$slug/")({
  loader: async ({ params }): Promise<DadosPagina> => {
    const [detalhe, vitrine] = await Promise.all([
      getCuryEmpreendimento({ data: { slug: params.slug } }),
      listCuryEmpreendimentos().catch(() => [] as CuryEmpreendimento[]),
    ]);
    if (!detalhe) throw notFound();
    return { detalhe, vitrine };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Empreendimento indisponível — Ferragano" }, { name: "robots", content: "noindex" }],
      };
    }
    const e = loaderData.detalhe.empreendimento;
    const local = [e.bairro, e.cidade].filter(Boolean).join(", ");
    const titulo = `${e.nome}${local ? ` — ${local}` : ""} | Ferragano`;
    const descricao =
      `${e.nome}: ${e.dormitorios.length ? `${e.dormitorios.join(" e ")} dormitórios, ` : ""}` +
      `a partir de ${formatBRL(e.preco_min)}. ${empStatusLabels[e.status]}, entrega ${anoEntrega(
        e.entrega_prevista,
      ).toLowerCase()}. Curadoria e crédito com a Ferragano.`;
    const path = `/empreendimentos/cury/${params.slug}`;
    const capa = e.capa_url ?? e.galeria?.[0] ?? undefined;
    const faq = loaderData.detalhe.conhecimento
      .filter((k) => k.tipo === "faq" && k.corpo)
      .map((k) => ({ pergunta: k.titulo, resposta: k.corpo as string }));

    return {
      meta: metaBasica({ titulo, descricao, path, tipo: "article", imagem: capa }),
      links: canonical(path),
      scripts: jsonLd(
        schemaBreadcrumb([
          { nome: "Início", path: "/" },
          { nome: "Cury", path: "/empreendimentos/cury" },
          { nome: e.nome, path },
        ]),
        {
          "@context": "https://schema.org",
          "@type": ["Residence", "Product"],
          name: e.nome,
          description: e.descricao ?? descricao,
          ...(capa ? { image: capa } : {}),
          ...(e.preco_min
            ? {
                offers: {
                  "@type": "AggregateOffer",
                  priceCurrency: "BRL",
                  lowPrice: e.preco_min,
                  ...(e.preco_max ? { highPrice: e.preco_max } : {}),
                  availability: e.disponiveis > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
                },
              }
            : {}),
          ...(e.construtora ? { brand: { "@type": "Organization", name: e.construtora } } : {}),
          address: {
            "@type": "PostalAddress",
            addressLocality: e.cidade ?? undefined,
            addressRegion: e.uf ?? undefined,
            addressCountry: "BR",
          },
        },
        ...(faq.length ? [schemaFaq(faq)] : []),
      ),
    };
  },
  component: DetalheCury,
});

function DetalheCury() {
  const { detalhe, vitrine }: DadosPagina = Route.useLoaderData();
  const { empreendimento: e, unidades, conhecimento, ativos } = detalhe;
  const faq = conhecimento
    .filter((k) => k.tipo === "faq" && k.corpo)
    .map((k) => ({ pergunta: k.titulo, resposta: k.corpo as string }));
  const argumentos = conhecimento.filter((k) => k.tipo !== "faq");
  const assinatura = assinaturaFerragano(e);
  const analise = analiseFerragano(e, assinatura);
  const historia = narrativa(e);
  const entorno = entornoDoBairro(e.bairro);
  const liq = liquidez(e, Boolean(entorno && tempoAoMetro(entorno)));
  const comparativo = comparativoVitrine(
    e,
    vitrine.filter((i) => i.id !== e.id),
    assinatura.score,
  );
  const secoes = [
    { id: "tour", rotulo: "Tour" },
    { id: "galeria", rotulo: "Galeria" },
    { id: "plantas", rotulo: "Plantas" },
    { id: "localizacao", rotulo: "Localização" },
    { id: "analise", rotulo: "Análise Ferragano" },
    { id: "simulador", rotulo: "Simulador" },
    { id: "unidades", rotulo: "Unidades" },
    ...(faq.length ? [{ id: "duvidas", rotulo: "Dúvidas" }] : []),
  ];

  return (
    <SiteLayout>
      <HeroEmpreendimento e={e} assinatura={assinatura} />

      <NavSecoes secoes={secoes} />

      {/* GATE 03 — storytelling: história, não lista de características */}
      <Faixa>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="t-caps text-gold">{historia.titulo}</p>
            <div className="mt-6 max-w-2xl space-y-5">
              {historia.paragrafos.map((t, i) => (
                <Bloco
                  as="div"
                  key={t.slice(0, 24)}
                  delay={stagger(i)}
                  className={i === 0 ? "font-display text-xl leading-relaxed tracking-tight md:text-2xl" : "leading-relaxed text-muted-foreground"}
                >
                  {t}
                </Bloco>
              ))}
            </div>
            {e.descricao && (
              <p className="mt-8 max-w-2xl border-l-2 border-border pl-5 text-sm leading-relaxed text-muted-foreground">
                {e.descricao}
              </p>
            )}
          </div>

          <dl className="rounded-2xl border border-border bg-card p-6">
            <p className="t-caps text-muted-foreground">Ficha rápida</p>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Construtora</dt>
                <dd className="mt-0.5 font-medium">{e.construtora ?? "Cury"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Segmento</dt>
                <dd className="mt-0.5 font-medium">{segmentoLabels[e.segmento]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estágio</dt>
                <dd className="mt-0.5 font-medium">{empStatusLabels[e.status]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Entrega</dt>
                <dd className="mt-0.5 font-medium">{anoEntrega(e.entrega_prevista)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">A partir de</dt>
                <dd className="mt-0.5 font-display text-lg font-semibold">{formatBRL(e.preco_min)}</dd>
              </div>
            </div>
          </dl>
        </div>
      </Faixa>

      {/* Tour cinematográfico — vídeo e 360º oficiais em tela cheia */}
      <Faixa id="tour" className="scroll-mt-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="t-caps text-gold">Experiência Cinematográfica</p>
          <h2 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
            Experiência Cinematográfica: {e.nome}
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Sinta a atmosfera do seu novo endereço através de vídeos e tours oficiais em tela cheia.
          </p>
        </div>
        <div className="mt-8">
          <TourCinematografico
            nome={e.nome}
            capa={e.capa_url ?? e.galeria?.[0] ?? null}
            videos={ativos.videos}
            tours={ativos.tours}
          />
        </div>
      </Faixa>

      {/* GATE 03 — galeria premium */}
      <div className="border-y border-border bg-card">
        <Faixa id="galeria">
          <TituloSecao
            eyebrow="Galeria"
            titulo="O empreendimento em imagens"
            lead="Toque em qualquer imagem para ver em tela cheia, com zoom e navegação."
          />
          <div className="mt-8">
            <GaleriaPremium imagens={e.galeria} nome={e.nome} />
          </div>
          <CtaContextual
            nome={e.nome}
            titulo="Quer ver o material oficial completo?"
            texto="A Ferragano envia o book de imagens, o memorial e o que ainda não está publicado na vitrine."
            acoes={["plantas", "visita"]}
          />
        </Faixa>
      </div>

      {/* GATE 03 — plantas */}
      <Faixa id="plantas">
        <TituloSecao
          eyebrow="Plantas"
          titulo="Escolha a metragem que combina com sua rotina"
          lead="Abra uma tipologia para ampliar, comparar com outra e pedir a planta em PDF."
        />
        <div className="mt-8">
          <PlantasPremium unidades={unidades} nome={e.nome} />
        </div>
        <div className="mt-8">
          <AtivosOficiais
            nome={e.nome}
            plantas={ativos.plantas}
            videos={ativos.videos}
            tours={ativos.tours}
            pdfs={ativos.pdfs}
          />
        </div>
        <CtaContextual
          nome={e.nome}
          titulo="Qual planta faz mais sentido para você?"
          texto="Mando as plantas em alta resolução e mostro quais posições ainda têm unidade disponível."
          acoes={["plantas", "tabela"]}
        />
      </Faixa>

      {/* GATE 03 — lifestyle como experiência */}
      <div className="border-y border-border bg-card">
        <Faixa>
          <TituloSecao
            eyebrow="Lifestyle"
            titulo="O que muda no seu fim de semana"
            lead="Áreas comuns previstas em projeto. Confirmação final pelo memorial descritivo."
          />
          <div className="mt-8">
            <LifestyleCury />
          </div>
        </Faixa>
      </div>

      {/* GATE 06.5 — Ferragano Signature */}
      {/* Sprint UI 06 — GATE 04: Smart Location */}
      <Faixa id="localizacao">
        <TituloSecao
          eyebrow="Localização"
          titulo="O que existe em volta — e a quanto tempo"
          lead="Metrô, comércio, saúde, escolas, parques e as principais vias, com tempo estimado de deslocamento."
        />
        <div className="mt-8">
          <SmartLocation nome={e.nome} bairro={e.bairro} cidade={e.cidade} />
        </div>
        <CtaContextual
          nome={e.nome}
          titulo="Conhece a região?"
          texto="Faço um roteiro de visita pelo bairro no mesmo dia da visita ao decorado, para você avaliar rotina real."
          acoes={["visita", "ferragano"]}
        />
      </Faixa>

      <Faixa id="analise">
        <TituloSecao
          eyebrow="Ferragano Signature"
          titulo="A análise que um catálogo não faz"
          lead="Leitura consultiva própria, com nota por eixo e justificativa aberta."
        />
        <div className="mt-8">
          <FerraganoSignature
            a={assinatura}
            nome={e.nome}
            extra={
              <AnaliseFerraganoBloco
                a={analise}
                nome={e.nome}
                liquidez={liq}
                comparativo={comparativo}
              />
            }
          />
        </div>
        <CtaContextual
          nome={e.nome}
          titulo="Quer a leitura aplicada ao seu caso?"
          texto="A análise acima é do produto. A conversa com o Ferragano cruza isso com o seu objetivo patrimonial."
          acoes={["ferragano", "simular"]}
        />
      </Faixa>

      <div className="border-y border-border bg-card">
        <Faixa id="unidades">
          <TituloSecao
            eyebrow="Estoque"
            titulo="Unidades e disponibilidade"
            lead="Espelho do estoque no momento da consulta. A reserva é confirmada pelo consultor."
          />
          <div className="mt-8">
            <UnidadesTabela unidades={unidades} slug={e.slug} />
          </div>
          <CtaContextual
            nome={e.nome}
            titulo="Tabela e disponibilidade do dia"
            texto="O estoque muda em horas. Peço a tabela atualizada direto com a Cury e te devolvo com a leitura da Ferragano."
            acoes={["tabela", "vip"]}
          />
        </Faixa>
      </div>

      {/* Sprint UI 06 — simulador contextual, com o preço real da unidade */}
      <Faixa id="simulador">
        <TituloSecao
          eyebrow="Simulador"
          titulo="Quanto fica a parcela deste empreendimento"
          lead="Escolha a unidade e ajuste renda, FGTS e entrada. O cálculo usa o preço real do estoque."
        />
        <div className="mt-8">
          <SimuladorEmpreendimento nome={e.nome} unidades={unidades} precoMin={e.preco_min} />
        </div>
        <CtaContextual
          nome={e.nome}
          titulo="Simulação estimada, condição real com o consultor"
          texto="Taxa, subsídio e prazo finais são do banco. Validamos seu cenário com a documentação em mãos."
          acoes={["ferragano", "tabela"]}
        />
      </Faixa>

      {argumentos.length > 0 && (
        <Faixa>
          <TituloSecao eyebrow="Curadoria" titulo="O que pesa na decisão" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {argumentos.map((k, i) => (
              <Bloco
                key={k.id}
                as="article"
                delay={stagger(i)}
                className="rounded-xl border border-border bg-card p-6"
              >
                <h3 className="font-display text-base font-semibold tracking-tight">{k.titulo}</h3>
                {k.corpo && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{k.corpo}</p>
                )}
              </Bloco>
            ))}
          </div>
        </Faixa>
      )}

      <div className="border-y border-border bg-card">
        <Faixa>
          <TituloSecao
            eyebrow="Material oficial"
            titulo="O que será publicado aqui"
            lead="A plataforma já está preparada para receber cada ativo — nada é improvisado depois."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ATIVOS_SLOTS.map((a) => (
              <AtivoSlot key={a.id} titulo={a.titulo} icone={a.icone} proporcao={a.proporcao} compacto />
            ))}
          </div>
        </Faixa>
      </div>

      {faq.length > 0 && (
        <Faixa id="duvidas">
          <TituloSecao eyebrow="Dúvidas" titulo={`Perguntas sobre o ${e.nome}`} />
          <div className="mt-8">
            <FaqPremium itens={faq} />
          </div>
        </Faixa>
      )}

      <Faixa>
        <AvisoAtivos />
      </Faixa>

      <div className="h-24 lg:h-20" />
      <CtaFixoCury nome={e.nome} precoMin={e.preco_min} disponiveis={e.disponiveis} />
    </SiteLayout>
  );
}
