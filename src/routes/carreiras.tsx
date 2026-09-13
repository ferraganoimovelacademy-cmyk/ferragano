import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/platform/PublicPage";
import { canonical, linksI18n } from "@/lib/site/seo";
import { PathIntl } from "@/lib/site/i18n";

export const Route = createFileRoute("/carreiras")({
  head: () => ({
    meta: [
      { title: "Trabalhe Conosco — Ferragano" },
      { name: "description", content: "Vagas e processo seletivo para corretores da Ferragano." },
      { property: "og:title", content: "Trabalhe Conosco — Ferragano" },
      { property: "og:description", content: "Vagas e processo seletivo da Ferragano." },
    ],
  }),
  component: () => (
    <PublicPage
      eyebrow="Carreiras"
      title="Trabalhe Conosco"
      lead="Faça parte de um time de corretores de alto padrão: envie sua candidatura e conheça como é trabalhar na Ferragano, com formação continuada e carteira qualificada."
    />
  ),
});
