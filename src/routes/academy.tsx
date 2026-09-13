import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/platform/PublicPage";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "Academy — Ferragano" },
      { name: "description", content: "Formação de corretores de alto padrão da Ferragano." },
      { property: "og:title", content: "Academy — Ferragano" },
      { property: "og:description", content: "Programa de formação de corretores da Ferragano." },
    ],
  }),
  component: () => (
    <PublicPage
      eyebrow="Formação"
      title="Ferragano Academy"
      lead="Trilhas de formação para corretores de alto padrão: atendimento consultivo, leitura de produto, negociação e rotina comercial orientada por dados."
    />
  ),
});
