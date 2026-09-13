import { canonical, jsonLd, linksI18n, metaBasica, schemaBreadcrumb } from "@/lib/site/seo";
import { PathIntl } from "@/lib/site/i18n";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Faixa, TituloSecao } from "@/components/site/Bloco";
import { CtaFinal } from "@/components/site/CtaFinal";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { CATEGORIAS, POSTS, type Categoria } from "@/lib/site/blog";

const DESCRICAO =
  "Análises de mercado, financiamento, lançamentos e construção de patrimônio imobiliário, escritas por quem negocia lançamentos todos os dias.";
const URL = "https://ferragano.lovable.app/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: metaBasica({
      titulo: "Blog Ferragano — mercado, lançamentos e patrimônio",
      descricao: DESCRICAO,
      path: "/blog",
      tipo: "website",
    }),
    links: [...canonical("/blog"), ...linksI18n(PathIntl.blog)],
    scripts: jsonLd(
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Blog Ferragano",
        description: DESCRICAO,
        url: URL,
      },
      schemaBreadcrumb([
        { nome: "Início", path: "/" },
        { nome: "Blog", path: "/blog" },
      ]),
    ),
  }),
  component: Blog,
});

const TODAS = "Todas";

function Blog() {
  const [filtro, setFiltro] = useState<Categoria | typeof TODAS>(TODAS);
  const posts = filtro === TODAS ? POSTS : POSTS.filter((p) => p.categoria === filtro);

  return (
    <SiteLayout>
      <Faixa>
        <TituloSecao eyebrow="Conteúdo" titulo="Blog Ferragano" lead={DESCRICAO} />

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {[TODAS, ...CATEGORIAS].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFiltro(c as Categoria | typeof TODAS)}
              aria-pressed={filtro === c}
              className={`min-h-11 rounded-md border px-4 text-sm transition-colors ${
                filtro === c
                  ? "border-primary bg-primary-soft text-primary-soft-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="panel group flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-e3"
            >
              <Badge variant="gold" className="w-fit text-[10px]">
                {p.categoria}
              </Badge>
              <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">{p.titulo}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.resumo}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Ler artigo
                <Icon name="arrow_forward" size={16} />
              </span>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum artigo nesta categoria por enquanto.
          </p>
        )}
      </Faixa>

      <CtaFinal />
      <WhatsAppFab />
    </SiteLayout>
  );
}
