import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/platform/ModulePlaceholder";

export const Route = createFileRoute("/app/portal-cliente")({
  head: () => ({
    meta: [
      { title: "Portal do Cliente — Ferragano One" },
      { name: "description", content: "Área exclusiva para clientes acompanharem sua jornada." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Portal do Cliente"
      domain="financeiro"
      icon="door_front"
      description="Espaço do comprador: acompanhamento de obras, extratos e documentos."
    />
  ),
});
