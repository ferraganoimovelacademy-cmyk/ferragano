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
import { verificarIntegridade } from "@/lib/platform/knowledge";
import { knowledgeHealthPlus } from "@/lib/platform/knowledge-quality";
import { getKnowledgeGraph } from "@/lib/platform/knowledge.functions";
import {
  CONTEXTOS,
  analisarImpacto,
  contextoLabels,
  executiveStory,
  explainUpdate,
  grafoDependencias,
  type Contexto,
} from "@/lib/platform/orchestrator";
import { getOrquestracao } from "@/lib/platform/orchestrator.functions";

export const Route = createFileRoute("/app/orquestracao")({
  head: () => ({
    meta: [
      { title: "Knowledge Orchestrator — propagação do conhecimento" },
      {
        name: "description",
        content:
          "Dependências entre motores, análise de impacto, plano de recálculo, diff do conhecimento e história executiva do Ferragano One.",
      },
      { property: "og:title", content: "Knowledge Orchestrator — propagação do conhecimento" },
      {
        property: "og:description",
        content:
          "O que será recalculado se este dado mudar, por que um insight mudou e qual evento disparou a mudança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrquestracaoPage,
});

const JANELAS = [
  { valor: 24 * 7, rotulo: "7 dias" },
  { valor: 24 * 28, rotulo: "28 dias" },
  { valor: 24 * 90, rotulo: "90 dias" },
];

function OrquestracaoPage() {
  useTrackScreen("observability", "knowledge_orchestrator");
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id ?? null;
  const carregar = useServerFn(getOrquestracao);
  const carregarGrafo = useServerFn(getKnowledgeGraph);

  const [janela, setJanela] = useState(24 * 28);
  const [origem, setOrigem] = useState<Contexto>("market");

  const consulta = useQuery({
    queryKey: ["orquestracao", workspaceId, janela],
    queryFn: () => carregar({ data: { workspaceId: workspaceId!, janelaHoras: janela } }),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });

  const grafoConsulta = useQuery({
    queryKey: ["knowledge", "graph", workspaceId, 150],
    queryFn: () => carregarGrafo({ data: { workspaceId: workspaceId!, limite: 150 } }),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });

  const dependencias = useMemo(() => grafoDependencias(), []);
  const impacto = useMemo(() => analisarImpacto(origem), [origem]);

  const saude = useMemo(() => {
    const g = grafoConsulta.data?.grafo;
    if (!g) return null;
    return knowledgeHealthPlus(g, verificarIntegridade(g));
  }, [grafoConsulta.data]);

  const historia = useMemo(() => {
    const dados = consulta.data;
    if (!dados) return null;
    return executiveStory({
      periodoSemanas: dados.periodoSemanas,
      mudancas: dados.mudancas,
      eventos: dados.eventos,
      recomendacoesImplementadas: dados.diff.alterados,
      confiancaConhecimento: saude?.confianca ?? null,
      frescorConhecimento: saude?.frescor ?? null,
    });
  }, [consulta.data, saude]);

  const explicacoes = useMemo(() => {
    const dados = consulta.data;
    if (!dados) return [];
    return dados.mudancas.slice(0, 8).map((m) => explainUpdate(m, dados.eventos));
  }, [consulta.data]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Orchestrator</h1>
          <p className="text-muted-foreground text-sm">
            Coordena os motores já certificados: dependências, impacto, recálculo mínimo e
            explicação de cada mudança. Nenhum cálculo de inteligência acontece aqui.
          </p>
        </div>
        <div className="w-40">
          <Select value={String(janela)} onValueChange={(v) => setJanela(Number(v))}>
            <SelectTrigger aria-label="Janela de análise">
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
            Selecione um workspace para ver a orquestração.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="dependencias">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dependencias">Dependências</TabsTrigger>
            <TabsTrigger value="impacto">Impacto</TabsTrigger>
            <TabsTrigger value="recalculo">Recálculo</TabsTrigger>
            <TabsTrigger value="mudancas">Mudanças</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
            <TabsTrigger value="historia">História</TabsTrigger>
          </TabsList>

          {/* GATE 01 */}
          <TabsContent value="dependencias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fluxo entre bounded contexts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs">
                  Ordem de execução: {dependencias.ordem.map((c) => contextoLabels[c]).join(" → ")}
                </p>
                {dependencias.ciclos.length > 0 ? (
                  <p className="text-destructive text-xs">
                    Ciclo detectado entre{" "}
                    {dependencias.ciclos[0]!.map((c) => contextoLabels[c]).join(", ")}.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">Fluxo acíclico.</p>
                )}
                <ul className="grid gap-2 md:grid-cols-2">
                  {dependencias.dependencias.map((d) => (
                    <li
                      key={`${d.de}-${d.para}-${d.algoritmo}`}
                      className="rounded-md border p-3 text-xs"
                    >
                      <p className="font-medium">
                        {contextoLabels[d.de]} → {contextoLabels[d.para]}
                      </p>
                      <p className="text-muted-foreground">
                        {d.algoritmo} · {d.adr}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 02 */}
          <TabsContent value="impacto" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  Se este dado mudar, o que é recalculado?
                </CardTitle>
                <div className="w-56">
                  <Select value={origem} onValueChange={(v) => setOrigem(v as Contexto)}>
                    <SelectTrigger aria-label="Contexto de origem">
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
              <CardContent className="space-y-3">
                {impacto.afetados.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhum contexto depende de {contextoLabels[origem]}.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {impacto.afetados.map((a) => (
                      <li key={a.contexto} className="rounded-md border p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{contextoLabels[a.contexto]}</span>
                          <Badge variant="secondary">{a.profundidade} salto(s)</Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {a.caminho.map((c) => contextoLabels[c]).join(" → ")}
                        </p>
                        <p className="text-muted-foreground">{a.algoritmos.join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-muted-foreground text-xs">
                  Reaproveitáveis:{" "}
                  {impacto.intactos.map((c) => contextoLabels[c]).join(", ") || "—"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GATE 03 / 04 */}
          <TabsContent value="recalculo" className="space-y-4">
            {consulta.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !consulta.data ? (
              <Indisponivel />
            ) : (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Plano de recálculo</CardTitle>
                  <Badge variant="secondary">{consulta.data.plano.economia}% reaproveitado</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-xs">
                    {consulta.data.eventos.length} evento(s) registrados na janela. O cache é
                    invalidado por evento — nunca por tempo.
                  </p>
                  {consulta.data.plano.tarefas.length === 0 ? (
                    <p className="text-sm">Nenhum recálculo necessário no período.</p>
                  ) : (
                    <ol className="space-y-2">
                      {consulta.data.plano.tarefas.map((t) => (
                        <li key={t.contexto} className="rounded-md border p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {t.ordem}. {contextoLabels[t.contexto]}
                            </span>
                            <Badge variant={t.acao === "recalcular" ? "default" : "outline"}>
                              {t.acao === "recalcular" ? "recalcular" : "reaproveitar"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{t.motivo}</p>
                          {t.eventos.length > 0 ? (
                            <p className="text-muted-foreground">
                              Eventos: {t.eventos.slice(0, 4).join(", ")}
                              {t.eventos.length > 4 ? ` +${t.eventos.length - 4}` : ""}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* GATE 05 / 06 */}
          <TabsContent value="mudancas" className="space-y-4">
            {consulta.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !consulta.data ? (
              <Indisponivel />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Knowledge Diff</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <Metrica rotulo="Alterados" valor={String(consulta.data.diff.alterados)} />
                    <Metrica rotulo="Adicionados" valor={String(consulta.data.diff.adicionados)} />
                    <Metrica rotulo="Removidos" valor={String(consulta.data.diff.removidos)} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Por que este insight mudou</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {explicacoes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nenhuma variação de score registrada na janela.
                      </p>
                    ) : (
                      explicacoes.map((e) => (
                        <div key={e.mudanca.alvo} className="rounded-md border p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{e.mudanca.rotulo}</span>
                            <Badge variant={e.direcao === "caiu" ? "destructive" : "secondary"}>
                              {e.mudanca.de} → {e.mudanca.para}
                            </Badge>
                          </div>
                          {e.narrativa.map((linha) => (
                            <p key={linha} className="text-muted-foreground">
                              {linha}
                            </p>
                          ))}
                          {e.lacunas.map((l) => (
                            <p key={l} className="text-amber-600 dark:text-amber-500">
                              {l}
                            </p>
                          ))}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* GATE 07 */}
          <TabsContent value="auditoria" className="space-y-4">
            {consulta.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !consulta.data ? (
              <Indisponivel />
            ) : (
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Auditoria da propagação</CardTitle>
                  <Badge
                    variant={consulta.data.auditoria.cadeiaCompleta ? "secondary" : "destructive"}
                  >
                    {consulta.data.auditoria.cadeiaCompleta
                      ? "cadeia completa"
                      : "cadeia incompleta"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {consulta.data.auditoria.linhas.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nada a auditar no período.</p>
                  ) : (
                    consulta.data.auditoria.linhas.map((l) => (
                      <div
                        key={l.contexto}
                        className="flex items-center justify-between gap-2 rounded-md border p-3 text-xs"
                      >
                        <span>
                          {l.ordem}. {l.rotulo}
                        </span>
                        <span className="flex items-center gap-2">
                          {l.duracaoMs !== null ? (
                            <span className="text-muted-foreground">{l.duracaoMs} ms</span>
                          ) : null}
                          <Badge
                            variant={
                              l.situacao === "falhou"
                                ? "destructive"
                                : l.situacao === "pendente"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {l.situacao}
                          </Badge>
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* GATE 08 */}
          <TabsContent value="historia" className="space-y-4">
            {consulta.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !historia ? (
              <Indisponivel />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    História executiva — últimas {historia.periodoSemanas} semanas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {historia.paragrafos.map((p) => (
                    <p key={p} className="text-sm leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {historia.lacunas.length > 0 ? (
                    <div className="rounded-md border p-3 text-xs">
                      <p className="font-medium">Lacunas declaradas</p>
                      <ul className="text-muted-foreground list-inside list-disc">
                        {historia.lacunas.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-muted-foreground text-xs">{historia.aviso}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Indisponivel() {
  return (
    <Card>
      <CardContent className="text-muted-foreground p-6 text-sm">
        Não foi possível ler o estado da orquestração.
      </CardContent>
    </Card>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{rotulo}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  );
}
