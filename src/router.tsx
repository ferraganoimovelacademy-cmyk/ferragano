import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { CarregandoElegante } from "./components/site/CarregandoElegante";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    /* Gate 05 — carregamento elegante: só aparece se a rota demorar. */
    defaultPendingComponent: CarregandoElegante,
    defaultPendingMs: 300,
    defaultPendingMinMs: 400,
  });

  return router;
};
