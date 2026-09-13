import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import heroTorre from "@/assets/hero-torre.jpg";
import retrato from "@/assets/carlos-ferragano.jpg";
import marca from "@/assets/ferragano-mark.png";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/ui/input";
import { useParallax } from "@/hooks/use-parallax";
import { useReveal } from "@/hooks/use-reveal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPREENDIMENTO_STATUS,
  EMPREENDIMENTO_SEGMENTOS,
  empStatusLabels,
  segmentoLabels,
} from "@/lib/platform/comercial";
import { WHATSAPP_MSG_CONSULTORIA, WHATSAPP_MSG_PADRAO, whatsappLink } from "@/lib/site/contato";
import {
  HERO_TITULO_1,
  HERO_TITULO_2,
  LINHA_AUTORIDADE,
  PROMESSA,
  RESPONSAVEL,
} from "@/lib/site/posicionamento";

const TODOS = "todos";

/**
 * Sprint UI 07 · Gate 01 — Luxury Home.
 * Palco em tela cheia: mídia cinematográfica em 4 camadas de parallax,
 * marca, retrato do responsável, headline e saídas de conversão.
 * A busca inteligente vive na faixa de vidro imediatamente abaixo da dobra.
 */
export function HeroLanding({ descricao }: { descricao: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(TODOS);
  const [segmento, setSegmento] = useState(TODOS);
  const fundoRef = useParallax<HTMLDivElement>(0.16);
  const brilhoRef = useParallax<HTMLDivElement>(0.34);
  const motesRef = useParallax<HTMLDivElement>(0.08);
  const titulo = useReveal<HTMLDivElement>();
  const cartao = useReveal<HTMLDivElement>(220);
  const painel = useReveal<HTMLFormElement>(120);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      to: "/empreendimentos",
      search: {
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(status !== TODOS ? { status } : {}),
        ...(segmento !== TODOS ? { segmento } : {}),
      },
    });
  }

  return (
    <div className="relative isolate overflow-hidden bg-inverse-surface">
      {/* Camada 1 — mídia: parallax lento + Ken Burns contínuo */}
      <div ref={fundoRef} aria-hidden className="absolute inset-0 -top-[12%] -bottom-[12%] -z-10">
        <img
          src={heroTorre}
          alt="Torre residencial de alto padrão iluminada ao anoitecer"
          width={1920}
          height={1280}
          fetchPriority="high"
          className="cine-bg size-full object-cover opacity-70"
        />
      </div>
      {/* Camada 2 — véu de contraste (fixo, garante legibilidade) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-inverse-surface/85 via-inverse-surface/70 to-inverse-surface"
      />
      {/* Camada 3 — halo dourado com parallax mais rápido */}
      <div ref={brilhoRef} aria-hidden className="absolute inset-x-0 -top-1/4 -z-10 h-[80%]">
        <div className="size-full bg-[radial-gradient(60%_50%_at_70%_35%,color-mix(in_oklab,var(--gold)_25%,transparent),transparent_70%)]" />
      </div>
      {/* Camada 4 — partículas discretas de luz */}
      <div ref={motesRef} aria-hidden className="light-motes absolute inset-0 -z-10" />

      {/* Palco em tela cheia */}
      <section className="relative flex min-h-[100svh] flex-col justify-center">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 pt-28 pb-16 md:px-8 md:pt-36 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div ref={titulo.ref} {...titulo.props} className="reveal-blur min-w-0">
            <span className="flex items-center gap-3">
              <img
                src={marca}
                alt=""
                width={44}
                height={44}
                fetchPriority="high"
                className="size-11 shrink-0 select-none"
              />
              <span className="h-8 w-px bg-inverse-on-surface/20" />
              <span className="t-caps text-gold">{LINHA_AUTORIDADE}</span>
            </span>

            <h1 className="mt-8 max-w-5xl font-display text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-inverse-on-surface md:text-6xl lg:text-[7.5rem]">
              {HERO_TITULO_1} <br />
              <span className="text-gold">{HERO_TITULO_2}</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg text-inverse-on-surface/85 md:text-2xl">
              {PROMESSA}
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <a
                href="#sonhos"
                className="press inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Icon name="search" size={20} />
                Explorar Experiência
              </a>
              <Link
                to="/empreendimentos/cury"
                className="press inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-inverse-on-surface/25 px-8 text-base font-medium text-inverse-on-surface hover:bg-inverse-on-surface/10"
              >
                Cury Collection
                <Icon name="arrow_forward" size={20} />
              </Link>
            </div>
          </div>

          {/* Retrato do responsável em cartão de vidro */}
          <div
            ref={cartao.ref}
            {...cartao.props}
            className="reveal-blur relative min-w-0 overflow-hidden lg:justify-self-end"
          >
            <div className="cine-frame glass-pane p-2">
              <img
                src={retrato}
                alt={`Retrato de ${RESPONSAVEL}, ${LINHA_AUTORIDADE}`}
                width={1200}
                height={1504}
                loading="eager"
                className="cine-media aspect-[4/5] w-full rounded-md object-cover object-[center_20%]"
              />
            </div>
            <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-b-md bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/50 to-transparent p-5 pt-14">
              <p className="font-display text-xl font-semibold tracking-tight text-inverse-on-surface">
                {RESPONSAVEL}
              </p>
              <p className="mt-1 text-xs tracking-[0.14em] text-gold uppercase">
                Especialista em lançamentos Cury
              </p>
              <p className="mt-2 text-[10px] font-medium tracking-[0.08em] text-inverse-on-surface/60 uppercase">
                R$ 73 Milhões em VGV comercializado
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de rolagem ancorado no rodapé do palco */}
        <div
          aria-hidden
          className="mx-auto mb-8 hidden w-full max-w-[1200px] items-center gap-3 px-4 md:flex md:px-8"
        >
          <span className="relative h-10 w-px overflow-hidden bg-inverse-on-surface/20">
            <span className="scroll-hint absolute inset-x-0 top-0 h-4 bg-gold" />
          </span>
          <span className="text-[11px] tracking-[0.18em] text-inverse-on-surface/55 uppercase">
            Role para explorar
          </span>
        </div>
      </section>

      {/* Faixa de busca inteligente — logo após a dobra */}
      <section className="relative border-t border-inverse-on-surface/10">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8 md:py-14">
          <form
            ref={painel.ref}
            {...painel.props}
            onSubmit={buscar}
            className="reveal-blur glass-pane grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
            aria-label="Busca de empreendimentos"
          >
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Bairro, cidade, empreendimento ou construtora"
                aria-label="Buscar por bairro, cidade, empreendimento ou construtora"
                className="h-12 border-transparent bg-background pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                aria-label="Estágio da obra"
                className="h-12 border-transparent bg-background"
              >
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Estágio: todos</SelectItem>
                {EMPREENDIMENTO_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {empStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={segmento} onValueChange={setSegmento}>
              <SelectTrigger
                aria-label="Segmento"
                className="h-12 border-transparent bg-background"
              >
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Segmento: todos</SelectItem>
                {EMPREENDIMENTO_SEGMENTOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {segmentoLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="submit"
              className="press inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Buscar
              <Icon name="arrow_forward" size={18} />
            </button>
          </form>

          <dl className="mt-12 grid gap-8 border-t border-inverse-on-surface/15 pt-10 sm:grid-cols-3">
            {[
              { valor: "Alto padrão", label: "Segmento de atuação" },
              { valor: "Mesmo dia", label: "Prazo médio de retorno" },
              { valor: "Fim a fim", label: "Da simulação às chaves" },
            ].map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-semibold tracking-tight text-inverse-on-surface">
                  {s.valor}
                </dt>
                <dd className="mt-1 text-sm text-inverse-on-surface/70">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
