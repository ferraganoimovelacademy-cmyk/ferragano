import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Bloco, Faixa, TituloSecao } from "@/components/site/Bloco";
import { FaqPremium } from "@/components/site/FaqPremium";
import { Icon } from "@/components/Icon";
import { AvisoAtivos } from "@/components/site/cury/AtivoSlot";
import { CURY_INSTITUCIONAL } from "@/lib/site/cury";
import { whatsappLink } from "@/lib/site/contato";
import { img } from "@/lib/images";
import { propsImagem } from "@/lib/site/imagem";
import { canonical, jsonLd, metaBasica, schemaBreadcrumb, schemaFaq } from "@/lib/site/seo";

export const Route = createFileRoute("/construtoras/cury")({
  head: () => ({
    meta: metaBasica({
      titulo: "Cury: portfólio, garantias e solidez | Ferragano",
      descricao:
        "Como a Ferragano trabalha o portfólio da construtora Cury: produto econômico, ciclo de obra curto, engenharia de crédito e garantias contratuais.",
      path: "/construtoras/cury",
      tipo: "profile",
    }),
    links: canonical("/construtoras/cury"),
    scripts: jsonLd(
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Construtoras", path: "/construtoras/cury" },
        { nome: "Cury", path: "/construtoras/cury" },
      ]),
      schemaFaq(CURY_INSTITUCIONAL.faq),
    ),
  }),
  component: ConstrutoraCuryPage,
});

function ConstrutoraCuryPage() {
  const c = CURY_INSTITUCIONAL;

  return (
    <SiteLayout>
      {/* Capa editorial — abertura de revista digital */}
      <section className="relative isolate border-b border-border">
        <div className="absolute inset-0 -z-10">
          <img
            {...propsImagem(img.propAlamedaCury, { sizes: "100vw", prioridade: true })}
            alt="Fachada de empreendimento residencial da construtora Cury em São Paulo"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/70 to-background" />
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-24 pb-16 md:px-8 md:pt-40 md:pb-24">
          <p className="t-caps text-gold">{c.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.03] font-semibold tracking-tight text-inverse-on-surface md:text-6xl">
            {c.titulo}
          </h1>
          <p className="mt-6 max-w-2xl text-base text-inverse-on-surface/85 md:text-lg">{c.lead}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/empreendimentos/cury"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 text-sm font-medium text-gold-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              Ver empreendimentos
              <Icon name="arrow_forward" size={18} />
            </Link>
            <a
              href={whatsappLink(
                "Olá! Quero falar com um consultor da Ferragano sobre os empreendimentos da Cury.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-inverse-on-surface/30 px-6 text-sm font-medium text-inverse-on-surface backdrop-blur-sm transition-colors hover:bg-inverse-on-surface/10"
            >
              <Icon name="chat" size={18} />
              Falar com um consultor
            </a>
          </div>
        </div>
      </section>

      <Faixa>
        <TituloSecao
          eyebrow="História"
          titulo="Um modelo construído para escala"
          lead="Três capítulos que explicam por que este portfólio entra na curadoria."
        />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="min-w-0 space-y-8">
            {c.historia.map((p, i) => (
              <Bloco
                key={i}
                as="div"
                delay={i * 80}
                className="min-w-0 border-l-2 border-gold/40 pl-6"
              >
                <span className="font-mono text-xs tracking-widest text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground md:text-lg">
                  {p}
                </p>
              </Bloco>
            ))}
          </div>
          <Bloco as="div" delay={120} className="min-w-0">
            <img
              {...propsImagem(img.propGardenHouse, { sizes: "(min-width: 1024px) 420px, 100vw" })}
              alt="Área comum entregue equipada em empreendimento da Cury"
              className="aspect-[4/5] w-full rounded-[28px] object-cover shadow-e3"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Lazer entregue equipado nas áreas comuns — padrão recorrente do produto.
            </p>
          </Bloco>
        </div>
      </Faixa>

      <div className="border-y border-border bg-card">
        <Faixa>
          <TituloSecao
            eyebrow="Diferenciais"
            titulo="Por que este portfólio entra na curadoria"
            lead="Critérios objetivos de produto, não preferência comercial."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.diferenciais.map((d, i) => (
              <Bloco
                key={d.titulo}
                as="article"
                delay={i * 70}
                className="hover-lift rounded-xl border border-border bg-background p-6"
              >
                <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon name={d.icone} size={22} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold tracking-tight">
                  {d.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.texto}</p>
              </Bloco>
            ))}
          </div>
        </Faixa>
      </div>

      <Faixa>
        <TituloSecao eyebrow="Solidez" titulo="Indicadores públicos relevantes" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.solidez.map((s, i) => (
            <Bloco
              key={s.rotulo}
              as="div"
              delay={i * 60}
              className="rounded-xl border border-border bg-card p-6"
            >
              <p className="text-xs text-muted-foreground">{s.rotulo}</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{s.valor}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.nota}</p>
            </Bloco>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">{c.aviso}</p>
      </Faixa>

      <div className="border-y border-border bg-card">
        <Faixa>
          <TituloSecao eyebrow="Garantias" titulo="O que está protegido em contrato" />
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {c.garantias.map((g, i) => (
              <Bloco
                key={g.titulo}
                as="div"
                delay={i * 60}
                className="rounded-xl border border-border bg-background p-6"
              >
                <dt className="flex items-center gap-2 font-medium">
                  <Icon name="verified_user" size={18} className="text-primary" />
                  {g.titulo}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.texto}</dd>
              </Bloco>
            ))}
          </dl>
        </Faixa>
      </div>

      <Faixa>
        <TituloSecao
          eyebrow="Processo de compra"
          titulo="Da primeira conversa à entrega das chaves"
          lead="Seis etapas conduzidas por um responsável nomeado. Nenhuma delas é opcional."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {c.processo.map((p, i) => (
            <Bloco
              key={p.titulo}
              as="div"
              delay={i * 60}
              className="hover-lift min-w-0 rounded-[24px] border border-border bg-card p-6"
            >
              <li className="list-none">
                <span className="font-mono text-xs tracking-widest text-gold">
                  ETAPA {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
              </li>
            </Bloco>
          ))}
        </ol>
      </Faixa>

      <Faixa>
        <TituloSecao eyebrow="Dúvidas" titulo="Perguntas frequentes" />
        <div className="mt-8">
          <FaqPremium itens={c.faq} />
        </div>
        <AvisoAtivos className="mt-8" />
      </Faixa>
    </SiteLayout>
  );
}