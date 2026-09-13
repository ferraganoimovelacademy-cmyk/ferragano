import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/conteudos")({
  head: () => ({
    meta: [
      { title: "Conteúdos — Ferragano OS" },
      { name: "description", content: "Produção de conteúdo, blog e materiais de apoio." },
      { property: "og:title", content: "Conteúdos — Ferragano OS" },
      { property: "og:description", content: "Gestão de conteúdo da plataforma Ferragano OS." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Conteúdos"
      domain="marketing"
      icon="article"
      description="Blog, materiais de apoio comercial e SEO — base do domínio Marketing."
    />
  ),
});
