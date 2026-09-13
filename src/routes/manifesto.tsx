import { createFileRoute, Link } from "@tanstack/react-router";
import retrato from "@/assets/carlos-ferragano.jpg";
import { Icon } from "@/components/Icon";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Bloco, Faixa } from "@/components/site/Bloco";
import { Depoimentos } from "@/components/site/Depoimentos";
import { Estatisticas } from "@/components/site/Estatisticas";
import { FormularioConsultoria } from "@/components/site/FormularioConsultoria";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { AtivoSlot } from "@/components/site/cury/AtivoSlot";
import { whatsappLink, WHATSAPP_MSG_CONSULTORIA } from "@/lib/site/contato";
import {
  ASSINATURA_FINAL,
  ENCERRAMENTO,
  FRASE_FINAL_TELA,
  MANIFESTO_BLOCOS,
  MANIFESTO_TITULO,
  MARCOS_TRAJETORIA,
  NUMEROS_MANIFESTO,
} from "@/lib/site/manifesto";
import { LINHA_AUTORIDADE, RESPONSAVEL } from "@/lib/site/posicionamento";
import { PathIntl } from "@/lib/site/i18n";
import {
  canonical,
  jsonLd,
  linksI18n,
  metaBasica,
  OG_RETRATO,
  schemaBreadcrumb,
  schemaPaginaPerfil,
  schemaPessoa,
} from "@/lib/site/seo";

const TITULO = "Manifesto Ferragano — pessoas antes de imóveis";
const DESCRICAO =
  "O manifesto de Carlos Ferragano: princípios, propósito e o compromisso de transformar sonhos em patrimônio e patrimônio em legado.";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: metaBasica({
      titulo: TITULO,
      descricao: DESCRICAO,
      path: "/manifesto",
      tipo: "profile",
      imagem: OG_RETRATO,
    }),
    links: [...canonical("/manifesto"), ...linksI18n(PathIntl.manifesto)],
    scripts: jsonLd(
      schemaPessoa({ descricao: DESCRICAO, path: "/manifesto" }),
      schemaPaginaPerfil({ titulo: TITULO, descricao: DESCRICAO, path: "/manifesto" }),
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Manifesto", path: "/manifesto" },
      ]),
    ),
  }),
  component: Manifesto,
});

function Manifesto() {
  return (
    <SiteLayout heroTransparente>
      {/* Hero em tela cheia */}
      <section className="relative flex min-h-[88vh] items-end overflow-hidden">
        <img
          src={retrato}
          alt={`Retrato de ${RESPONSAVEL}`}
          width={1200}
          height={1504}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-16 md:px-8 md:pb-24">
          <p className="t-caps text-gold">Manifesto · {LINHA_AUTORIDADE}</p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
            {MANIFESTO_TITULO}
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground md:text-lg">
            A história, os princípios e o propósito que orientam cada atendimento.
          </p>
        </div>
      </section>

      {/* Vídeo de apresentação */}
      <Faixa>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
          <div className="min-w-0">
            <p className="t-caps text-gold">Apresentação</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Dois minutos com {RESPONSAVEL}
            </h2>
            <p className="mt-3 text-muted-foreground">
              O vídeo oficial entra aqui assim que a gravação for publicada.
            </p>
          </div>
          <AtivoSlot
            titulo="Vídeo de apresentação"
            icone="play_circle"
            proporcao="aspect-video"
            nota="Gravação oficial em produção."
          />
        </div>
      </Faixa>

      {/* Manifesto em blocos, com entrada por scroll */}
      <div className="border-y border-border bg-card">
        {MANIFESTO_BLOCOS.map((b, i) => (
          <Bloco
            key={b.id}
            as="section"
            id={b.id}
            delay={40}
            className="mx-auto w-full max-w-[900px] border-b border-border/60 px-4 py-16 last:border-0 md:px-8 md:py-24"
          >
            <p className="t-caps text-gold">
              <span className="font-mono">{String(i + 1).padStart(2, "0")}</span> · {b.eyebrow}
            </p>
            {b.destaque && (
              <p className="gold-rule mt-6 pl-5 font-display text-2xl leading-snug tracking-tight md:text-3xl">
                {b.destaque}
              </p>
            )}
            <div className="mt-6 space-y-5">
              {b.paragrafos.map((p) => (
                <p key={p} className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  {p}
                </p>
              ))}
            </div>
            {b.lista && (
              <ul className="mt-8 space-y-3">
                {b.lista.map((l) => (
                  <li
                    key={l}
                    className="flex items-start gap-3 font-display text-lg tracking-tight md:text-xl"
                  >
                    <Icon name="chevron_right" size={20} className="mt-1 shrink-0 text-gold" />
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        ))}
      </div>

      {/* Indicadores de impacto */}
      <Faixa>
        <p className="t-caps text-gold">Impacto</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Números de uma década de mercado
        </h2>
        <div className="mt-10">
          <Estatisticas itens={[...NUMEROS_MANIFESTO]} />
        </div>
      </Faixa>

      {/* Linha do tempo da carreira */}
      <Faixa>
        <p className="t-caps text-gold">Trajetória</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Os marcos que formaram o método
        </h2>
        <ol className="mt-10 space-y-8">
          {MARCOS_TRAJETORIA.map((t, i) => (
            <Bloco
              key={t.titulo}
              as="div"
              delay={i * 70}
              className="min-w-0 border-l-2 border-gold/40 pl-6"
            >
              <li className="list-none">
                <span className="font-mono text-xs tracking-widest text-gold uppercase">
                  {t.marco}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
                  {t.titulo}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {t.texto}
                </p>
              </li>
            </Bloco>
          ))}
        </ol>
      </Faixa>

      <section className="border-y border-border bg-card">
        <Faixa>
          <p className="t-caps text-gold">Depoimentos</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Quem viveu esse compromisso
          </h2>
          <div className="mt-10">
            <Depoimentos />
          </div>
        </Faixa>
      </section>

      {/* Assinatura final em tela cheia */}
      <section className="flex min-h-[80vh] items-center">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
          <Bloco as="div" className="max-w-3xl">
            {ASSINATURA_FINAL.map((linha, i) => (
              <p
                key={linha}
                className={`font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl ${
                  i === 0 ? "" : "mt-3 text-muted-foreground"
                }`}
              >
                {linha}
              </p>
            ))}
            <div className="mt-8 space-y-1">
              {ENCERRAMENTO.map((linha) => (
                <p key={linha} className="text-base text-muted-foreground md:text-lg">
                  {linha}
                </p>
              ))}
            </div>
            <p className="mt-10 font-mono text-xs tracking-widest text-gold uppercase">
              {RESPONSAVEL} · {LINHA_AUTORIDADE}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
              >
                <Icon name="event" size={18} />
                Agendar uma consultoria
              </a>
              <Link
                to="/sobre"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium transition-colors hover:border-primary"
              >
                Ver trajetória e credenciais
                <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
          </Bloco>
        </div>
      </section>

      {/* Consultoria */}
      <Faixa id="consultoria">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start">
          <div className="min-w-0">
            <p className="t-caps text-gold">Consultoria</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Comece pelo diagnóstico, não pela visita
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Informe seu objetivo e o cenário atual. O retorno traz o que cabe no seu orçamento e
              quais empreendimentos fazem sentido — antes de qualquer estande.
            </p>
          </div>
          <FormularioConsultoria />
        </div>
      </Faixa>

      {/* Frase final em tela cheia */}
      <section className="flex min-h-[70vh] items-center border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
          <Bloco as="div">
            <p className="max-w-4xl font-display text-3xl leading-tight font-semibold tracking-tight text-balance md:text-5xl">
              {FRASE_FINAL_TELA}
            </p>
          </Bloco>
        </div>
      </section>

      <WhatsAppFab />
    </SiteLayout>
  );
}
