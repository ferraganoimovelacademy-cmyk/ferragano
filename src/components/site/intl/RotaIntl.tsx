import { LayoutIntl } from "@/components/site/intl/LayoutIntl";
import {
  BlogIntl,
  CarreirasIntl,
  ContatoIntl,
  EmpreendimentoIntl,
  HomeIntl,
  LancamentosIntl,
  ManifestoIntl,
  MetodoIntl,
  PostIntlPage,
  SimulacaoIntl,
  SobreIntl,
} from "@/components/site/intl/PaginasIntl";
import { listCuryEmpreendimentos, getCuryEmpreendimento } from "@/lib/platform/cury.functions";
import type { CuryDetalhe, CuryEmpreendimento } from "@/lib/site/cury";
import {
  IDIOMA_META,
  linksI18n,
  metaI18n,
  resolverRota,
  type Idioma,
  type PaginaKey,
} from "@/lib/site/i18n";
import { SLUG_POST, acharPostIntl } from "@/lib/site/i18n-blog";
import { textos } from "@/lib/site/i18n-textos";
import { OG_RETRATO } from "@/lib/site/seo";

export type DadosIntl = {
  pagina: PaginaKey | null;
  param?: string;
  itens?: CuryEmpreendimento[];
  detalhe?: CuryDetalhe | null;
};

type Estrangeiro = Exclude<Idioma, "pt">;

/** Loader compartilhado pelas rotas `/en/*` e `/es/*`. */
export async function carregarIntl(idioma: Estrangeiro, splat?: string): Promise<DadosIntl> {
  const alvo = resolverRota(idioma, splat);
  if (!alvo) return { pagina: null };

  if (alvo.pagina === "lancamentos") {
    return { pagina: alvo.pagina, itens: await listCuryEmpreendimentos() };
  }
  if (alvo.pagina === "empreendimento" && alvo.param) {
    return {
      pagina: alvo.pagina,
      param: alvo.param,
      detalhe: (await getCuryEmpreendimento({ data: { slug: alvo.param } })) as CuryDetalhe | null,
    };
  }
  return { pagina: alvo.pagina, param: alvo.param };
}

/** head() compartilhado: title, description, OG e hreflang de cada idioma. */
export function headIntl(idioma: Estrangeiro, dados: DadosIntl | undefined) {
  const t = textos(idioma);
  const pagina = dados?.pagina;

  if (!pagina) {
    return {
      meta: [{ title: `${t.chrome.naoTraduzido} — Ferragano` }, { name: "robots", content: "noindex" }],
    };
  }

  if (pagina === "blogPost") {
    const post = dados?.param ? acharPostIntl(idioma, dados.param) : null;
    if (!post) {
      return { meta: [{ title: t.blog.naoEncontrado }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: metaI18n({
        titulo: `${post.titulo} | Ferragano`,
        descricao: post.resumo,
        pagina,
        idioma,
        params: SLUG_POST[post.id],
        tipo: "article",
        imagem: OG_RETRATO,
      }),
      links: linksI18n(pagina, idioma, SLUG_POST[post.id]),
    };
  }

  if (pagina === "empreendimento") {
    const e = dados?.detalhe?.empreendimento;
    const slug = dados?.param ?? "";
    const params = { pt: slug, en: slug, es: slug };
    return {
      meta: metaI18n({
        titulo: e ? `${e.nome} — ${t.lancamentos.h1} | Ferragano` : t.lancamentos.titulo,
        descricao: e?.descricao?.slice(0, 155) ?? t.lancamentos.descricao,
        pagina,
        idioma,
        params,
        imagem: OG_RETRATO,
      }),
      links: linksI18n(pagina, idioma, params),
    };
  }

  const copy = {
    home: { titulo: t.home.titulo, descricao: t.home.descricao },
    metodo: { titulo: t.metodo.titulo, descricao: t.metodo.descricao },
    sobre: { titulo: t.sobre.titulo, descricao: t.sobre.descricao },
    manifesto: { titulo: t.manifesto.titulo, descricao: t.manifesto.descricao },
    contato: { titulo: t.contato.titulo, descricao: t.contato.descricao },
    simulacao: { titulo: t.simulacao.titulo, descricao: t.simulacao.descricao },
    blog: { titulo: t.blog.titulo, descricao: t.blog.descricao },
    blogPost: { titulo: t.blog.titulo, descricao: t.blog.descricao },
    lancamentos: { titulo: t.lancamentos.titulo, descricao: t.lancamentos.descricao },
    empreendimento: { titulo: t.lancamentos.titulo, descricao: t.lancamentos.descricao },
    carreiras: { titulo: t.carreiras.titulo, descricao: t.carreiras.descricao },
  }[pagina];

  return {
    meta: metaI18n({ ...copy, pagina, idioma, imagem: OG_RETRATO }),
    links: linksI18n(pagina, idioma),
  };
}

/** Corpo da rota: casca traduzida + página resolvida. */
export function RotaIntl({ idioma, dados }: { idioma: Estrangeiro; dados: DadosIntl }) {
  const t = textos(idioma);
  const pagina = dados.pagina;

  if (!pagina) {
    return (
      <LayoutIntl idioma={idioma} pagina="home">
        <div className="mx-auto max-w-[1200px] px-4 py-24 md:px-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">404</h1>
          <p className="mt-3 text-muted-foreground">{t.chrome.naoTraduzido}</p>
        </div>
      </LayoutIntl>
    );
  }

  const params =
    pagina === "blogPost" && dados.param
      ? (SLUG_POST[
          Object.keys(SLUG_POST).find((k) => SLUG_POST[k][idioma] === dados.param) ?? ""
        ] ?? undefined)
      : pagina === "empreendimento" && dados.param
        ? { pt: dados.param, en: dados.param, es: dados.param }
        : undefined;

  return (
    <LayoutIntl idioma={idioma} pagina={pagina} params={params}>
      <div lang={IDIOMA_META[idioma].bcp47}>
        {pagina === "home" && <HomeIntl idioma={idioma} />}
        {pagina === "metodo" && <MetodoIntl idioma={idioma} />}
        {pagina === "sobre" && <SobreIntl idioma={idioma} />}
        {pagina === "manifesto" && <ManifestoIntl idioma={idioma} />}
        {pagina === "contato" && <ContatoIntl idioma={idioma} />}
        {pagina === "simulacao" && <SimulacaoIntl idioma={idioma} />}
        {pagina === "blog" && <BlogIntl idioma={idioma} />}
        {pagina === "blogPost" && <PostIntlPage idioma={idioma} slug={dados.param ?? ""} />}
        {pagina === "lancamentos" && (
          <LancamentosIntl idioma={idioma} itens={dados.itens ?? []} />
        )}
        {pagina === "empreendimento" && (
          <EmpreendimentoIntl idioma={idioma} detalhe={dados.detalhe ?? null} />
        )}
        {pagina === "carreiras" && <CarreirasIntl idioma={idioma} />}
      </div>
    </LayoutIntl>
  );
}