import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/ia")({
  head: () => ({
    meta: [
      { title: "IA — Ferragano One" },
      { name: "description", content: "Agentes de inteligência artificial e automação cognitiva." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="IA"
      domain="ia"
      icon="smart_toy"
      description="Orquestração de agentes, treinamento de modelos e automação inteligente."
    />
  ),
});
