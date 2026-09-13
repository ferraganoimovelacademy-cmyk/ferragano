import { createFileRoute } from "@tanstack/react-router";
import { RotaIntl, carregarIntl, headIntl, type DadosIntl } from "@/components/site/intl/RotaIntl";

/** Todas as rotas públicas em inglês, com slug traduzido (`/en/method`, …). */
export const Route = createFileRoute("/en/$")({
  loader: ({ params }): Promise<DadosIntl> => carregarIntl("en", params._splat),
  head: ({ loaderData }) => headIntl("en", loaderData),
  component: () => <RotaIntl idioma="en" dados={Route.useLoaderData()} />,
});