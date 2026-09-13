import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout do empreendimento — detalhe, landing e unidade são rotas filhas. */
export const Route = createFileRoute("/empreendimentos/cury/$slug")({
  component: () => <Outlet />,
});