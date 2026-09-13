import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout do hub Cury — apenas encadeia as rotas filhas. */
export const Route = createFileRoute("/empreendimentos/cury")({
  component: () => <Outlet />,
});