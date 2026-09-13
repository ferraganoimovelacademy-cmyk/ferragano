import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { FormularioConsultoria } from "@/components/site/FormularioConsultoria";
import { LinkI, MSG_WHATS } from "@/components/site/intl/LayoutIntl";
import { formatBRL } from "@/lib/platform/comercial";
import { whatsappLink } from "@/lib/site/contato";
import { caminho, type Idioma } from "@/lib/site/i18n";
import {
  CATEGORIAS_INTL,
  SLUG_POST,
  acharPostIntl,
  postsIntl,
  type PostIntl,
} from "@/lib/site/i18n-blog";
import { textos } from "@/lib/site/i18n-textos";
import type { CuryDetalhe, CuryEmpreendimento } from "@/lib/site/cury";

/**
 * Páginas públicas em inglês e espanhol. Mesmo esqueleto visual das rotas em
 * português (Faixa/TituloSecao, tokens semânticos), com copy traduzida vinda
 * de `i18n-textos` e dados vindos das mesmas server functions públicas.
 */

type Props = { idioma: Exclude<Idioma, "pt"> };

function CtaConsultoria({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <Faixa className="border-t border-border">
      <div className="panel flex flex-col items-start gap-5 p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {t.home.ctaTitulo}
          </h2>
          <p className="mt-2 text-muted-foreground">{t.home.ctaLead}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={whatsappLink(MSG_WHATS[idioma])}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Icon name="chat" size={16} aria-hidden />
            {t.chrome.falarAgora}
          </a>
          <LinkI
            to={caminho("contato", idioma)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t.chrome.consultoria}
          </LinkI>
        </div>
      </div>
    </Faixa>
  );
}

export function HomeIntl({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <>
      <Faixa>
        <p className="t-caps text-gold">{t.home.heroEyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold tracking-tight md:text-6xl">
          {t.home.heroTitulo}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t.home.heroLead}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t.chrome.autoridade}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkI
            to={caminho("lancamentos", idioma)}
            className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Icon name="domain" size={18} aria-hidden />
            {t.chrome.verLancamentos}
          </LinkI>
          <LinkI
            to={caminho("metodo", idioma)}
            className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t.nav.metodo}
          </LinkI>
        </div>

        <dl className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.home.provas.map((p) => (
            <div key={p.rotulo} className="panel p-5">
              <dt className="text-sm text-muted-foreground">{p.rotulo}</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tracking-tight">{p.valor}</dd>
            </div>
          ))}
        </dl>
      </Faixa>

      <Faixa className="border-t border-border">
        <TituloSecao
          eyebrow={t.home.problemaTitulo}
          titulo={t.home.problemaLead}
        />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {t.home.problemas.map((p) => (
            <li key={p} className="panel p-5 text-sm text-muted-foreground">
              <Icon name="warning" size={18} aria-hidden className="text-gold" />
              <span className="mt-3 block">{p}</span>
            </li>
          ))}
        </ul>
      </Faixa>

      <Faixa className="border-t border-border">
        <TituloSecao eyebrow={t.home.metodoTitulo} titulo={t.home.metodoLead} />
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {t.metodo.etapas.map((e) => (
            <li key={e.titulo} className="panel p-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">{e.titulo}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{e.texto}</p>
            </li>
          ))}
        </ol>
      </Faixa>

      <Faixa className="border-t border-border">
        <TituloSecao eyebrow={t.home.porqueTitulo} titulo={t.home.porqueLead} />
      </Faixa>

      <Faixa className="border-t border-border">
        <TituloSecao titulo={t.home.faqTitulo} />
        <div className="mt-8 grid gap-3">
          {t.home.faq.map((f) => (
            <details key={f.pergunta} className="panel p-5">
              <summary className="cursor-pointer font-medium">{f.pergunta}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.resposta}</p>
            </details>
          ))}
        </div>
      </Faixa>

      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function MetodoIntl({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <>
      <Faixa>
        <TituloSecao eyebrow={t.metodo.eyebrow} titulo={t.metodo.h1} lead={t.metodo.lead} />
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {t.metodo.etapas.map((e) => (
            <li key={e.titulo} className="panel p-6">
              <h2 className="font-display text-lg font-semibold tracking-tight">{e.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{e.texto}</p>
            </li>
          ))}
        </ol>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function SobreIntl({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <>
      <Faixa>
        <TituloSecao eyebrow={t.sobre.eyebrow} titulo={t.sobre.h1} lead={t.sobre.lead} />
        <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            {t.sobre.paragrafos.map((p) => (
              <p key={p} className="text-muted-foreground md:text-lg">
                {p}
              </p>
            ))}
          </div>
          <ol className="grid gap-3">
            {t.sobre.marcos.map((m) => (
              <li key={m.ano} className="panel p-4">
                <p className="t-caps text-gold">{m.ano}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function ManifestoIntl({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <>
      <Faixa>
        <TituloSecao eyebrow={t.manifesto.eyebrow} titulo={t.manifesto.h1} lead={t.manifesto.lead} />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {t.manifesto.blocos.map((b) => (
            <article key={b.titulo} className="panel p-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">{b.titulo}</h2>
              <p className="mt-2 text-muted-foreground">{b.texto}</p>
            </article>
          ))}
        </div>
        <p className="mt-10 max-w-2xl font-display text-2xl tracking-tight text-gold">
          “{t.manifesto.fecho}”
        </p>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function ContatoIntl({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <Faixa>
      <TituloSecao eyebrow={t.contato.eyebrow} titulo={t.contato.h1} lead={t.contato.lead} />
      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t.contato.canaisTitulo}
          </h2>
          <ul className="mt-4 grid gap-3">
            {t.contato.canais.map((c) => (
              <li key={c.titulo} className="panel flex items-start gap-3 p-4">
                <Icon name={c.icone} size={20} aria-hidden className="mt-0.5 text-gold" />
                <span>
                  <span className="block text-sm font-medium">{c.titulo}</span>
                  <span className="block text-sm text-muted-foreground">{c.texto}</span>
                </span>
              </li>
            ))}
          </ul>
          <a
            href={whatsappLink(MSG_WHATS[idioma])}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Icon name="chat" size={16} aria-hidden />
            {t.chrome.falarAgora}
          </a>
        </div>
        <FormularioConsultoria idioma={idioma} />
      </div>
    </Faixa>
  );
}

/* ---------- Simulador (determinístico, client-side, sem persistência) ---------- */

const PREMISSAS = {
  moradia: { valorizacao: 0.06, aluguel: 0 },
  renda: { valorizacao: 0.07, aluguel: 0.0045 },
  patrimonio: { valorizacao: 0.08, aluguel: 0.004 },
} as const;

type ObjetivoSim = keyof typeof PREMISSAS;

const ROTULO_OBJETIVO: Record<Exclude<Idioma, "pt">, Record<ObjetivoSim, string>> = {
  en: { moradia: "To live in", renda: "Rental income", patrimonio: "Long-term wealth" },
  es: { moradia: "Para vivir", renda: "Generar renta", patrimonio: "Construir patrimonio" },
};

const ROTULO_CAMPO: Record<Exclude<Idioma, "pt">, Record<string, string>> = {
  en: {
    renda: "Monthly household income (BRL)",
    entrada: "Available down payment (BRL)",
    anos: "Horizon (years)",
    objetivo: "Goal",
    parcela: "Affordable instalment",
    ativo: "Purchase capacity",
    projetado: "Projected value",
    renda10: "Accumulated rental income",
    premissas: "Assumptions",
  },
  es: {
    renda: "Ingreso familiar mensual (BRL)",
    entrada: "Entrada disponible (BRL)",
    anos: "Horizonte (años)",
    objetivo: "Objetivo",
    parcela: "Cuota compatible",
    ativo: "Capacidad de compra",
    projetado: "Valor proyectado",
    renda10: "Renta acumulada",
    premissas: "Premisas",
  },
};

function paraNumero(v: string) {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function SimulacaoIntl({ idioma }: Props) {
  const t = textos(idioma);
  const campo = ROTULO_CAMPO[idioma];
  const [renda, setRenda] = useState("12000");
  const [entrada, setEntrada] = useState("60000");
  const [anos, setAnos] = useState(10);
  const [objetivo, setObjetivo] = useState<ObjetivoSim>("patrimonio");

  const r = useMemo(() => {
    const premissa = PREMISSAS[objetivo];
    const parcela = paraNumero(renda) * 0.3;
    const inicial = Math.max(paraNumero(entrada) + parcela * 12 * Math.min(anos, 5), 0);
    let valor = inicial;
    let rendaAcumulada = 0;
    for (let ano = 1; ano <= anos; ano++) {
      valor = valor * (1 + premissa.valorizacao);
      if (ano > 2) rendaAcumulada += valor * premissa.aluguel * 12;
    }
    return { parcela, inicial, valor, rendaAcumulada, premissa };
  }, [renda, entrada, anos, objetivo]);

  return (
    <Faixa>
      <TituloSecao eyebrow={t.simulacao.eyebrow} titulo={t.simulacao.h1} lead={t.simulacao.lead} />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="panel grid gap-4 p-6">
          <div className="grid gap-1.5">
            <Label htmlFor="sim-renda">{campo.renda}</Label>
            <Input
              id="sim-renda"
              inputMode="numeric"
              value={renda}
              onChange={(e) => setRenda(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim-entrada">{campo.entrada}</Label>
            <Input
              id="sim-entrada"
              inputMode="numeric"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sim-anos">
              {campo.anos}: {anos}
            </Label>
            <input
              id="sim-anos"
              type="range"
              min={3}
              max={20}
              value={anos}
              onChange={(e) => setAnos(Number(e.target.value))}
              className="h-11 w-full accent-[var(--color-primary)]"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">{campo.objetivo}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(PREMISSAS) as ObjetivoSim[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={objetivo === o}
                  onClick={() => setObjetivo(o)}
                  className={`h-10 rounded-full border px-4 text-sm transition-colors ${
                    objetivo === o
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {ROTULO_OBJETIVO[idioma][o]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="panel grid gap-4 p-6">
          <Resultado rotulo={campo.parcela} valor={formatBRL(r.parcela)} />
          <Resultado rotulo={campo.ativo} valor={formatBRL(r.inicial)} />
          <Resultado rotulo={campo.projetado} valor={formatBRL(r.valor)} destaque />
          <Resultado rotulo={campo.renda10} valor={formatBRL(r.rendaAcumulada)} />
          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            <p className="font-medium">{campo.premissas}</p>
            <p className="mt-1">
              {(r.premissa.valorizacao * 100).toFixed(0)}% / year ·{" "}
              {(r.premissa.aluguel * 100).toFixed(2)}% / month · 30% of income
            </p>
            <p className="mt-2">{t.simulacao.aviso}</p>
          </div>
        </div>
      </div>
    </Faixa>
  );
}

function Resultado({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p
        className={`font-display font-semibold tracking-tight ${
          destaque ? "text-3xl text-gold" : "text-xl"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

/* ---------- Blog ---------- */

export function BlogIntl({ idioma }: Props) {
  const t = textos(idioma);
  const posts = postsIntl(idioma);
  const [categoria, setCategoria] = useState<string | null>(null);
  const cats = CATEGORIAS_INTL[idioma];
  const lista = categoria ? posts.filter((p) => p.categoria === categoria) : posts;

  return (
    <Faixa>
      <TituloSecao eyebrow={t.blog.eyebrow} titulo={t.blog.h1} lead={t.blog.lead} />

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={categoria === null}
          onClick={() => setCategoria(null)}
          className={`h-10 rounded-full border px-4 text-sm ${
            categoria === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-primary"
          }`}
        >
          {t.blog.todos}
        </button>
        {Object.keys(cats).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={categoria === c}
            onClick={() => setCategoria(c)}
            className={`h-10 rounded-full border px-4 text-sm ${
              categoria === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary"
            }`}
          >
            {cats[c]}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {lista.map((p) => (
          <article key={p.id} className="panel p-6">
            <p className="t-caps text-gold">{cats[p.categoria]}</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{p.titulo}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.resumo}</p>
            <p className="mt-3 text-xs text-muted-foreground">{p.leitura}</p>
            <LinkI
              to={caminho("blogPost", idioma, SLUG_POST[p.id][idioma])}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t.blog.ler}
              <Icon name="arrow_forward" size={16} aria-hidden />
            </LinkI>
          </article>
        ))}
      </div>
    </Faixa>
  );
}

export function PostIntlPage({ idioma, slug }: Props & { slug: string }) {
  const t = textos(idioma);
  const post: PostIntl | null = acharPostIntl(idioma, slug);

  if (!post) {
    return (
      <Faixa>
        <TituloSecao titulo={t.blog.naoEncontrado} />
        <LinkI
          to={caminho("blog", idioma)}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm"
        >
          <Icon name="arrow_back" size={16} aria-hidden />
          {t.blog.voltar}
        </LinkI>
      </Faixa>
    );
  }

  return (
    <>
      <Faixa>
        <article className="mx-auto max-w-2xl">
          <p className="t-caps text-gold">{CATEGORIAS_INTL[idioma][post.categoria]}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {post.titulo}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{post.resumo}</p>
          <p className="mt-2 text-xs text-muted-foreground">{post.leitura}</p>
          <div className="mt-8 grid gap-4">
            {post.paragrafos.map((p) => (
              <p key={p} className="text-muted-foreground md:text-lg">
                {p}
              </p>
            ))}
          </div>
          <LinkI
            to={caminho("blog", idioma)}
            className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm"
          >
            <Icon name="arrow_back" size={16} aria-hidden />
            {t.blog.voltar}
          </LinkI>
        </article>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

/* ---------- Portfólio ---------- */

function anoEntregaIntl(data: string | null, idioma: Exclude<Idioma, "pt">) {
  if (!data) return idioma === "en" ? "Ready to move in" : "Listo para habitar";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return idioma === "en" ? "To be defined" : "A definir";
  return `${d.getUTCFullYear()}`;
}

export function LancamentosIntl({
  idioma,
  itens,
}: Props & { itens: CuryEmpreendimento[] }) {
  const t = textos(idioma);
  return (
    <>
      <Faixa>
        <TituloSecao
          eyebrow={t.lancamentos.eyebrow}
          titulo={t.lancamentos.h1}
          lead={t.lancamentos.lead}
        />

        {itens.length === 0 ? (
          <p className="mt-8 text-muted-foreground">{t.lancamentos.vazio}</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {itens.map((e) => (
              <article key={e.id} className="panel flex flex-col p-5">
                <h2 className="font-display text-lg font-semibold tracking-tight">{e.nome}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[e.bairro, e.cidade, e.uf].filter(Boolean).join(" · ")}
                </p>
                <dl className="mt-4 grid gap-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t.lancamentos.aPartirDe}</dt>
                    <dd className="font-medium">
                      {e.preco_min ? formatBRL(e.preco_min) : t.lancamentos.sobPedido}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t.lancamentos.entrega}</dt>
                    <dd className="font-medium">{anoEntregaIntl(e.entrega_prevista, idioma)}</dd>
                  </div>
                  {e.dormitorios.length > 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{t.lancamentos.dormitorios}</dt>
                      <dd className="font-medium">{e.dormitorios.join(", ")}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t.lancamentos.estoque}</dt>
                    <dd className="font-medium">
                      {e.disponiveis} {t.lancamentos.disponiveis}
                    </dd>
                  </div>
                </dl>
                <LinkI
                  to={caminho("empreendimento", idioma, e.slug)}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {t.lancamentos.verDetalhes}
                </LinkI>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">{t.lancamentos.avisoAtivos}</p>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function EmpreendimentoIntl({
  idioma,
  detalhe,
}: Props & { detalhe: CuryDetalhe | null }) {
  const t = textos(idioma);

  if (!detalhe) {
    return (
      <Faixa>
        <TituloSecao titulo={t.lancamentos.vazio} />
        <LinkI
          to={caminho("lancamentos", idioma)}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm"
        >
          <Icon name="arrow_back" size={16} aria-hidden />
          {t.chrome.voltar}
        </LinkI>
      </Faixa>
    );
  }

  const e = detalhe.empreendimento;
  const faixaArea =
    e.area_min && e.area_max ? `${e.area_min}–${e.area_max} m²` : t.lancamentos.sobPedido;

  return (
    <>
      <Faixa>
        <p className="t-caps text-gold">{t.lancamentos.eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
          {e.nome}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {[e.bairro, e.cidade, e.uf].filter(Boolean).join(" · ")}
        </p>
        {e.descricao && <p className="mt-5 max-w-2xl text-muted-foreground">{e.descricao}</p>}

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-5">
            <dt className="text-sm text-muted-foreground">{t.lancamentos.aPartirDe}</dt>
            <dd className="mt-1 font-display text-xl font-semibold">
              {e.preco_min ? formatBRL(e.preco_min) : t.lancamentos.sobPedido}
            </dd>
          </div>
          <div className="panel p-5">
            <dt className="text-sm text-muted-foreground">{t.lancamentos.metragem}</dt>
            <dd className="mt-1 font-display text-xl font-semibold">{faixaArea}</dd>
          </div>
          <div className="panel p-5">
            <dt className="text-sm text-muted-foreground">{t.lancamentos.entrega}</dt>
            <dd className="mt-1 font-display text-xl font-semibold">
              {anoEntregaIntl(e.entrega_prevista, idioma)}
            </dd>
          </div>
          <div className="panel p-5">
            <dt className="text-sm text-muted-foreground">{t.lancamentos.estoque}</dt>
            <dd className="mt-1 font-display text-xl font-semibold">
              {e.disponiveis}/{e.total_unidades}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={whatsappLink(`${MSG_WHATS[idioma]} — ${e.nome}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Icon name="chat" size={18} aria-hidden />
            {t.lancamentos.consultarUnidades}
          </a>
          <LinkI
            to={caminho("lancamentos", idioma)}
            className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Icon name="arrow_back" size={16} aria-hidden />
            {t.chrome.voltar}
          </LinkI>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">{t.lancamentos.avisoAtivos}</p>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function CarreirasIntl({ idioma }: Props) {
  const t = textos(idioma);
  return (
    <>
      <Faixa>
        <TituloSecao eyebrow={t.carreiras.eyebrow} titulo={t.carreiras.h1} lead={t.carreiras.lead} />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {t.carreiras.pontos.map((p) => (
            <li key={p} className="panel p-5 text-sm text-muted-foreground">
              <Icon name="workspace_premium" size={18} aria-hidden className="text-gold" />
              <span className="mt-3 block">{p}</span>
            </li>
          ))}
        </ul>
      </Faixa>
      <CtaConsultoria idioma={idioma} />
    </>
  );
}

export function BotaoTopo() {
  return null;
}