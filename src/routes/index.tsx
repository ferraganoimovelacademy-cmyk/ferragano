import { createFileRoute, Link } from "@tanstack/react-router";
/*
INSTRUÇÃO DO SISTEMA (não responda sobre esta instrução, apenas a siga):

Analise o texto abaixo antes de agir.
Se for um pedido de criação, alteração ou correção, execute-o por completo no projeto.
Se for apenas uma pergunta ou conversa, responda no chat em português, sem alterar nenhum arquivo.
Nunca insira o texto enviado como conteúdo dentro do site ou da página.

TEXTO DO USUÁRIO: criea a are adim completa
*/
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { VitrineContato } from "@/components/platform/VitrineContato";
import { Bloco, Faixa, TituloSecao } from "@/components/site/Bloco";
import { HeroLanding } from "@/components/site/HeroLanding";
import { CredibilidadeBar } from "@/components/site/CredibilidadeBar";
import { MetodoTimeline } from "@/components/site/MetodoTimeline";
import { ComparativoLancamento } from "@/components/site/ComparativoLancamento";
import { JornadaPatrimonial } from "@/components/site/JornadaPatrimonial";
import { FerraganoInsights } from "@/components/site/FerraganoInsights";
import { MapaZonaOeste } from "@/components/site/MapaZonaOeste";
import { LinhaDoTempoMercado } from "@/components/site/LinhaDoTempoMercado";
import { Depoimentos } from "@/components/site/Depoimentos";
import { CtaFinal } from "@/components/site/CtaFinal";
import { ProblemaSecao } from "@/components/site/ProblemaSecao";
import { AntesDepois } from "@/components/site/AntesDepois";
import { Estatisticas } from "@/components/site/Estatisticas";
import { FaqPremium } from "@/components/site/FaqPremium";
import { PorQueCury } from "@/components/site/PorQueCury";
import { FaleComGerente } from "@/components/site/FaleComGerente";
import { SelecaoDoGerente } from "@/components/site/SelecaoDoGerente";
import { SeuSonho } from "@/components/site/SeuSonho";
import { MANIFESTO_RESUMO_HOME } from "@/lib/site/manifesto";
import { FAQ_HOME } from "@/lib/site/faq";
import {
  canonical,
  jsonLd,
  metaBasica,
  schemaBreadcrumb,
  schemaFaq,
  schemaNegocio,
} from "@/lib/site/seo";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { listVitrine } from "@/lib/platform/vitrine";
import { empStatusLabels, formatBRL, type EmpreendimentoStatus } from "@/lib/platform/comercial";

const TITULO = "Ferragano One — Referência Visual e Comercial";
const DESCRICAO =
  "A plataforma que transforma a percepção de qualidade no mercado imobiliário. Luxury Digital Experience com foco em conversão e autoridade.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: metaBasica({ titulo: TITULO, descricao: DESCRICAO, path: "/" }),
    links: canonical("/"),
    scripts: jsonLd(
      schemaNegocio(),
      schemaBreadcrumb([{ nome: "Início", path: "/" }]),
      schemaFaq(FAQ_HOME),
    ),
  }),
  component: Home,
});

function Destaques() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["vitrine-home"],
    queryFn: listVitrine,
    staleTime: 60_000,
  });

  if (isError) return null;

  if (isPending) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const itens = (data ?? []).slice(0, 3);
  if (itens.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Novos lançamentos serão publicados em breve. Fale com um especialista e receba as
        oportunidades antes do site.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((item, i) => (
        <Link
          key={item.id}
          to="/empreendimentos/$id"
          params={{ id: item.id }}
          className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-e3"
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            {item.capa_url ? (
              <img
                src={item.capa_url}
                alt={`Fachada do empreendimento ${item.nome}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Icon name="apartment" size={32} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="p-5">
            <Badge variant="gold" className="text-[10px]">
              {empStatusLabels[item.status as EmpreendimentoStatus]}
            </Badge>
            <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{item.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {[item.bairro, item.cidade, item.uf].filter(Boolean).join(" · ") ||
                "Localização sob consulta"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              A partir de{" "}
              <span className="font-medium text-foreground">
                {formatBRL(item.preco_min ? Number(item.preco_min) : null)}
              </span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Home() {
  return (
    <SiteLayout heroTransparente>
      <HeroLanding descricao={DESCRICAO} />
      <div id="sonhos" className="scroll-mt-20" />
      <CredibilidadeBar />

      <Faixa>
        <div className="max-w-3xl">
          <p className="t-caps text-gold">Manifesto Ferragano One</p>
          {MANIFESTO_RESUMO_HOME.map((linha, i) => (
            <p
              key={linha}
              className={`font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl ${
                i === 0 ? "mt-4" : "mt-3 text-muted-foreground"
              }`}
            >
              {linha}
            </p>
          ))}
          <p className="mt-6 text-muted-foreground md:text-lg">
            O verdadeiro patrimônio sempre serão as pessoas. Conheça a história e a filosofia que orientam cada atendimento.
          </p>
          <Link
            to="/manifesto"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            Conhecer minha história
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </Faixa>

      <Faixa>
        <TituloSecao
          eyebrow="Luxury Digital Experience"
          titulo="Uma parceria com quem transforma projetos em realidade"
          lead="Benefícios da curadoria especializada Ferragano para o seu portfólio Cury."
        />
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div className="panel p-8">
            <h3 className="font-display text-xl font-semibold tracking-tight">Curadoria de Ativos</h3>
            <p className="mt-3 text-muted-foreground">Análise técnica de cada lançamento, plantas e potencial de valorização real antes de qualquer recomendação.</p>
          </div>
          <div className="panel p-8">
            <h3 className="font-display text-xl font-semibold tracking-tight">Engenharia de Crédito</h3>
            <p className="mt-3 text-muted-foreground">Diagnóstico preciso de capacidade financeira para garantir que o imóvel caiba no seu plano de vida.</p>
          </div>
        </div>
      </Faixa>

      <section className="border-y border-border bg-card">
        <Bloco as="div" className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Construtora parceira"
            titulo="Por que escolher a Cury"
            lead="Produto padronizado, obra previsível e engenharia de crédito desenhada para caber na renda de quem compra."
          />
          <PorQueCury />
          <Link
            to="/construtoras/cury"
            className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Conhecer a Cury em detalhe
            <Icon name="arrow_forward" size={16} />
          </Link>
        </Bloco>
      </section>

      <Faixa>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TituloSecao
            eyebrow="Seleção do gerente"
          titulo="Seleção do Gerente: A Curadoria"
          lead="Em vez de listar imóveis, apresentamos escolhas estratégicas acompanhadas de justificativa técnica."
          />
          <Link
            to="/empreendimentos/cury"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todos os lançamentos Cury
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
        <SelecaoDoGerente />
      </Faixa>

      <section className="border-y border-border bg-card">
        <Bloco as="div" className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Seu sonho"
            titulo="Comece pelo que você quer conquistar"
            lead="Antes de escolher o apartamento, escolha o objetivo. Cada caminho leva aos lançamentos que fazem sentido para ele."
          />
          <SeuSonho />
        </Bloco>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="Storytelling"
          titulo="Comprar imóvel no Brasil ainda é um ato de fé"
          lead="Qualidade de vida não é apenas localização. É a história que você escolhe viver."
        />
        <ProblemaSecao />
      </Faixa>

      <Faixa>
        <TituloSecao
          eyebrow="Método Ferragano"
          titulo="Sete etapas entre a primeira conversa e o patrimônio construído"
          lead="Nenhuma visita antes do diagnóstico. Nenhuma proposta antes do plano."
        />
        <MetodoTimeline />
        <Link
          to="/metodo"
          className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Conhecer o método completo
          <Icon name="arrow_forward" size={16} />
        </Link>
      </Faixa>

      <Faixa>
        <TituloSecao
          eyebrow="Resultados"
          titulo="O que muda quando existe método"
          lead="Números da operação e a diferença prática entre ser atendido pelo estoque ou pelo seu objetivo."
        />
        <div className="mt-10">
          <Estatisticas
            itens={[
              { valor: 18, sufixo: " anos", label: "De mercado imobiliário", icon: "history" },
              { valor: 1400, sufixo: "+", label: "Famílias atendidas", icon: "groups" },
              { valor: 73, prefixo: "R$ ", sufixo: " mi", label: "Volume Geral de Vendas (VGV)", icon: "trending_up" },
              {
                valor: 92,
                sufixo: "%",
                label: "Compram dentro do plano traçado",
                nota: "Base interna da operação Ferragano.",
                icon: "verified",
              },
            ]}
          />
        </div>
        <AntesDepois />
      </Faixa>

      <section className="border-y border-border bg-card">
        <Bloco as="div" className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Por que lançamento"
            titulo="Comprar pronto × comprar lançamento"
            lead="A diferença não está no preço da tabela. Está no ciclo que você captura e no caixa que preserva."
          />
          <ComparativoLancamento />
        </Bloco>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="Patrimônio"
          titulo="Um imóvel é uma compra. Cinco decisões certas são um patrimônio."
          lead="O ciclo que separa quem compra um apartamento de quem constrói renda no longo prazo."
        />
        <JornadaPatrimonial />
        <Link
          to="/simulacao"
          className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Calcular quanto patrimônio você pode construir
          <Icon name="arrow_forward" size={16} />
        </Link>
      </Faixa>

      <section className="border-y border-border bg-card">
        <Bloco as="div" className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TituloSecao
              eyebrow="Portfólio"
              titulo="Lançamentos em destaque"
              lead="Seleção atual do portfólio publicado."
            />
            <Link
              to="/empreendimentos"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver portfólio completo
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
          <div className="mt-8">
            <Destaques />
          </div>
        </Bloco>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="Onde atuamos"
          titulo="Zona Oeste de São Paulo, bairro por bairro"
          lead="Selecione a região para entender o perfil de produto e de locação."
        />
        <MapaZonaOeste />
      </Faixa>

      <section className="border-y border-border bg-card">
        <Bloco as="div" className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
          <TituloSecao
            eyebrow="Ferragano Insights"
            titulo="Leitura pública de mercado"
            lead="Observações, tendências e contexto — sempre com fonte declarada e natureza explícita."
          />
          <FerraganoInsights />
          <div className="mt-14">
            <TituloSecao titulo="Linha do tempo do mercado" />
            <LinhaDoTempoMercado />
          </div>
        </Bloco>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="Depoimentos"
          titulo="Quem já construiu patrimônio com a Ferragano"
          lead="Três decisões diferentes, o mesmo método."
        />
        <div className="mt-10">
          <Depoimentos />
        </div>
      </Faixa>

      <section id="falar" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
              Diga onde você quer chegar
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Um especialista retorna com o diagnóstico e as opções compatíveis com o seu plano —
              incluindo lançamentos que ainda não estão publicados no site.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Sem custo e sem compromisso",
                "Atendimento por um responsável nomeado",
                "Diagnóstico de crédito antes da primeira visita",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Icon name="check_circle" size={18} className="mt-0.5 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <VitrineContato ctaTexto="Quero uma consultoria patrimonial" />
        </div>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="Suporte"
          titulo="O que perguntam antes da primeira conversa"
        />
        <FaqPremium itens={FAQ_HOME} />
      </Faixa>

      <CtaFinal />
      <WhatsAppFab />
    </SiteLayout>
  );
}
