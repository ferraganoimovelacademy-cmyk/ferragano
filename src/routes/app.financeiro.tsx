import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Ferragano One" },
      { name: "description", content: "Gestão financeira, comissões e fluxo de caixa imobiliário." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Financeiro"
      domain="financeiro"
      icon="payments"
      description="Controle de comissões, recebíveis e fluxo de caixa integrado ao CRM."
    />
  ),
});
