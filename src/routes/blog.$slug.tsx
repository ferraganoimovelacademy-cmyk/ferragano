import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { CtaFinal } from "@/components/site/CtaFinal";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { acharPost } from "@/lib/site/blog";

const BASE = "https://ferragano.lovable.app";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = acharPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE}/blog/${params.slug}`;
    const titulo = loaderData?.titulo ?? "Artigo — Blog Ferragano";
    const resumo = loaderData?.resumo ?? "Conteúdo do blog Ferragano.";
    return {
      meta: [
        { title: `${titulo} — Ferragano` },
        { name: "description", content: resumo },
        { property: "og:title", content: titulo },
        { property: "og:description", content: resumo },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: titulo,
            description: resumo,
            url,
            author: { "@type": "Person", name: "Carlos Ferragano" },
            publisher: { "@type": "Organization", name: "Ferragano" },
          }),
        },
      ],
    };
  },
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();
  return (
    <SiteLayout>
      <article className="mx-auto w-full max-w-[760px] px-4 py-16 md:px-8 md:py-24">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Icon name="arrow_back" size={16} />
          Voltar ao blog
        </Link>
        <Badge variant="gold" className="mt-6 w-fit text-[10px]">
          {post.categoria}
        </Badge>
        <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
          {post.titulo}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{post.leitura}</p>
        <p className="mt-6 text-lg text-muted-foreground">{post.resumo}</p>
        <div className="mt-8 space-y-5 text-base leading-relaxed">
          {post.paragrafos.map((p: string) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </article>
      <CtaFinal />
      <WhatsAppFab />
    </SiteLayout>
  );
}
