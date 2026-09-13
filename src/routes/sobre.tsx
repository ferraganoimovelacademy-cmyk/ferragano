import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, Bloco, TituloSecao } from "@/components/site/Bloco";
import { Icon } from "@/components/Icon";
import retrato from "@/assets/carlos-ferragano.jpg";
import { MANIFESTO_BLOCOS, NUMEROS_MANIFESTO } from "@/lib/site/manifesto";
import { LINHA_AUTORIDADE, RESPONSAVEL } from "@/lib/site/posicionamento";
import { canonical, jsonLd, metaBasica, OG_RETRATO, schemaBreadcrumb, schemaPaginaPerfil, schemaPessoa } from "@/lib/site/seo";
import { CtaFinal } from "@/components/site/CtaFinal";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";

const TITULO = "Carlos Ferragano — A Autoridade em Lançamentos e Patrimônio";
const DESCRICAO = "Conheça a trajetória de Carlos Ferragano: R$ 73 milhões em VGV comercializado e um método focado na construção de patrimônio real.";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: metaBasica({
      titulo: TITULO,
      descricao: DESCRICAO,
      path: "/sobre",
      tipo: "profile",
      imagem: OG_RETRATO,
    }),
    links: canonical("/sobre"),
    scripts: jsonLd(
      schemaPessoa({ descricao: DESCRICAO, path: "/sobre" }),
      schemaPaginaPerfil({ titulo: TITULO, descricao: DESCRICAO, path: "/sobre" }),
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Sobre", path: "/sobre" },
      ]),
    ),
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <SiteLayout heroTransparente>
      {/* 🎬 Gate 03 — Página "Carlos Ferragano" */}
      <section className="relative isolate min-h-[90svh] overflow-hidden bg-inverse-surface">
        <div className="absolute inset-0 -z-10">
          <img
            src={retrato}
            alt="Carlos Ferragano"
            className="size-full object-cover opacity-40 md:opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface via-inverse-surface/60 to-transparent" />
        </div>
        
        <div className="mx-auto flex min-h-[90svh] w-full max-w-[1200px] flex-col justify-center px-4 md:px-8">
          <div className="reveal-blur max-w-2xl">
            <p className="t-caps text-gold">{LINHA_AUTORIDADE}</p>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-inverse-on-surface md:text-8xl">
              {RESPONSAVEL}
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-inverse-on-surface/80 md:text-xl">
              Minha missão é muito maior do que vender imóveis. É desenvolver pessoas, construir legados e transformar a trajetória de famílias através da construção de patrimônio real.
            </p>
            <div className="mt-10 flex flex-wrap gap-6 border-y border-inverse-on-surface/10 py-8">
              <div>
                <p className="font-display text-3xl font-bold text-gold">18+</p>
                <p className="text-xs tracking-widest text-inverse-on-surface/60 uppercase">Anos de experiência</p>
              </div>
              <div className="h-10 w-px bg-inverse-on-surface/10" />
              <div>
                <p className="font-display text-3xl font-bold text-gold">R$ 73M</p>
                <p className="text-xs tracking-widest text-inverse-on-surface/60 uppercase">VGV Comercializado</p>
              </div>
              <div className="h-10 w-px bg-inverse-on-surface/10" />
              <div>
                <p className="font-display text-3xl font-bold text-gold">1400+</p>
                <p className="text-xs tracking-widest text-inverse-on-surface/60 uppercase">Famílias atendidas</p>
              </div>
            </div>
            <div className="mt-10 flex gap-4">
               <a
                href="#falar"
                className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Solicitar Consultoria
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* O Manifesto — Centro Emocional */}
      <Faixa className="bg-background">
        <div className="mx-auto max-w-4xl text-center">
          <p className="t-caps text-gold">Filosofia de Trabalho</p>
          <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight md:text-5xl">
            O Manifesto Ferragano One
          </h2>
          <div className="mt-16 space-y-24 text-left">
            {MANIFESTO_BLOCOS.map((bloco, i) => (
              <div key={bloco.id} className="reveal grid gap-8 md:grid-cols-[120px_1fr]">
                <span className="font-mono text-4xl text-gold/30">{(i + 1).toString().padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight">{bloco.eyebrow}</h3>
                  {bloco.destaque && (
                    <p className="mt-4 border-l-2 border-gold pl-6 text-xl font-medium italic text-foreground">
                      {bloco.destaque}
                    </p>
                  )}
                  <div className="mt-6 space-y-4 text-muted-foreground">
                    {bloco.paragrafos.map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Faixa>

      {/* Números Relevantes */}
      <section className="bg-inverse-surface py-20 text-inverse-on-surface">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <div className="grid gap-12 sm:grid-cols-3">
            {NUMEROS_MANIFESTO.map((n) => (
              <div key={n.label} className="text-center">
                <Icon name={n.icon} size={32} className="mx-auto text-gold" />
                <p className="mt-4 font-display text-4xl font-bold tracking-tight md:text-6xl">
                  {'prefixo' in n ? n.prefixo : ''}{n.valor}{n.sufixo}
                </p>
                <p className="mt-2 text-sm text-inverse-on-surface/60 uppercase tracking-widest">{n.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call for contact */}
      <Faixa className="text-center">
        <TituloSecao 
          titulo="Vamos construir o seu próximo capítulo?"
          lead="Agende uma consultoria estratégica e entenda como o meu método pode acelerar seu patrimônio."
        />
        <div className="mt-10 flex justify-center">
          <a
            href="#falar"
            className="press inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-10 text-base font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Falar com Ferragano
            <Icon name="arrow_forward" size={20} />
          </a>
        </div>
      </Faixa>

      <CtaFinal />
      <WhatsAppFab />
    </SiteLayout>
  );
}
