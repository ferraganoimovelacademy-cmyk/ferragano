import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { moeda, numero, percentual } from "@/lib/platform/insights";
import {
  faixaLabels,
  montarRadar,
  nivelLabels,
  type Faixa,
  type Previsao,
  type Risco,
} from "@/lib/platform/predictive";
import { getPredictiveContext } from "@/lib/platform/predictive.functions";

export const Route = createFileRoute("/app/radar")({
  head: () => ({
    meta: [
      { title: "Executive Radar — inteligência preditiva" },
      {
        name: "description",
        content:
          "Radar preditivo do Ferragano One: score das oportunidades, riscos justificados, próxima melhor ação e previsão do mês com intervalo de confiança.",
      },
      { property: "og:title", content: "Executive Radar — inteligência preditiva" },
      {
        property: "og:description",
        content:
          "Oportunidades críticas, empreendimentos em aceleração, riscos emergentes e forecast do mês — toda previsão explicada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RadarPage,
});

const faixaCores: Record<Faixa, string> = {
  alta: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  media: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  baixa: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const severidadeCor = (s: Risco["severidade"]) =>
  s === "critico"
    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
    : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

const dataHora = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** ADR-021: nenhuma previsão aparece sem fatores, confiança, base e horário. */
function Explicacao({ previsao }: { previsao: Previsao<unknown> }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <p>
        Confiança <span className="font-medium text-foreground">{previsao.confianca}%</span> (
        {nivelLabels[previsao.nivel]})
      </p>
      <ul className="space-y-1">
        {previsao.fatores.map((f) => (
          <li key={f.nome} className="flex gap-2">
            <Icon
              name={
                f.direcao === "positivo"
                  ? "trending_up"
                  : f.direcao === "negativo"
                    ? "trending_down"
                    : "remove"
              }
              className="mt-0.5 text-sm"
            />
            <span>
              <span className="font-medium text-foreground">{f.nome}:</span> {f.detalhe}
            </span>
          </li>
        ))}
      </ul>
      <p>
        Base: {previsao.base} · calculado em {dataHora(previsao.calculadoEm)}
      </p>
    </div>
  );
}

function PrevisaoCard({
  titulo,
  valor,
  previsao,
}: {
  titulo: string;
  valor: string;
  previsao: Previsao<unknown>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-semibold tracking-tight">{valor}</p>
        {previsao.valor == null && previsao.motivoAusencia ? (
          <p className="text-xs text-muted-foreground">{previsao.motivoAusencia}</p>
        ) : null}
        <Explicacao previsao={previsao} />
      </CardContent>
    </Card>
  );
}

function RadarPage() {
  useTrackScreen("observability", "executive_radar");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const carregar = useServerFn(getPredictiveContext);

  const contexto = useQuery({
    queryKey: ["predictive-context", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
  });

  const radar = useMemo(
    () =>
      contexto.data
        ? montarRadar({
            sinais: contexto.data.sinais,
            empreendimentos: contexto.data.empreendimentos,
            vendedores: contexto.data.vendedores,
            forecastBase: contexto.data.forecastBase,
          })
        : null,
    [contexto.data],
  );

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Executive Radar</h1>
        <p className="text-sm text-muted-foreground">
          Camada preditiva do Ferragano One. Toda previsão mostra os fatores que a produziram, a
          confiança da evidência e quando foi calculada — nunca um número solto.
        </p>
      </header>

      {contexto.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : null}

      {contexto.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Não foi possível ler os sinais das oportunidades deste workspace.
          </CardContent>
        </Card>
      ) : null}

      {radar ? (
        <>
          {contexto.data?.visaoReduzida ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Você está vendo apenas as suas oportunidades. Forecast e ranking de equipe são
              restritos à gestão comercial.
            </p>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PrevisaoCard
              titulo="Vendas previstas no mês"
              valor={
                radar.forecast.vendasMes.valor
                  ? `${numero(radar.forecast.vendasMes.valor.min)} – ${numero(radar.forecast.vendasMes.valor.max)}`
                  : "—"
              }
              previsao={radar.forecast.vendasMes}
            />
            <PrevisaoCard
              titulo="Receita prevista no mês"
              valor={
                radar.forecast.receitaMes.valor
                  ? `${moeda(radar.forecast.receitaMes.valor.min)} – ${moeda(radar.forecast.receitaMes.valor.max)}`
                  : "—"
              }
              previsao={radar.forecast.receitaMes}
            />
            <PrevisaoCard
              titulo="Conversão provável"
              valor={
                radar.forecast.conversao.valor
                  ? `${percentual(radar.forecast.conversao.valor.min)} – ${percentual(radar.forecast.conversao.valor.max)}`
                  : "—"
              }
              previsao={radar.forecast.conversao}
            />
            <PrevisaoCard
              titulo="Gargalo previsto"
              valor={radar.forecast.gargalo.valor ?? "—"}
              previsao={radar.forecast.gargalo}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oportunidades críticas</CardTitle>
              </CardHeader>
              <CardContent>
                {radar.criticas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma oportunidade aberta com score abaixo de 45.
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {radar.criticas.map((o) => (
                      <AccordionItem key={o.opportunityId} value={o.opportunityId}>
                        <AccordionTrigger className="text-left">
                          <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                            <span className="font-medium">{o.titulo}</span>
                            <Badge className={faixaCores[o.faixa]} variant="secondary">
                              Score {o.score} · {faixaLabels[o.faixa]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {o.responsavelNome} · {moeda(o.valor)}
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Explicacao previsao={o.previsao} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próxima melhor ação</CardTitle>
              </CardHeader>
              <CardContent>
                {radar.acoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem oportunidade aberta para recomendar ação.
                  </p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {radar.acoes.map((a) => (
                      <AccordionItem key={a.opportunityId} value={a.opportunityId}>
                        <AccordionTrigger className="text-left">
                          <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                            <span className="font-medium">{a.cliente}</span>
                            <span className="text-sm">{a.acao}</span>
                            <Badge variant="secondary">Confiança {a.previsao.confianca}%</Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Explicacao previsao={a.previsao} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Riscos emergentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {radar.riscos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum risco detectado.</p>
                ) : (
                  radar.riscos.map((r, i) => (
                    <div key={`${r.codigo}-${r.alvo}-${i}`} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={severidadeCor(r.severidade)} variant="secondary">
                          {r.severidade === "critico" ? "Crítico" : "Atenção"}
                        </Badge>
                        <span className="text-sm font-medium">{r.titulo}</span>
                        <span className="text-xs text-muted-foreground">{r.alvo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.motivo} <span className="opacity-70">Base: {r.base}.</span>
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Empreendimentos em aceleração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {radar.aceleracao.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum empreendimento com venda nos últimos 30 dias.
                  </p>
                ) : (
                  radar.aceleracao.map((e) => (
                    <div key={e.nome}>
                      <p className="text-sm font-medium">{e.nome}</p>
                      <p className="text-xs text-muted-foreground">{e.evidencia}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Corretores em destaque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {radar.destaques.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma venda registrada nos últimos 30 dias.
                  </p>
                ) : (
                  radar.destaques.map((v) => (
                    <div key={v.nome}>
                      <p className="text-sm font-medium">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.evidencia}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendências da semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {radar.tendencias.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Radar gerado em {dataHora(radar.geradoEm)}.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
