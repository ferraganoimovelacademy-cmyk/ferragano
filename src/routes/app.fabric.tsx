import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
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
import { LACUNA_RECURSOS, estadoLabels, simularFalha, type Simulacao } from "@/lib/platform/fabric";
import { getFabric } from "@/lib/platform/fabric.functions";
import { CONTEXTOS, contextoLabels, type Contexto } from "@/lib/platform/orchestrator";

export const Route = createFileRoute("/app/fabric")({
  head: () => ({
    meta: [
      { title: "Intelligence Fabric — custo e saúde dos pipelines" },
      {
        name: "description",
        content:
          "Custo computacional, gargalos, versões de pipeline, simulação de falha e grafo vivo dos motores de inteligência do Ferragano One.",
      },
      { property: "og:title", content: "Intelligence Fabric — custo e saúde dos pipelines" },
      {
        property: "og:description",
        content:
          "Quanto custa gerar cada entregável, onde está o gargalo e o que para de funcionar se um motor falhar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FabricPage,
});

const JANELAS = [
  { valor: 24 * 7, rotulo: "7 dias" },
  { valor: 24 * 14, rotulo: "14 dias" },
  { valor: 24 * 30, rotulo: "30 dias" },
];

const ms = (v: number | null) =>
  v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`;
const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

const severidadeBadge: Record<Simulacao["severidade"], "destructive" | "outline" | "secondary"> = {
  critico: "destructive",
  alto: "destructive",
  moderado: "outline",
  baixo: "secondary",
};

function FabricPage() {
  useTrackScreen("observability", "intelligence_fabric");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id ?? null;
  const carregar = useServerFn(getFabric);

  const [janela, setJanela] = useState(24 * 14);
  const [alvoSimulacao, setAlvoSimulacao] = useState<Contexto>("market");

  const consulta = useQuery({
    queryKey: ["fabric", workspaceId, janela],
    queryFn: () => carregar({ data: { workspaceId: workspaceId!, janelaHoras: janela } }),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });

  const simulacao = useMemo(() => simularFalha(alvoSimulacao), [alvoSimulacao]);
  const dados = consulta.data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Intelligence Fabric</h1>
          <p className="text-muted-foreground text-sm">
            Camada acima do Orchestrator: mede custo, versiona pipelines, encontra gargalos e simula
            falhas. Não calcula inteligência e não decide nada de negócio.
          </p>
        </div>
        <div className="w-40">
          <Select value={String(janela)} onValueChange={(v) => setJanela(Number(v))}>
            <SelectTrigger aria-label="Janela de medição">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JANELAS.map((j) => (
                <SelectItem key={j.valor} value={String(j.valor)}>
                  {j.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {!workspaceId ? (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Selecione um workspace para ver o Fabric.
          </CardContent>
        </Card>
      ) : consulta.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : consulta.isError ? (
        <Card>
          <CardContent className="text-destructive p-6 text-sm">
            Não foi possível ler as medições do Fabric. Tente novamente.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="fabric">
          <TabsList className="flex-wrap">
            <TabsTrigger value="fabric">Painel</TabsTrigger>
            <TabsTrigger value="otimizador">Otimizador</TabsTrigger>
            <TabsTrigger value="profiler">Profiler</TabsTrigger>
            <TabsTrigger value="custo">Custo</TabsTrigger>
            <TabsTrigger value="calor">Mapa de calor</TabsTrigger>
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
            <TabsTrigger value="runtime">Grafo vivo</TabsTrigger>
            <TabsTrigger value="versoes">Versões</TabsTrigger>
          </TabsList>

          {/* GATE 08 — Executive Fabric Dashboard */}
          <TabsContent value="fabric" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Saúde do motor</CardTitle>
                <Badge variant="secondary">
                  {dados?.saude.score == null ? "sem dados" : `${dados.saude.score}/100`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metrica
                    rotulo="Eficiência de execução"
                    valor={pct(dados?.saude.eficiencia ?? null)}
                  />
                  <Metrica
                    rotulo="Reutilização de cache"
                    valor={pct(dados?.saude.taxaHit ?? null)}
                  />
                  <Metrica
                    rotulo="Recálculos evitados"
                    valor={String(dados?.saude.recalculosEvitados ?? 0)}
                  />
                  <Metrica
                    rotulo="Tempo economizado"
                    valor={ms(dados?.saude.tempoEconomizadoMs ?? null)}
                  />
                  <Metrica
                    rotulo="Tempo médio por pipeline"
                    valor={ms(dados?.saude.tempoMedioPipelineMs ?? null)}
                  />
                  <Metrica
                    rotulo="Pipelines saudáveis"
                    valor={`${dados?.saude.pipelinesSaudaveis ?? 0}/${dados?.saude.pipelinesTotal ?? 0}`}
                  />
                  <Metrica
                    rotulo="Versões ativas"
                    valor={String(dados?.saude.versoesAtivas ?? 0)}
                    alerta={(dados?.saude.versoesDivergentes.length ?? 0) > 0}
                  />
                  <Metrica
                    rotulo="Gargalos"
                    valor={String(dados?.saude.gargalos.length ?? 0)}
                    alerta={(dados?.saude.gargalos.length ?? 0) > 0}
                  />
                </div>

                <div className="rounded-md border p-3 text-xs">
                  <p className="font-medium">Estado do grafo vivo</p>
                  <p className="text-muted-foreground">
                    {dados?.runtime.recalculados ?? 0} recalculado(s) ·{" "}
                    {dados?.runtime.reaproveitados ?? 0} reaproveitado(s) ·{" "}
                    {dados?.runtime.aguardando ?? 0} aguardando · {dados?.runtime.falhas ?? 0} com
                    falha
                    {dados?.runtime.vivo ? " · cadeia propagada por completo" : ""}
                  </p>
                </div>

                <Lacunas itens={dados?.saude.lacunas ?? []} />
                <p className="text-muted-foreground text-xs">
                  {dados?.amostrasObservadas ?? 0} execuções observadas na janela.
                  {dados?.fontesIndisponiveis.length
                    ? ` Fontes indisponíveis: ${dados.fontesIndisponiveis.join(", ")}.`
                    : ""}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 01 — Dependency Optimizer */}
          <TabsContent value="otimizador" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ordem de execução e ganho possível</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metrica
                    rotulo="Execução em série"
                    valor={ms(dados?.otimizacao.duracaoSerialMs ?? null)}
                  />
                  <Metrica
                    rotulo="Caminho crítico"
                    valor={ms(dados?.otimizacao.duracaoCriticaMs ?? null)}
                  />
                  <Metrica
                    rotulo="Ganho possível"
                    valor={ms(dados?.otimizacao.ganhoEstimadoMs ?? null)}
                  />
                </div>
                <ul className="space-y-2">
                  {(dados?.otimizacao.niveis ?? []).map((n) => (
                    <li key={n.nivel} className="rounded-md border p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Nível {n.nivel}</span>
                        <span className="text-muted-foreground">{ms(n.duracaoMs)}</span>
                      </div>
                      <p className="text-muted-foreground">
                        {n.contextos.map((c) => contextoLabels[c]).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
                <Lacunas itens={dados?.otimizacao.observacoes ?? []} titulo="Observações" />
                <table className="w-full text-xs">
                  <caption className="sr-only">Medições por bounded context</caption>
                  <thead>
                    <tr className="text-muted-foreground text-left">
                      <th scope="col" className="py-1">
                        Contexto
                      </th>
                      <th scope="col" className="py-1">
                        Execuções
                      </th>
                      <th scope="col" className="py-1">
                        Mediana
                      </th>
                      <th scope="col" className="py-1">
                        p95
                      </th>
                      <th scope="col" className="py-1">
                        Falhas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dados?.metricas ?? []).map((m) => (
                      <tr key={m.contexto} className="border-t">
                        <th scope="row" className="py-1 text-left font-normal">
                          {m.rotulo}
                        </th>
                        <td className="py-1">{m.execucoes}</td>
                        <td className="py-1">{ms(m.duracaoMedianaMs)}</td>
                        <td className="py-1">{ms(m.duracaoP95Ms)}</td>
                        <td className="py-1">{m.falhas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 02 — Pipeline Profiler */}
          <TabsContent value="profiler" className="space-y-4">
            {(dados?.perfis ?? []).map((p) => (
              <Card key={p.pipeline.id}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">{p.pipeline.rotulo}</CardTitle>
                  <span className="text-muted-foreground text-xs">
                    {ms(p.totalMs)} · cobertura {p.cobertura}%
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-1">
                    {p.etapas.map((e) => (
                      <li
                        key={e.contexto}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className={e.gargalo ? "font-medium" : ""}>{e.rotulo}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{ms(e.duracaoMs)}</span>
                          <span className="text-muted-foreground w-10 text-right">
                            {pct(e.percentual)}
                          </span>
                          {e.gargalo ? <Badge variant="destructive">gargalo</Badge> : null}
                          {e.semMedicao ? <Badge variant="outline">sem medição</Badge> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Lacunas itens={p.lacunas} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* GATE 04 — Cost Engine */}
          <TabsContent value="custo" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Custo por entregável</CardTitle>
                <span className="text-muted-foreground text-xs">
                  {dados?.custos.chamadasTotais ?? 0} chamadas ·{" "}
                  {ms(dados?.custos.tempoTotalMs ?? null)}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="grid gap-2 md:grid-cols-2">
                  {(dados?.custos.itens ?? []).map((c) => (
                    <li key={c.pipeline} className="rounded-md border p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{c.rotulo}</span>
                        <Badge
                          variant={
                            c.pipeline === dados?.custos.maisCaro ? "destructive" : "secondary"
                          }
                        >
                          {pct(c.participacao)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {c.entregavel} · {ms(c.tempoMs)} · {c.chamadas} chamadas · {c.etapas} etapas
                        {c.falhas ? ` · ${c.falhas} falha(s)` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
                <Lacunas itens={dados?.custos.lacunas ?? []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 05 — Dependency Heat Map */}
          <TabsContent value="calor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapa de calor por dependência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {(dados?.calor.faixas ?? []).map((f) => (
                    <li key={f.contexto} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span>{f.rotulo}</span>
                        <span className="text-muted-foreground">
                          {ms(f.duracaoMs)} · {f.dependentes} dependente(s)
                          {f.gargalo ? " · gargalo" : ""}
                        </span>
                      </div>
                      <p
                        className={
                          f.gargalo
                            ? "text-destructive tracking-widest"
                            : "text-primary tracking-widest"
                        }
                        aria-label={`${f.blocos} de 10 blocos de intensidade`}
                      >
                        {f.barra || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  Referência de 10 blocos: {ms(dados?.calor.referenciaMs ?? null)} (etapa mais lenta
                  medida).
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 06 — Pipeline Simulator */}
          <TabsContent value="simulador" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Se este motor falhar, o que para?</CardTitle>
                <div className="w-56">
                  <Select
                    value={alvoSimulacao}
                    onValueChange={(v) => setAlvoSimulacao(v as Contexto)}
                  >
                    <SelectTrigger aria-label="Motor a desligar">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXTOS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {contextoLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={severidadeBadge[simulacao.severidade]}>
                    {simulacao.severidade}
                  </Badge>
                  <p className="text-xs">{simulacao.resumo}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium">Entregáveis interrompidos</p>
                  {simulacao.pipelinesAfetados.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhum entregável interrompido.</p>
                  ) : (
                    <ul className="space-y-2">
                      {simulacao.pipelinesAfetados.map((p) => (
                        <li key={p.pipeline} className="rounded-md border p-3 text-xs">
                          <p className="font-medium">{p.rotulo}</p>
                          <p className="text-muted-foreground">
                            Para em {contextoLabels[p.etapaFaltante]}.{" "}
                            {p.etapasPreservadas.length
                              ? `Ainda executa: ${p.etapasPreservadas.map((c) => contextoLabels[c]).join(" → ")}.`
                              : "Nenhuma etapa preservada."}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium">Árvore de impacto</p>
                  <ul className="space-y-1 text-xs">
                    {simulacao.indisponiveis.map((i) => (
                      <li key={i.contexto} className="text-muted-foreground">
                        {"—".repeat(i.profundidade)} {i.rotulo}{" "}
                        <span className="opacity-70">
                          ({i.caminho.map((c) => contextoLabels[c]).join(" → ")})
                        </span>
                      </li>
                    ))}
                    {simulacao.indisponiveis.length === 0 ? (
                      <li className="text-muted-foreground">Nenhum contexto dependente.</li>
                    ) : null}
                  </ul>
                </div>

                <p className="text-muted-foreground text-xs">
                  Segue operando:{" "}
                  {simulacao.operacionais.map((c) => contextoLabels[c]).join(", ") || "—"}.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 07 — Runtime Knowledge Graph */}
          <TabsContent value="runtime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grafo vivo dos motores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="grid gap-2 md:grid-cols-2">
                  {(dados?.runtime.nos ?? []).map((n) => (
                    <li key={n.contexto} className="rounded-md border p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{n.rotulo}</span>
                        <Badge
                          variant={
                            n.estado === "falhou"
                              ? "destructive"
                              : n.estado === "aguardando"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {estadoLabels[n.estado]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{n.motivo}</p>
                      <p className="text-muted-foreground">
                        Depende de:{" "}
                        {n.dependeDe.map((c) => contextoLabels[c]).join(", ") || "nenhum"} ·
                        Alimenta:{" "}
                        {n.dependentes.map((c) => contextoLabels[c]).join(", ") || "nenhum"}
                      </p>
                      <p className="text-muted-foreground">
                        Última execução:{" "}
                        {n.em ? new Date(n.em).toLocaleString("pt-BR") : "sem registro"} ·{" "}
                        {ms(n.duracaoMs)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 03 — Pipeline Versioning */}
          <TabsContent value="versoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Versões de pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {(dados?.versoes ?? []).map((v) => (
                    <li key={v.pipeline} className="rounded-md border p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{v.rotulo}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary">{v.versaoAtiva}</Badge>
                          {v.divergente ? (
                            <Badge variant="destructive">precisa {v.proximaVersao}</Badge>
                          ) : null}
                        </span>
                      </div>
                      <p className="text-muted-foreground">Assinatura {v.assinaturaAtual}</p>
                      {v.arestasAdicionadas.length ? (
                        <p className="text-muted-foreground">
                          Adicionadas: {v.arestasAdicionadas.join(", ")}
                        </p>
                      ) : null}
                      {v.arestasRemovidas.length ? (
                        <p className="text-muted-foreground">
                          Removidas: {v.arestasRemovidas.join(", ")}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground">
                        {v.historico[v.historico.length - 1]?.nota ?? "Sem histórico registrado."}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">{LACUNA_RECURSOS}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Metrica({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{rotulo}</p>
      <p className={`text-lg font-semibold ${alerta ? "text-destructive" : ""}`}>{valor}</p>
    </div>
  );
}

function Lacunas({ itens, titulo = "Lacunas declaradas" }: { itens: string[]; titulo?: string }) {
  if (!itens.length) return null;
  return (
    <div className="bg-muted/40 rounded-md p-3">
      <p className="text-xs font-medium">{titulo}</p>
      <ul className="text-muted-foreground list-inside list-disc text-xs">
        {itens.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
