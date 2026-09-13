import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/crm")({
  head: () => ({
    meta: [
      { title: "CRM — Ferragano One" },
      { name: "description", content: "Gestão de relacionamento e automação de vendas." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="CRM"
      domain="comercial"
      icon="diversity_3"
      description="Central de relacionamento, réguas de comunicação e funis personalizados."
    />
  ),
});
