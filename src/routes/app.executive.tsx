import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import {
  AVISO_SEM_JULGAMENTO,
  AVISO_SIMULACAO,
  areaLabels,
  tendenciaLabels,
  variavelLabels,
  type Medida,
  type Tendencia,
  type VariavelSimulavel,
} from "@/lib/platform/executive-twin";
import {
  compararMomentos,
  getExecutiveTwin,
  simularCenario,
} from "@/lib/platform/executive-twin.functions";

export const Route = createFileRoute("/app/executive")({
  head: () => ({
    meta: [
      { title: "Executive OS — gêmeo digital da organização" },
      {
        name: "description",
        content:
          "Estado atual da empresa, pulso da operação, comparação entre períodos, equilíbrio entre áreas, desvio do próprio histórico, simulações declaradas e narrativa executiva baseada em fatos medidos.",
      },
      { property: "og:title", content: "Executive OS — gêmeo digital da organização" },
      {
        property: "og:description",
        content:
          "Observação, tendência e simulação separadas com janela declarada e rastreabilidade até as evidências (ADR-033).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExecutivePage,
});

const corTendencia: Record<Tendencia, string> = {
  crescimento: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  desaceleracao: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  estabilidade: "bg-muted text-muted-foreground",
  saturacao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  indisponivel: "bg-muted text-muted-foreground",
};

const moeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const formatarMedida = (m: Medida) => {
  if (m.valor == null) return "—";
  if (m.unidade === "moeda") return moeda(m.valor);
  if (m.unidade === "percentual") return `${m.valor}%`;
  if (m.unidade === "dias") return `${m.valor} dias`;
  return new Intl.NumberFormat("pt-BR").format(m.valor);
};

const mesLabel = (mes: string) => {
  const [ano, m] = mes.split("-");
  return `${m}/${ano}`;
};

const naturezaBadge: Record<string, string> = {
  observacao: "Fato medido",
  tendencia: "Tendência",
  simulacao: "Simulação",
};

function ExecutivePage() {
  useTrackScreen("platform", "executive_twin");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id ?? null;

  const carregar = useServerFn(getExecutiveTwin);
  const comparar = useServerFn(compararMomentos);
  const simular = useServerFn(simularCenario);

  const { data, isLoading } = useQuery({
    queryKey: ["executive-twin", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const meses = data?.meses ?? [];
  const [mesA, setMesA] = useState<string | null>(null);
  const [mesB, setMesB] = useState<string | null>(null);
  const de = mesA ?? meses[0] ?? null;
  const para = mesB ?? meses[meses.length - 1] ?? null;

  const comparacao = useQuery({
    queryKey: ["executive-twin-comparacao", workspaceId, de, para],
    queryFn: () => comparar({ data: { workspaceId: workspaceId!, mesA: de!, mesB: para! } }),
    enabled: Boolean(workspaceId && de && para),
  });

  const [variavel, setVariavel] = useState<VariavelSimulavel>("visitas");
  const [delta, setDelta] = useState(-20);
  const [simulado, setSimulado] = useState(false);

  const simulacao = useQuery({
    queryKey: ["executive-twin-simulacao", workspaceId, variavel, delta],
    queryFn: () =>
      simular({ data: { workspaceId: workspaceId!, variavel, deltaPercentual: delta } }),
    enabled: Boolean(workspaceId) && simulado,
  });

  const destaques = useMemo(
    () =>
      (data?.snapshot.medidas ?? []).filter((m) =>
        ["oportunidades_abertas", "pipeline_total", "conversao", "ciclo"].includes(m.chave),
      ),
    [data],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Sprint 30 · Executive Digital Twin
        </p>
        <h1 className="font-display text-2xl font-semibold">Executive OS</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Representação digital do estado da organização: pipeline, pessoas, execução, conhecimento,
          memória, automação e mercado. Observação, tendência e simulação aparecem sempre separadas,
          com janela declarada e amostra. Nada aqui substitui decisão humana (ADR-033).
        </p>
      </header>

      {!workspaceId ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione um workspace para abrir o Executive OS.
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((m) => (
              <Card key={m.chave}>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  <p className="font-display text-2xl font-semibold">{formatarMedida(m)}</p>
                  <p className="text-xs text-muted-foreground">
                    {naturezaBadge[m.natureza]} · {m.janela}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          {data.snapshot.fontesIndisponiveis.length > 0 && (
            <Card className="border-amber-500/40">
              <CardContent className="flex gap-2 p-4 text-sm text-muted-foreground">
                <Icon name="warning" className="mt-0.5 text-amber-500" />
                <span>
                  Fontes indisponíveis nesta leitura: {data.snapshot.fontesIndisponiveis.join(", ")}
                  . Os indicadores correspondentes ficam sem valor em vez de estimados.
                </span>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="snapshot">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="snapshot">Estado atual</TabsTrigger>
              <TabsTrigger value="pulso">Pulso</TabsTrigger>
              <TabsTrigger value="cenarios">Comparar períodos</TabsTrigger>
              <TabsTrigger value="balanco">Equilíbrio</TabsTrigger>
              <TabsTrigger value="desvio">Desvio</TabsTrigger>
              <TabsTrigger value="simulacao">Simulação</TabsTrigger>
              <TabsTrigger value="narrativa">Narrativa</TabsTrigger>
            </TabsList>

            {/* GATE 01 */}
            <TabsContent value="snapshot" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Como está a empresa neste momento</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.snapshot.medidas.map((m) => (
                    <div key={m.chave} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-medium">{formatarMedida(m)}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.nota ?? naturezaBadge[m.natureza]}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {data.snapshot.lacunas.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Lacunas de medição</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {data.snapshot.lacunas.map((l) => (
                      <p key={l}>• {l}</p>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* GATE 02 */}
            <TabsContent value="pulso" className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Janela: {data.pulso.janela} · comportamento predominante:{" "}
                <Badge className={corTendencia[data.pulso.resumo]}>
                  {tendenciaLabels[data.pulso.resumo]}
                </Badge>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.pulso.metricas.map((m) => (
                  <Card key={m.chave}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{m.label}</span>
                        <Badge className={corTendencia[m.tendencia]}>
                          {tendenciaLabels[m.tendencia]}
                        </Badge>
                        {m.variacaoPercentual != null && (
                          <Badge variant="outline">{m.variacaoPercentual}%</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.explicacao}</p>
                      <p className="text-xs text-muted-foreground">
                        Amostra: {m.amostra} meses · R²: {m.r2 ?? "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {data.pulso.limitacoes.map((l) => (
                <p key={l} className="text-xs text-muted-foreground">
                  • {l}
                </p>
              ))}
            </TabsContent>

            {/* GATE 03 */}
            <TabsContent value="cenarios" className="space-y-3 pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">De</p>
                  <Select value={de ?? undefined} onValueChange={setMesA}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m} value={m}>
                          {mesLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Para</p>
                  <Select value={para ?? undefined} onValueChange={setMesB}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m} value={m}>
                          {mesLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {comparacao.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : comparacao.data ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b text-left text-muted-foreground">
                          <tr>
                            <th className="p-3">Indicador</th>
                            <th className="p-3">{mesLabel(comparacao.data.mesA)}</th>
                            <th className="p-3">{mesLabel(comparacao.data.mesB)}</th>
                            <th className="p-3">Variação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparacao.data.linhas.map((l) => (
                            <tr key={l.chave} className="border-b last:border-0">
                              <td className="p-3">{l.label}</td>
                              <td className="p-3">{l.de ?? "—"}</td>
                              <td className="p-3">{l.para ?? "—"}</td>
                              <td className="p-3">
                                {l.variacaoPercentual == null ? "—" : `${l.variacaoPercentual}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione dois meses para comparar.</p>
              )}
              {(comparacao.data?.limitacoes ?? []).map((l) => (
                <p key={l} className="text-xs text-muted-foreground">
                  • {l}
                </p>
              ))}
            </TabsContent>

            {/* GATE 04 */}
            <TabsContent value="balanco" className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Janela: {data.balanco.janela} · {data.balanco.totalEventos} evento(s) medido(s).
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.balanco.areas.map((a) => (
                  <Card key={a.area}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{areaLabels[a.area]}</span>
                        <Badge variant="outline">
                          {a.participacaoPercentual == null
                            ? "sem medição"
                            : `${a.participacaoPercentual}%`}
                        </Badge>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${a.participacaoPercentual ?? 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.eventos ?? "—"} evento(s) · {a.fonte}
                      </p>
                      <Badge variant="secondary">{a.situacao.replace("_", " ")}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{data.balanco.nota}</p>
            </TabsContent>

            {/* GATE 05 */}
            <TabsContent value="desvio" className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Mês avaliado: {data.desvio.mesAvaliado ? mesLabel(data.desvio.mesAvaliado) : "—"} ·
                janela {data.desvio.janela} · {data.desvio.desviosRelevantes} desvio(s) acima de 1,5
                desvio-padrão.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.desvio.metricas.map((m) => (
                  <Card key={m.chave}>
                    <CardContent className="space-y-1 p-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{m.label}</span>
                        <Badge variant="outline">{m.classificacao.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Último: {m.ultimoValor ?? "—"} · média histórica: {m.mediaHistorica ?? "—"}{" "}
                        · desvio-padrão: {m.desvioPadrao ?? "—"} · z: {m.zScore ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Amostra: {m.amostra} meses</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{AVISO_SEM_JULGAMENTO}</p>
            </TabsContent>

            {/* GATE 06 */}
            <TabsContent value="simulacao" className="space-y-3 pt-4">
              <Card className="border-amber-500/40">
                <CardContent className="flex gap-2 p-4 text-sm text-muted-foreground">
                  <Icon name="science" className="mt-0.5 text-amber-500" />
                  <span>{AVISO_SIMULACAO}</span>
                </CardContent>
              </Card>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Variável</p>
                  <Select
                    value={variavel}
                    onValueChange={(v) => setVariavel(v as VariavelSimulavel)}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(variavelLabels) as VariavelSimulavel[]).map((v) => (
                        <SelectItem key={v} value={v}>
                          {variavelLabels[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Variação</p>
                  <Select value={String(delta)} onValueChange={(v) => setDelta(Number(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[-40, -20, -10, 10, 20, 40].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d > 0 ? `+${d}%` : `${d}%`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setSimulado(true)}>Simular cenário</Button>
              </div>

              {!simulado ? (
                <p className="text-sm text-muted-foreground">
                  Escolha uma variável e uma variação para ver quais indicadores historicamente
                  variaram junto.
                </p>
              ) : simulacao.isLoading || !simulacao.data ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Janela: {simulacao.data.janela} · amostra {simulacao.data.amostra} meses
                    {simulacao.data.disponivel ? "" : " · cenário indisponível"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {simulacao.data.efeitos.map((e) => (
                      <Card key={e.chave}>
                        <CardContent className="space-y-1 p-4 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{e.label}</span>
                            <Badge variant={e.confiavel ? "secondary" : "outline"}>
                              {e.confiavel ? "cenário calculado" : "sem cenário"}
                            </Badge>
                          </div>
                          {e.confiavel && (
                            <p>
                              Média histórica {e.valorAtual} → cenário {e.valorHipotetico} (
                              {e.variacaoPercentual}%)
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{e.motivo}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Hipóteses e limitações declaradas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {simulacao.data.hipoteses.map((h) => (
                        <p key={h}>• {h}</p>
                      ))}
                      {simulacao.data.limitacoes.map((l) => (
                        <p key={l}>• {l}</p>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* GATE 07 */}
            <TabsContent value="narrativa" className="space-y-3 pt-4">
              {data.narrativa.paragrafos.map((p) => (
                <Card key={p.titulo}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {p.titulo}
                      <Badge variant="outline">{naturezaBadge[p.natureza]}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>{p.texto}</p>
                    <p className="text-xs text-muted-foreground">Fontes: {p.fontes.join(", ")}</p>
                  </CardContent>
                </Card>
              ))}
              {data.narrativa.pendencias.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Pendências desta leitura</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {data.narrativa.pendencias.map((p) => (
                      <p key={p}>• {p}</p>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
