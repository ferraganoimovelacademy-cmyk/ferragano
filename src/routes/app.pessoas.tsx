import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/pessoas")({
  head: () => ({
    meta: [
      { title: "Pessoas — Ferragano One" },
      { name: "description", content: "Gestão centralizada de contatos, leads e histórico de interações." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Pessoas"
      domain="comercial"
      icon="contacts"
      description="Diretório unificado de contatos, enriquecimento de dados e histórico completo."
    />
  ),
});
