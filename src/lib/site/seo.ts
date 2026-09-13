/**
 * Sprint UI 03 — SEO Enterprise.
 * Fonte única de metadados e JSON-LD do site público.
 * Nenhuma rota monta schema à mão: usa os construtores daqui.
 */
export const SITE_URL = "https://ferragano.lovable.app";
export const SITE_NOME = "Ferragano";

export const url = (path = "/") => `${SITE_URL}${path}`;

/** Imagem oficial de compartilhamento (1200x630, servida de /public). */
export const OG_RETRATO = url("/og-carlos-ferragano.jpg");

type MetaTag = Record<string, string>;

/** Title, description, OG, Twitter e robots de uma rota. */
export function metaBasica({
  titulo,
  descricao,
  path,
  tipo = "website",
  imagem,
  noindex = false,
  idioma = "pt",
}: {
  titulo: string;
  descricao: string;
  path: string;
  tipo?: "website" | "article" | "profile";
  imagem?: string;
  noindex?: boolean;
  idioma?: string;
}): MetaTag[] {
  const tags: MetaTag[] = [
    { title: titulo },
    { name: "description", content: descricao },
    { property: "og:title", content: titulo },
    { property: "og:description", content: descricao },
    { property: "og:type", content: tipo },
    { property: "og:url", content: url(path) },
    { property: "og:site_name", content: SITE_NOME },
    { property: "og:locale", content: idioma === "pt" ? "pt_BR" : idioma === "en" ? "en_US" : "es_ES" },
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

export const canonical = (path: string) => [{ rel: "canonical", href: url(path) }];

/**
 * Sprint UI 08 — Multi-language SEO.
 * Gera os links hreflang cruzados para todas as versões da página.
 */
export function linksI18n(links: { lang: string; hreflang: string; href: string }[]) {
  return links.map((l) => ({
    rel: "alternate",
    hreflang: l.hreflang,
    href: l.href,
  }));
}

const ENDERECO = {
  "@type": "PostalAddress",
  addressLocality: "São Paulo",
  addressRegion: "SP",
  addressCountry: "BR",
};

/** LocalBusiness + RealEstateAgent da operação. */
export function schemaNegocio() {
  return {
    "@context": "https://schema.org",
    "@type": ["RealEstateAgent", "LocalBusiness"],
    "@id": `${SITE_URL}/#organizacao`,
    name: SITE_NOME,
    url: SITE_URL,
    description:
      "Consultoria patrimonial em lançamentos imobiliários: diagnóstico de crédito, curadoria e acompanhamento até as chaves.",
    areaServed: [{ "@type": "City", name: "São Paulo" }],
    address: ENDERECO,
    priceRange: "$$$",
    knowsAbout: [
      "Lançamentos imobiliários",
      "Financiamento imobiliário",
      "Construção de patrimônio",
      "Zona Oeste de São Paulo",
    ],
  };
}

/** Organization — identidade da marca, usado no root. */
export function schemaOrganizacao() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#marca`,
    name: SITE_NOME,
    url: SITE_URL,
    address: ENDERECO,
    slogan: "Construindo patrimônio, não apenas comprando imóveis.",
  };
}

export function schemaBreadcrumb(trilha: { nome: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trilha.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: url(item.path),
    })),
  };
}

export function schemaFaq(itens: { pergunta: string; resposta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: itens.map((i) => ({
      "@type": "Question",
      name: i.pergunta,
      acceptedAnswer: { "@type": "Answer", text: i.resposta },
    })),
  };
}

/** Person — identidade de Carlos Ferragano, usada em /sobre e /manifesto. */
export function schemaPessoa({ descricao, path }: { descricao: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#carlos-ferragano`,
    name: "Carlos Ferragano",
    jobTitle: "Especialista em lançamentos imobiliários e construção patrimonial",
    description: descricao,
    url: url(path),
    image: OG_RETRATO,
    nationality: { "@type": "Country", name: "Brasil" },
    address: ENDERECO,
    worksFor: { "@id": `${SITE_URL}/#organizacao` },
    knowsAbout: [
      "Lançamentos imobiliários",
      "Financiamento imobiliário",
      "Construção de patrimônio",
      "Formação de equipes comerciais",
    ],
  };
}

/** ProfilePage/Article — página institucional narrada em primeira pessoa. */
export function schemaPaginaPerfil({
  titulo,
  descricao,
  path,
}: {
  titulo: string;
  descricao: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url(path)}#pagina`,
    name: titulo,
    description: descricao,
    url: url(path),
    inLanguage: "pt-BR",
    primaryImageOfPage: { "@type": "ImageObject", url: OG_RETRATO, width: 1200, height: 630 },
    mainEntity: { "@id": `${SITE_URL}/#carlos-ferragano` },
    isPartOf: { "@id": `${SITE_URL}/#marca` },
  };
}

/** Converte schemas em entradas de `head().scripts`. */
export function jsonLd(...schemas: object[]) {
  return schemas.map((schema) => ({
    type: "application/ld+json",
    children: JSON.stringify(schema),
  }));
}
