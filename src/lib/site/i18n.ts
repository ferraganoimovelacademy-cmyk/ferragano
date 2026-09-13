/**
 * Sprint UI 08 — Multi-idioma do site público.
 *
 * Fonte única de: idiomas suportados, slug de cada página por idioma,
 * construção de caminhos e tags de `hreflang`/canonical por idioma.
 *
 * Regra: o português (Brasil) é o idioma padrão e vive sem prefixo
 * (`/metodo`). Inglês e espanhol vivem sob prefixo com slug traduzido
 * (`/en/method`, `/es/metodo`), de modo que cada idioma tem URL própria
 * e indexável — nenhuma tradução acontece só no cliente.
 */
import { SITE_NOME, SITE_URL, url } from "@/lib/site/seo";
// @ts-ignore
import type { PostIntl } from "./i18n-blog";

export const IDIOMAS = ["pt", "en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_PADRAO: Idioma = "pt";

export const IDIOMA_META: Record<
  Idioma,
  { nativo: string; sigla: string; bcp47: string; hreflang: string; ogLocale: string }
> = {
  pt: { nativo: "Português", sigla: "PT", bcp47: "pt-BR", hreflang: "pt-BR", ogLocale: "pt_BR" },
  en: { nativo: "English", sigla: "EN", bcp47: "en", hreflang: "en", ogLocale: "en_US" },
  es: { nativo: "Español", sigla: "ES", bcp47: "es", hreflang: "es", ogLocale: "es_ES" },
};

/** Páginas públicas com endereço próprio em cada idioma. */
export type PaginaKey =
  | "home"
  | "metodo"
  | "sobre"
  | "manifesto"
  | "contato"
  | "simulacao"
  | "blog"
  | "blogPost"
  | "lancamentos"
  | "empreendimento"
  | "carreiras";

/** Slug de cada página, sem prefixo de idioma. Vazio = raiz. */
const SLUG: Record<PaginaKey, Record<Idioma, string>> = {
  home: { pt: "", en: "", es: "" },
  metodo: { pt: "metodo", en: "method", es: "metodo" },
  sobre: { pt: "sobre", en: "about", es: "sobre-nosotros" },
  manifesto: { pt: "manifesto", en: "manifesto", es: "manifiesto" },
  contato: { pt: "contato", en: "contact", es: "contacto" },
  simulacao: { pt: "simulacao", en: "simulator", es: "simulador" },
  blog: { pt: "blog", en: "insights", es: "analisis" },
  blogPost: { pt: "blog", en: "insights", es: "analisis" },
  lancamentos: { pt: "empreendimentos/cury", en: "new-developments", es: "lanzamientos" },
  empreendimento: { pt: "empreendimentos/cury", en: "new-developments", es: "lanzamientos" },
  carreiras: { pt: "carreiras", en: "careers", es: "carreras" },
};

/** Páginas que recebem um segmento dinâmico depois do slug. */
const COM_PARAMETRO: PaginaKey[] = ["blogPost", "empreendimento"];

function juntar(idioma: Idioma, resto: string) {
  const prefixo = idioma === IDIOMA_PADRAO ? "" : `/${idioma}`;
  if (!resto) return prefixo || "/";
  return `${prefixo}/${resto}`;
}

/**
 * Caminho absoluto (relativo ao domínio) de uma página em um idioma.
 * `param` é o slug dinâmico (post do blog ou empreendimento).
 */
export function caminho(pagina: PaginaKey, idioma: Idioma, param?: string): string {
  const base = SLUG[pagina][idioma];
  if (COM_PARAMETRO.includes(pagina)) {
    if (!param) return juntar(idioma, base);
    return juntar(idioma, `${base}/${param}`);
  }
  return juntar(idioma, base);
}

/**
 * Caminhos equivalentes em todos os idiomas.
 * `params` permite slug dinâmico diferente por idioma (post traduzido).
 */
export function equivalentes(
  pagina: PaginaKey,
  params?: Partial<Record<Idioma, string>>,
): Record<Idioma, string> {
  return {
    pt: caminho(pagina, "pt", params?.pt),
    en: caminho(pagina, "en", params?.en),
    es: caminho(pagina, "es", params?.es),
  };
}

/** `<link rel="canonical">` + `hreflang` de todos os idiomas + `x-default`. */
export function linksI18n(
  pagina: PaginaKey,
  idioma: Idioma,
  params?: Partial<Record<Idioma, string>>,
) {
  const rotas = equivalentes(pagina, params);
  return [
    { rel: "canonical", href: url(rotas[idioma]) },
    ...IDIOMAS.map((l) => ({
      rel: "alternate",
      hrefLang: IDIOMA_META[l].hreflang,
      href: url(rotas[l]),
    })),
    { rel: "alternate", hrefLang: "x-default", href: url(rotas[IDIOMA_PADRAO]) },
  ];
}

/** Title, description, OG, Twitter e robots já com o idioma correto. */
export function metaI18n({
  titulo,
  descricao,
  pagina,
  idioma,
  params,
  tipo = "website",
  imagem,
  noindex = false,
}: {
  titulo: string;
  descricao: string;
  pagina: PaginaKey;
  idioma: Idioma;
  params?: Partial<Record<Idioma, string>>;
  tipo?: "website" | "article" | "profile";
  imagem?: string;
  noindex?: boolean;
}) {
  const path = equivalentes(pagina, params)[idioma];
  const tags: Record<string, string>[] = [
    { title: titulo },
    { name: "description", content: descricao },
    { property: "og:title", content: titulo },
    { property: "og:description", content: descricao },
    { property: "og:type", content: tipo },
    { property: "og:url", content: url(path) },
    { property: "og:site_name", content: SITE_NOME },
    { property: "og:locale", content: IDIOMA_META[idioma].ogLocale },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: titulo },
    { name: "twitter:description", content: descricao },
  ];
  if (imagem) {
    tags.push({ property: "og:image", content: imagem });
    tags.push({ name: "twitter:image", content: imagem });
  }
  if (noindex) tags.push({ name: "robots", content: "noindex, nofollow" });
  return tags;
}

/** Resolve o restante do caminho (`_splat`) de uma rota `/en/*` ou `/es/*`. */
export function resolverRota(
  idioma: Idioma,
  splat: string | undefined,
): { pagina: PaginaKey; param?: string } | null {
  const limpo = (splat ?? "").replace(/^\/+|\/+$/g, "");
  if (!limpo) return { pagina: "home" };

  const diretas: PaginaKey[] = [
    "metodo",
    "sobre",
    "manifesto",
    "contato",
    "simulacao",
    "blog",
    "lancamentos",
    "carreiras",
  ];
  for (const pagina of diretas) {
    if (SLUG[pagina][idioma] === limpo) return { pagina };
  }

  const baseBlog = SLUG.blogPost[idioma];
  if (limpo.startsWith(`${baseBlog}/`)) {
    return { pagina: "blogPost", param: limpo.slice(baseBlog.length + 1) };
  }
  const baseEmp = SLUG.empreendimento[idioma];
  if (limpo.startsWith(`${baseEmp}/`)) {
    return { pagina: "empreendimento", param: limpo.slice(baseEmp.length + 1) };
  }
  return null;
}

export const SITE = SITE_URL;

/**
 * Sprint UI 08 — Central de caminhos cruzados para SEO.
 * Expõe as rotas equivalentes em todos os idiomas para as tags hreflang.
 */
export const PathIntl = {
  home: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("home", l)) })),
  metodo: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("metodo", l)) })),
  sobre: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("sobre", l)) })),
  manifesto: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("manifesto", l)) })),
  contato: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("contato", l)) })),
  simulacao: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("simulacao", l)) })),
  blog: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("blog", l)) })),
  carreiras: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("carreiras", l)) })),
  lancamentos: IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("lancamentos", l)) })),
  blogPost: (slugPt: string) => {
    // Importação dinâmica circular via SLUG_POST se necessário, 
    // mas aqui fazemos o lookup básico para hreflang.
    return IDIOMAS.map((l) => {
      // SLUG_POST está em i18n-blog.ts, importamos aqui:
      const { SLUG_POST } = require("./i18n-blog") as { SLUG_POST: Record<string, Record<Idioma, string>> };
      const slugLang = SLUG_POST[slugPt]?.[l] || slugPt;
      return { lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("blogPost", l, slugLang)) };
    });
  },
  empreendimento: (slug: string) =>
    IDIOMAS.map((l) => ({ lang: l, hreflang: IDIOMA_META[l].hreflang, href: url(caminho("empreendimento", l, slug)) })),
};