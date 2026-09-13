import { createFileRoute } from "@tanstack/react-router";
import { RotaIntl, carregarIntl, headIntl, type DadosIntl } from "@/components/site/intl/RotaIntl";

/** Todas as rotas públicas em espanhol, com slug traduzido (`/es/metodo`, …). */
export const Route = createFileRoute("/es/$")({
  loader: ({ params }): Promise<DadosIntl> => carregarIntl("es", params._splat),
  head: ({ loaderData }) => headIntl("es", loaderData),
  component: () => <RotaIntl idioma="es" dados={Route.useLoaderData()} />,
});