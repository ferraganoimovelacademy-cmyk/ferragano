import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Ferragano One" },
      { name: "description", content: "Análise profunda de dados e Business Intelligence." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Analytics"
      domain="plataforma"
      icon="insights"
      description="BI self-service, dashboards customizados e inteligência de dados."
    />
  ),
});
