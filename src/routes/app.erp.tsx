import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/erp")({
  head: () => ({
    meta: [
      { title: "ERP — Ferragano One" },
      { name: "description", content: "Gestão de processos internos, backoffice e operações." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="ERP"
      domain="plataforma"
      icon="settings_applications"
      description="Integração de processos, backoffice imobiliário e gestão operacional."
    />
  ),
});
