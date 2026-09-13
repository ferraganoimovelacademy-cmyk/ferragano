import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Ferragano One" },
      { name: "description", content: "Gestão de campanhas, canais e ativos de marketing." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Marketing"
      domain="marketing"
      icon="campaign"
      description="Gestão multicanal, automação de marketing e análise de performance."
    />
  ),
});
