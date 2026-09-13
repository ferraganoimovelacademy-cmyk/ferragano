import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/platform/PublicPage";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Ferragano" },
      { name: "description", content: "Insights, análises de mercado e novidades do setor imobiliário." },
      { property: "og:title", content: "Blog — Ferragano" },
    ],
  }),
  component: () => (
    <PublicPage
      eyebrow="Conteúdo"
      title="Ferragano Blog"
      lead="Análises de mercado, guias de investimento e as últimas tendências do mercado imobiliário de alto padrão."
    />
  ),
});
