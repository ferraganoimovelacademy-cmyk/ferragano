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
import { KnowledgeHealthPanel } from "@/components/knowledge/KnowledgeHealthPanel";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { APP_VERSION } from "@/lib/platform/navigation";
import {
  formatDuracao,
  jobLabels,
  severidadeCores,
  severidadeDaFila,
  severidadeDoJob,
  severidadeLabels,
} from "@/lib/platform/health";
import { getPlatformHealth } from "@/lib/platform/health.functions";
import { getAdvisorAceite } from "@/lib/platform/advisor.functions";
import {
  acaoLabels,
  canalLabels,
  efetividadeCores,
  efetividadeLabels,
  resumoEfetividade,
  statusDaRegra,
  taxaEntrega,
} from "@/lib/platform/automation";
import { getAutomationEffectiveness } from "@/lib/platform/automation.functions";
import {
  conversionLift,
  recomendacoesAutomacao,
  resumoInteligencia,
  ruleHealthCores,
  ruleHealthLabels,
  saudeDaRegra,
} from "@/lib/platform/automation-intelligence";
import { getAutomationIntelligence } from "@/lib/platform/automation-intelligence.functions";
import {
  automationConfidence,
  grafoDeRegras,
  priorizarRecomendacoes,
  recomendacaoTipoLabels,
  resumoDecisionIntelligence,
  simulacaoVereditoCores,
  simulacaoVereditoLabels,
  simularDesligarRegra,
} from "@/lib/platform/decision-intelligence";
import {
  precisaoRecomendacoes,
  paraMemoria,
  proximosStatus,
  quadranteCores,
  quadranteLabels,
  rankearRecomendacoes,
  recommendationResultCores,
  recommendationResultLabels,
  recommendationStatusLabels,
  taxaAceitacao,
  taxaImplementacao,
  tiposIgnorados,
  type RecommendationSyncItem,
  type RecommendationStatus,
  type RecommendationRow,
} from "@/lib/platform/recommendation";
import {
  advanceRecommendation,
  evaluateRecommendation,
  getRecommendationQuality,
  listRecommendations,
  syncRecommendations,
} from "@/lib/platform/recommendation.functions";
import {
  PERFORMANCE_BUDGETS,
  bloqueiaRelease,
  budgetStatusCores,
  budgetStatusLabels,
  calcularHealthScore,
  classificarBudget,
  formatBudgetValor,
  formatBytes,
  healthDimensionLabels,
  healthTierCores,
  healthTierLabels,
  medicoesPorChave,
  notaDeOperacao,
  notaDePerformance,
  taxaDeConversao,
  type HealthDimension,
} from "@/lib/platform/metrics";
import { getPlatformMetrics } from "@/lib/platform/metrics.functions";
import {
  alertSeveridadeCores,
  actionLabel,
  alertSeveridadeLabels,
  alertStatusLabels,
  coberturaDoCatalogo,
  featureSaudavel,
  notaDeAlertas,
  precisaoDaRecomendacao,
  separarPorCategoria,
  taxaDeAbandono,
  taxaDeAdesao,
  telemetryDomainLabels,
  type FeatureUsage,
  type TelemetryDomain,
} from "@/lib/platform/telemetry";
import {
  ackPlatformAlert,
  getDecisionAccuracy,
  getFeatureAdoption,
  listPlatformAlerts,
} from "@/lib/platform/telemetry.functions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/app/platform")({
  head: () => ({
    meta: [
      { title: "Control Center — Ferragano One" },
      {
        name: "description",
        content:
          "Operação técnica do Ferragano One em uma tela: orçamento de performance, métricas de plataforma, filas, jobs, cron e Health Score.",
      },
      { property: "og:title", content: "Control Center — Ferragano One" },
      {
        property: "og:description",
        content: "Performance, produto, comercial e sistema com Ferragano Health Score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ControlCenterPage,
});

const numero = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const dataHora = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function Metrica({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <div className="border-border rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-display text-xl font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="text-muted-foreground text-xs">{detalhe}</p>}
    </div>
  );
}

/** Linha de adoção: uso, usuários, abandono e latência média da ação. */
function FeatureLinha({ feature }: { feature: FeatureUsage }) {
  const abandono = taxaDeAbandono(feature);
  return (
    <li className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
      <span>
        {telemetryDomainLabels[feature.domain as TelemetryDomain] ?? feature.domain} ·{" "}
        {actionLabel(feature.domain, feature.action)}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {numero(feature.usos)} usos · {numero(feature.usuarios)} usuários ·{" "}
        {numero(feature.sessoes)} sessões
        {feature.duracaoMediaMs != null && ` · média ${Math.round(feature.duracaoMediaMs)} ms`}
        {abandono > 0 && ` · abandono ${abandono}%`}
      </span>
      {!featureSaudavel(feature) && (
        <Badge className={alertSeveridadeCores.atencao}>
          {feature.taxaErro?.toFixed(1)}% de erro
        </Badge>
      )}
    </li>
  );
}

/**
 * SPRINT 11 — Ferragano Control Center.
 * Toda a operação técnica em um lugar. Lê apenas a Query Layer
 * (`platform_metrics_summary` / `platform_health`), nunca tabelas cruas.
 */
function ControlCenterPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const [janelaHoras, setJanelaHoras] = useState(24);

  const metricsFn = useServerFn(getPlatformMetrics);
  const healthFn = useServerFn(getPlatformHealth);
  const adoptionFn = useServerFn(getFeatureAdoption);
  const accuracyFn = useServerFn(getDecisionAccuracy);
  const alertsFn = useServerFn(listPlatformAlerts);
  const ackFn = useServerFn(ackPlatformAlert);
  const advisorFn = useServerFn(getAdvisorAceite);
  const efetividadeFn = useServerFn(getAutomationEffectiveness);
  const inteligenciaFn = useServerFn(getAutomationIntelligence);
  const queryClient = useQueryClient();

  const metrics = useQuery({
    queryKey: ["platform-metrics", workspaceId, janelaHoras],
    queryFn: () => metricsFn({ data: { workspaceId: workspaceId!, janelaHoras } }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 60_000,
  });

  const health = useQuery({
    queryKey: ["platform-health", workspaceId],
    queryFn: () => healthFn({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 60_000,
  });

  // SPRINT 12 — GATE 02/03/04/06: jornada, adoção, precisão e alertas.
  const adoption = useQuery({
    queryKey: ["feature-adoption", workspaceId, janelaHoras],
    queryFn: () => adoptionFn({ data: { workspaceId: workspaceId!, janelaHoras } }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 60_000,
  });

  const accuracy = useQuery({
    queryKey: ["decision-accuracy", workspaceId, janelaHoras],
    queryFn: () =>
      accuracyFn({ data: { workspaceId: workspaceId!, janelaHoras: Math.max(janelaHoras, 168) } }),
    enabled: Boolean(workspaceId) && admin,
  });

  const alerts = useQuery({
    queryKey: ["platform-alerts", workspaceId],
    queryFn: () => alertsFn({ data: { workspaceId: workspaceId!, incluirResolvidos: false } }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 60_000,
  });

  // SPRINT 15: aceite do conselho do Advisor.
  const advisor = useQuery({
    queryKey: ["advisor-aceite", workspaceId],
    queryFn: () => advisorFn({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId) && admin,
  });

  // SPRINT 18: efetividade das regras de automação (janela em dias).
  const efetividade = useQuery({
    queryKey: ["automation-effectiveness", workspaceId, janelaHoras],
    queryFn: () =>
      efetividadeFn({
        data: { workspaceId: workspaceId!, dias: Math.max(1, Math.round(janelaHoras / 24)) },
      }),
    enabled: Boolean(workspaceId) && admin,
    refetchInterval: 60_000,
  });

  const ack = useMutation({
    mutationFn: (v: { id: string; resolver: boolean }) => ackFn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-alerts", workspaceId] });
      toast.success("Alerta atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // SPRINT 21: Recommendation Engine — fila ordenada, memória e precisão.
  const listRecsFn = useServerFn(listRecommendations);
  const syncRecsFn = useServerFn(syncRecommendations);
  const advanceRecFn = useServerFn(advanceRecommendation);
  const evaluateRecFn = useServerFn(evaluateRecommendation);
  const qualityFn = useServerFn(getRecommendationQuality);

  const memoria = useQuery({
    queryKey: ["recommendation-memory", workspaceId],
    queryFn: () => listRecsFn({ data: { workspaceId: workspaceId!, limite: 100 } }),
    enabled: Boolean(workspaceId) && admin,
  });

  const qualidade = useQuery({
    queryKey: ["recommendation-quality", workspaceId],
    queryFn: () => qualityFn({ data: { workspaceId: workspaceId!, dias: 90 } }),
    enabled: Boolean(workspaceId) && admin,
  });

  const invalidarRecs = () => {
    void queryClient.invalidateQueries({ queryKey: ["recommendation-memory", workspaceId] });
    void queryClient.invalidateQueries({ queryKey: ["recommendation-quality", workspaceId] });
  };

  const sincronizar = useMutation({
    mutationFn: (itens: RecommendationSyncItem[]) =>
      syncRecsFn({ data: { workspaceId: workspaceId!, itens } }),
    onSuccess: (r) => {
      invalidarRecs();
      toast.success(`${r.registradas} recomendação(ões) registrada(s) na memória.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avancar = useMutation({
    mutationFn: (v: { id: string; status: RecommendationStatus }) =>
      advanceRecFn({
        data: { workspaceId: workspaceId!, id: v.id, status: v.status as "aceita" },
      }),
    onSuccess: () => {
      invalidarRecs();
      toast.success("Recomendação atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avaliar = useMutation({
    mutationFn: (v: { id: string; scoreAtual: number }) =>
      evaluateRecFn({ data: { workspaceId: workspaceId!, ...v } }),
    onSuccess: (r) => {
      invalidarRecs();
      toast.success(
        r.resultado === "melhorou"
          ? "Resultado medido: melhorou."
          : r.resultado === "piorou"
            ? "Resultado medido: piorou."
            : "Resultado medido: sem mudança relevante.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const medicoes = useMemo(
    () => medicoesPorChave(metrics.data?.metricas ?? []),
    [metrics.data?.metricas],
  );

  const budgetGate = useMemo(() => bloqueiaRelease(medicoes), [medicoes]);

  const notaAlertas = useMemo(() => notaDeAlertas(alerts.data ?? []), [alerts.data]);

  const resumoAutomacao = useMemo(
    () => resumoEfetividade(efetividade.data ?? []),
    [efetividade.data],
  );

  // SPRINT 19: impacto das automações (histórico materializado, 90 dias).
  const inteligencia = useQuery({
    queryKey: ["automation-intelligence", workspaceId],
    queryFn: () => inteligenciaFn({ data: { workspaceId: workspaceId!, dias: 90 } }),
    enabled: Boolean(workspaceId) && admin,
  });

  const roi = useMemo(
    () => (inteligencia.data ? resumoInteligencia(inteligencia.data) : null),
    [inteligencia.data],
  );

  const recomendacoes = useMemo(
    () => (inteligencia.data ? recomendacoesAutomacao(inteligencia.data) : []),
    [inteligencia.data],
  );

  // SPRINT 20: Decision Intelligence — confiança, prioridade, previsão e simulação.
  const [regraSimulada, setRegraSimulada] = useState<string>("");

  const decisao = useMemo(
    () => (inteligencia.data ? resumoDecisionIntelligence(inteligencia.data) : null),
    [inteligencia.data],
  );

  const prioridades = useMemo(
    () => (inteligencia.data ? priorizarRecomendacoes(inteligencia.data) : []),
    [inteligencia.data],
  );

  // SPRINT 21 — GATE 01: a mesma fila, agora ordenada por prioridade esperada.
  const fila = useMemo(() => rankearRecomendacoes(prioridades), [prioridades]);

  const grafo = useMemo(
    () => (inteligencia.data ? grafoDeRegras(inteligencia.data) : null),
    [inteligencia.data],
  );

  const simulacao = useMemo(
    () =>
      inteligencia.data && regraSimulada
        ? simularDesligarRegra(inteligencia.data, regraSimulada)
        : null,
    [inteligencia.data, regraSimulada],
  );

  const nomePorRegra = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of inteligencia.data?.regras ?? []) mapa.set(r.ruleId, r.nome);
    return mapa;
  }, [inteligencia.data]);

  const memoriaPorChave = useMemo(() => {
    const mapa = new Map<string, RecommendationRow>();
    for (const r of memoria.data ?? []) if (!r.fechadaEm) mapa.set(r.chave, r);
    return mapa;
  }, [memoria.data]);

  const score = useMemo(() => {
    const sistema = metrics.data?.sistema;
    const performance = notaDePerformance(medicoes);
    const operacao = sistema
      ? notaDeOperacao({
          outboxFalhou: sistema.outboxFalhou,
          outboxPendente: sistema.outboxPendente,
          cronFalhas: sistema.cronFalhas,
          cronExecucoes: sistema.cronExecucoes,
        })
      : 0;

    // Arquitetura, segurança, UX e qualidade vêm da certificação da sprint
    // (gates auditados em docs/blueprint/20-alpha-certification.md).
    const notas: Record<HealthDimension, number> = {
      arquitetura: 100,
      performance: performance ?? 0,
      seguranca: 100,
      ux: 95,
      qualidade: 90,
      // Alertas abertos derrubam a nota de operação: evidência acima de presunção.
      operacao: Math.min(operacao, notaAlertas),
    };

    return { ...calcularHealthScore(notas), performanceMedida: performance !== null };
  }, [medicoes, metrics.data?.sistema, notaAlertas]);

  if (!admin) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          O Control Center é restrito a proprietário e administrador do workspace.
        </CardContent>
      </Card>
    );
  }

  const sistema = metrics.data?.sistema;
  const produto = metrics.data?.produto;
  const comercial = metrics.data?.comercial;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Control Center</h1>
          <p className="text-muted-foreground text-sm">
            Operação técnica da plataforma: orçamento de performance, métricas, filas, jobs e cron.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Ambiente: {import.meta.env.DEV ? "Preview" : "Produção"}</Badge>
          <Badge variant="outline">Versão {APP_VERSION}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Ferragano Health Score</CardTitle>
          <Badge className={healthTierCores[score.tier]}>
            {score.score} • {healthTierLabels[score.tier]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {score.contribuicoes.map((c) => (
              <li key={c.dimensao} className="border-border rounded-md border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {healthDimensionLabels[c.dimensao]} · peso {c.peso}%
                  </span>
                  <span className="tabular-nums">{c.nota}</span>
                </div>
                <div
                  className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"
                  role="img"
                  aria-label={`${healthDimensionLabels[c.dimensao]}: nota ${c.nota} de 100`}
                >
                  <div className="bg-primary h-full" style={{ width: `${c.nota}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {!score.performanceMedida && (
            <p className="text-muted-foreground text-xs">
              Performance ainda sem medição registrada na janela — a dimensão entra com 0 até a
              primeira coleta (nenhuma nota é presumida).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Janela:</span>
        {[
          { h: 24, label: "24 h" },
          { h: 168, label: "7 dias" },
          { h: 720, label: "30 dias" },
        ].map((o) => (
          <button
            key={o.h}
            type="button"
            onClick={() => setJanelaHoras(o.h)}
            aria-pressed={janelaHoras === o.h}
            className={`min-h-9 rounded-md border px-3 text-xs ${
              janelaHoras === o.h
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="produto">Produto</TabsTrigger>
          <TabsTrigger value="jornada">Jornada</TabsTrigger>
          <TabsTrigger value="decisao">Decisão</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="automacao">Automação</TabsTrigger>
          <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas
            {(alerts.data?.length ?? 0) > 0 && (
              <span className="bg-destructive text-destructive-foreground ml-1.5 rounded-full px-1.5 text-[10px] tabular-nums">
                {alerts.data!.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Performance ---------------- */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Performance Budget (Gate A5)</CardTitle>
              <Badge
                className={
                  budgetGate.bloqueado ? budgetStatusCores.estourado : budgetStatusCores.dentro
                }
              >
                {budgetGate.bloqueado ? "Release bloqueado" : "Release liberado"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Orçamento de performance e medição mais recente por métrica
                    </caption>
                    <thead className="text-muted-foreground text-xs">
                      <tr className="border-border border-b">
                        <th className="py-2 text-left font-medium">Métrica</th>
                        <th className="py-2 text-left font-medium">Escopo</th>
                        <th className="py-2 text-right font-medium">Meta</th>
                        <th className="py-2 text-right font-medium">p95 medido</th>
                        <th className="py-2 text-left font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERFORMANCE_BUDGETS.map((b) => {
                        const valor = medicoes[b.key] ?? null;
                        const status = classificarBudget(b, valor);
                        return (
                          <tr key={b.key} className="border-border/60 border-b last:border-0">
                            <td className="py-2">
                              {b.label}
                              {b.blocking && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  · bloqueante
                                </span>
                              )}
                            </td>
                            <td className="text-muted-foreground py-2 capitalize">{b.scope}</td>
                            <td className="py-2 text-right tabular-nums">
                              {b.higherIsBetter ? "≥ " : "< "}
                              {formatBudgetValor(b.unit, b.budget)}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {formatBudgetValor(b.unit, valor)}
                            </td>
                            <td className="py-2">
                              <Badge className={budgetStatusCores[status]}>
                                {budgetStatusLabels[status]}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {budgetGate.bloqueado && (
                <p className="text-destructive text-xs" role="alert">
                  Orçamento estourado em: {budgetGate.violacoes.join(", ")}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jobs e refresh dos Read Models</CardTitle>
            </CardHeader>
            <CardContent>
              {health.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (health.data?.jobs.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma execução nas últimas 24 h.</p>
              ) : (
                <ul className="space-y-2">
                  {health.data!.jobs.map((j) => {
                    const sev = severidadeDoJob(j);
                    return (
                      <li
                        key={j.job}
                        className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <span>{jobLabels[j.job] ?? j.job}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {j.execucoes} execuções · média {formatDuracao(j.duracao_media_ms)} · máx{" "}
                          {formatDuracao(j.duracao_max_ms)} · último {dataHora(j.ultimo_em)}
                        </span>
                        <Badge className={severidadeCores[sev]}>{severidadeLabels[sev]}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aceite do Ferragano Advisor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {advisor.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (advisor.data?.aceite.total ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma recomendação do Advisor registrada ainda. As taxas aparecem quando a
                  gestão começar a aceitar ou descartar o conselho semanal.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metrica
                    label="Taxa de aceite"
                    valor={
                      advisor.data!.aceite.taxaAceite === null
                        ? "sem decisão"
                        : `${advisor.data!.aceite.taxaAceite.toFixed(0)}%`
                    }
                    detalhe={`${numero(advisor.data!.aceite.aceitas + advisor.data!.aceite.concluidas)} aceitas · ${numero(advisor.data!.aceite.descartadas)} descartadas`}
                  />
                  <Metrica
                    label="Execução"
                    valor={
                      advisor.data!.aceite.taxaExecucao === null
                        ? "sem aceite"
                        : `${advisor.data!.aceite.taxaExecucao.toFixed(0)}%`
                    }
                    detalhe={`${numero(advisor.data!.aceite.concluidas)} concluídas`}
                  />
                  <Metrica
                    label="Pendentes"
                    valor={numero(advisor.data!.aceite.pendentes)}
                    detalhe={`${numero(advisor.data!.altaPendentes)} de prioridade alta`}
                  />
                  <Metrica label="Briefings gerados" valor={numero(advisor.data!.briefingsTotal)} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Produto ---------------- */}
        <TabsContent value="produto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adoção</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.isLoading || !produto ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metrica label="Ativos em 24 h" valor={numero(produto.usuariosAtivos24h)} />
                  <Metrica label="Ativos em 7 dias" valor={numero(produto.usuariosAtivos7d)} />
                  <Metrica label="Membros ativos" valor={numero(produto.membrosAtivos)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funções mais utilizadas</CardTitle>
            </CardHeader>
            <CardContent>
              {adoption.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (adoption.data?.features.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma telemetria registrada na janela — as funções passam a aparecer aqui
                  conforme forem usadas.
                </p>
              ) : (
                <div className="space-y-4">
                  {(["negocio", "operacional"] as const).map((cat) => {
                    const lista = separarPorCategoria(adoption.data!.features)[cat];
                    if (lista.length === 0) return null;
                    return (
                      <section key={cat} className="space-y-2">
                        <h3 className="text-muted-foreground text-xs font-medium uppercase">
                          {cat === "negocio" ? "Métricas de negócio" : "Métricas operacionais"}
                        </h3>
                        <ul className="space-y-2">
                          {lista.slice(0, 12).map((f) => (
                            <FeatureLinha key={`${f.domain}.${f.action}`} feature={f} />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Cobertura da instrumentação (Everything Important Must Be Measured)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {adoption.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                (() => {
                  const cob = coberturaDoCatalogo(adoption.data?.features ?? []);
                  return (
                    <>
                      <p className="text-sm">
                        <span className="font-display text-xl font-semibold tabular-nums">
                          {cob.percentual}%
                        </span>{" "}
                        <span className="text-muted-foreground text-xs">
                          {cob.instrumentadas} de {cob.total} ações do catálogo com evidência de uso
                          na janela
                        </span>
                      </p>
                      <div
                        className="bg-muted h-1.5 overflow-hidden rounded-full"
                        role="img"
                        aria-label={`Cobertura de telemetria: ${cob.percentual} por cento`}
                      >
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${cob.percentual}%` }}
                        />
                      </div>
                      {cob.semDados.length > 0 && (
                        <p className="text-muted-foreground text-xs">
                          Sem coleta ainda: {cob.semDados.slice(0, 8).join(", ")}
                          {cob.semDados.length > 8 ? ` e mais ${cob.semDados.length - 8}` : ""}.
                        </p>
                      )}
                    </>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Jornada (GATE 02) ---------------- */}
        <TabsContent value="jornada" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso por domínio</CardTitle>
            </CardHeader>
            <CardContent>
              {adoption.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : Object.keys(adoption.data?.dominios ?? {}).length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem eventos na janela.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(adoption.data!.dominios).map(([dom, qtd]) => (
                    <Metrica
                      key={dom}
                      label={telemetryDomainLabels[dom as TelemetryDomain] ?? dom}
                      valor={numero(qtd)}
                      detalhe="eventos"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sessões recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {adoption.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (adoption.data?.jornadas.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma sessão de navegação registrada ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  {adoption.data!.jornadas.map((j, i) => (
                    <li
                      key={j.sessionId ?? `s-${i}`}
                      className="border-border space-y-2 rounded-md border p-3"
                    >
                      <div className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
                        <span>{j.usuario}</span>
                        <span className="tabular-nums">
                          {j.passos} passos · {dataHora(j.inicio)} → {dataHora(j.fim)}
                        </span>
                      </div>
                      <ol className="flex flex-wrap items-center gap-1 text-xs">
                        {j.caminho.map((passo, idx) => (
                          <li key={`${passo}-${idx}`} className="flex items-center gap-1">
                            <span className="bg-muted rounded px-1.5 py-0.5">{passo}</span>
                            {idx < j.caminho.length - 1 && (
                              <span className="text-muted-foreground" aria-hidden="true">
                                →
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Decisão (GATE 04) ---------------- */}
        <TabsContent value="decisao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Precisão das recomendações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accuracy.isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : (accuracy.data?.total ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma recomendação registrada. A base começa a se formar quando o Decision
                  Center passar a gravar aceite e desfecho — nada é estimado aqui.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metrica
                      label="Adesão do corretor"
                      valor={`${taxaDeAdesao(accuracy.data!)}%`}
                      detalhe={`${numero(accuracy.data!.aceitas)} aceitas · ${numero(accuracy.data!.ignoradas)} ignoradas`}
                    />
                    <Metrica
                      label="Precisão"
                      valor={
                        precisaoDaRecomendacao(accuracy.data!) === null
                          ? "sem desfecho"
                          : `${precisaoDaRecomendacao(accuracy.data!)}%`
                      }
                      detalhe="aceitou e ganhou / ignorou e perdeu"
                    />
                    <Metrica
                      label="Aceitas com venda"
                      valor={numero(accuracy.data!.aceitasComGanho)}
                    />
                    <Metrica
                      label="Ignoradas com venda"
                      valor={numero(accuracy.data!.ignoradasComGanho)}
                      detalhe="recomendação era dispensável"
                    />
                  </div>
                  {accuracy.data!.porTipo.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {accuracy.data!.porTipo.map((t) => (
                        <li key={t.tipo} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t.tipo}</span>
                          <span className="tabular-nums">
                            {numero(t.aceitas)}/{numero(t.total)} aceitas · {numero(t.ganhos)}{" "}
                            vendas
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Comercial ---------------- */}
        <TabsContent value="comercial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operação comercial na janela</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.isLoading || !comercial ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metrica
                    label="Conversão (fechadas)"
                    valor={`${taxaDeConversao(comercial.oportunidadesGanhas, comercial.oportunidadesPerdidas)}%`}
                    detalhe={`${numero(comercial.oportunidadesGanhas)} ganhas · ${numero(comercial.oportunidadesPerdidas)} perdidas`}
                  />
                  <Metrica
                    label="Oportunidades criadas"
                    valor={numero(comercial.oportunidadesCriadas)}
                  />
                  <Metrica
                    label="Tempo médio na etapa"
                    valor={`${comercial.tempoMedioEtapaHoras} h`}
                    detalhe="oportunidades abertas"
                  />
                  <Metrica
                    label="Follow-up atrasado"
                    valor={numero(comercial.tarefasAtrasadas)}
                    detalhe="tarefas vencidas"
                  />
                  <Metrica label="Reservas ativas" valor={numero(comercial.reservasAtivas)} />
                  <Metrica label="Vendas assinadas" valor={numero(comercial.vendasAssinadas)} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Automação (SPRINT 18) ---------------- */}
        <TabsContent value="automacao" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Efetividade das automações</CardTitle>
              <Badge
                className={
                  resumoAutomacao.regrasCriticas > 0
                    ? efetividadeCores.critico
                    : efetividadeCores.ok
                }
              >
                {resumoAutomacao.regrasCriticas > 0
                  ? `${resumoAutomacao.regrasCriticas} regra(s) crítica(s)`
                  : "Sem falhas definitivas"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Metrica
                  label="Regras ativas"
                  valor={`${numero(resumoAutomacao.regrasAtivas)} / ${numero(resumoAutomacao.regras)}`}
                  detalhe={`${numero(resumoAutomacao.regrasSilenciosas)} sem execução na janela`}
                />
                <Metrica
                  label="Efeitos enfileirados"
                  valor={numero(resumoAutomacao.total)}
                  detalhe={`${numero(resumoAutomacao.pendentes)} na fila`}
                />
                <Metrica
                  label="Taxa de entrega"
                  valor={
                    resumoAutomacao.taxaEntrega === null
                      ? "—"
                      : `${(resumoAutomacao.taxaEntrega * 100).toFixed(1)}%`
                  }
                  detalhe={`${numero(resumoAutomacao.entregues)} entregues`}
                />
                <Metrica label="Falhas definitivas" valor={numero(resumoAutomacao.falhou)} />
              </div>

              {efetividade.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (efetividade.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma regra de automação cadastrada neste workspace.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Execuções, entrega e latência por regra de automação na janela selecionada
                    </caption>
                    <thead className="text-muted-foreground text-xs">
                      <tr className="border-border border-b">
                        <th className="py-2 text-left font-medium">Regra</th>
                        <th className="py-2 text-left font-medium">Gatilho</th>
                        <th className="py-2 text-right font-medium">Efeitos</th>
                        <th className="py-2 text-right font-medium">Entrega</th>
                        <th className="py-2 text-right font-medium">Latência média</th>
                        <th className="py-2 text-left font-medium">Última execução</th>
                        <th className="py-2 text-left font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {efetividade.data!.map((linha) => {
                        const status = statusDaRegra(linha);
                        const taxa = taxaEntrega(linha);
                        return (
                          <tr
                            key={linha.ruleId}
                            className="border-border/60 border-b last:border-0"
                          >
                            <td className="py-2">
                              {linha.nome}
                              <span className="text-muted-foreground block text-xs">
                                {acaoLabels[linha.acao] ?? linha.acao} ·{" "}
                                {canalLabels[linha.canal] ?? linha.canal}
                              </span>
                            </td>
                            <td className="text-muted-foreground py-2 text-xs">
                              {linha.eventType}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {numero(linha.total)}
                              {linha.pendentes > 0 && (
                                <span className="text-muted-foreground block text-xs">
                                  {numero(linha.pendentes)} na fila
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {taxa === null ? "—" : `${(taxa * 100).toFixed(0)}%`}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                              {linha.latenciaMediaSegundos > 0
                                ? formatDuracao(linha.latenciaMediaSegundos * 1000)
                                : "—"}
                            </td>
                            <td className="text-muted-foreground py-2 text-xs">
                              {dataHora(linha.ultimaExecucao)}
                            </td>
                            <td className="py-2">
                              <Badge className={efetividadeCores[status]}>
                                {efetividadeLabels[status]}
                              </Badge>
                              {linha.ultimoErro && (
                                <span className="text-destructive block max-w-[22ch] truncate text-xs">
                                  {linha.ultimoErro}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Janela derivada do seletor acima. Uma regra ativa sem execução sinaliza gatilho que
                nunca ocorreu — não um erro.
              </p>
            </CardContent>
          </Card>

          {/* ------------- Impacto (SPRINT 19 — Automation Intelligence) ------------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Impacto das automações
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  últimos 90 dias · histórico materializado
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inteligencia.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : !roi ? (
                <p className="text-muted-foreground text-sm">
                  Histórico ainda não consolidado. A rotina diária materializa as métricas antes de
                  qualquer limpeza da fila.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Metrica
                      label="Horas economizadas"
                      valor={roi.horasEconomizadas.toFixed(1)}
                      detalhe={`${numero(roi.execucoes)} execuções`}
                    />
                    <Metrica
                      label="Conversion lift"
                      valor={
                        roi.lift === null
                          ? "—"
                          : `${roi.lift >= 0 ? "+" : ""}${(roi.lift * 100).toFixed(1)} p.p.`
                      }
                      detalhe={
                        roi.baseline === null
                          ? "sem base de comparação"
                          : `base do workspace ${(roi.baseline * 100).toFixed(1)}%`
                      }
                    />
                    <Metrica
                      label="Oportunidades tocadas"
                      valor={numero(roi.oportunidadesTocadas)}
                      detalhe={`${numero(roi.conversoes)} convertidas`}
                    />
                    <Metrica
                      label="Regras mortas / suspeitas"
                      valor={`${numero(roi.regrasMortas)} / ${numero(roi.regrasSuspeitas)}`}
                      detalhe={`${numero(roi.regrasAtivas)} regras ativas`}
                    />
                  </div>

                  {inteligencia.data!.regras.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <caption className="sr-only">
                          Saúde, tempo economizado e ganho de conversão por regra nos últimos 90
                          dias
                        </caption>
                        <thead className="text-muted-foreground text-xs">
                          <tr className="border-border border-b">
                            <th className="py-2 text-left font-medium">Regra</th>
                            <th className="py-2 text-right font-medium">Execuções</th>
                            <th className="py-2 text-right font-medium">Horas poupadas</th>
                            <th className="py-2 text-right font-medium">Lift</th>
                            <th className="py-2 text-left font-medium">Saúde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inteligencia.data!.regras.map((r) => {
                            const saude = saudeDaRegra(r);
                            const lift = conversionLift(r, inteligencia.data!.baseline);
                            return (
                              <tr
                                key={r.ruleId}
                                className="border-border/60 border-b last:border-0"
                              >
                                <td className="py-2">
                                  {r.nome}
                                  <span className="text-muted-foreground block text-xs">
                                    {r.eventType}
                                    {!r.ativa && " · desligada"}
                                  </span>
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {numero(r.execucoes)}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {(r.tempoEconomizadoSegundos / 3600).toFixed(1)}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {lift === null
                                    ? "—"
                                    : `${lift.lift >= 0 ? "+" : ""}${(lift.lift * 100).toFixed(0)} p.p.`}
                                </td>
                                <td className="py-2">
                                  <Badge className={ruleHealthCores[saude]}>
                                    {ruleHealthLabels[saude]}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Recomendações</h3>
                    {recomendacoes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nenhum ajuste sugerido: nenhuma regra apresentou falha, silêncio ou
                        congestionamento na janela.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {recomendacoes.map((rec, i) => (
                          <li
                            key={`${rec.ruleId}-${i}`}
                            className="border-border flex items-start gap-2 rounded-md border p-2 text-sm"
                          >
                            <Badge
                              className={
                                rec.severidade === "critico"
                                  ? ruleHealthCores.morta
                                  : rec.severidade === "atencao"
                                    ? ruleHealthCores.baixa_atividade
                                    : ruleHealthCores.saudavel
                              }
                            >
                              {rec.severidade === "critico"
                                ? "Crítico"
                                : rec.severidade === "atencao"
                                  ? "Atenção"
                                  : "Oportunidade"}
                            </Badge>
                            <span>{rec.mensagem}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Lift é correlação, não causa: só aparece com pelo menos 10 oportunidades
                    tocadas. Tempo economizado é estimativa declarada por tipo de ação (ADR-017).
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* ------- Decision Intelligence (SPRINT 20 — confiança e previsão) ------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Decision Intelligence
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  confiança estatística, prioridade e simulação
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {inteligencia.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : !decisao || !inteligencia.data ? (
                <p className="text-muted-foreground text-sm">
                  Sem histórico consolidado: a confiança só é calculada sobre execuções já
                  materializadas.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Metrica
                      label="Regras com evidência"
                      valor={`${numero(decisao.regrasSustentadas)} / ${numero(decisao.regrasComConfianca)}`}
                      detalhe="lift sustentado ≥ 90% de confiança"
                    />
                    <Metrica
                      label="Prioridade máxima"
                      valor={
                        decisao.prioridadeMaxima === null ? "—" : String(decisao.prioridadeMaxima)
                      }
                      detalhe={`${numero(decisao.recomendacoes)} recomendações priorizadas`}
                    />
                    <Metrica
                      label="Loops no grafo"
                      valor={numero(decisao.loops)}
                      detalhe={`${numero(decisao.gargalos)} gargalo(s)`}
                    />
                    <Metrica
                      label="Regras órfãs"
                      valor={numero(decisao.orfas)}
                      detalhe="ativas, sem ligação e sem execução"
                    />
                  </div>

                  {/* GATE 01 — Automation Confidence por regra */}
                  {inteligencia.data.regras.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <caption className="sr-only">
                          Lift, amostra e confiança estatística por regra de automação
                        </caption>
                        <thead className="text-muted-foreground text-xs">
                          <tr className="border-border border-b">
                            <th className="py-2 text-left font-medium">Regra</th>
                            <th className="py-2 text-right font-medium">Lift</th>
                            <th className="py-2 text-right font-medium">Amostra</th>
                            <th className="py-2 text-right font-medium">Confiança</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inteligencia.data.regras.map((r) => {
                            const conf = automationConfidence(r, inteligencia.data!.baseline);
                            return (
                              <tr
                                key={`conf-${r.ruleId}`}
                                className="border-border/60 border-b last:border-0"
                              >
                                <td className="py-2">{r.nome}</td>
                                <td className="py-2 text-right tabular-nums">
                                  {conf === null
                                    ? "—"
                                    : `${conf.lift >= 0 ? "+" : ""}${(conf.lift * 100).toFixed(1)} p.p.`}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {numero(r.oportunidadesTocadas)}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  {conf === null ? (
                                    <span className="text-muted-foreground">
                                      amostra insuficiente
                                    </span>
                                  ) : (
                                    <Badge
                                      className={
                                        conf.sustentado
                                          ? ruleHealthCores.saudavel
                                          : ruleHealthCores.baixa_atividade
                                      }
                                    >
                                      {conf.confianca.toFixed(0)}%
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SPRINT 21 — GATE 05: precisão do motor de recomendação */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="border-border rounded-md border p-3">
                      <p className="text-muted-foreground text-xs">
                        Precisão das recomendações (90 dias)
                      </p>
                      <p className="text-xl font-semibold tabular-nums">
                        {precisaoRecomendacoes(qualidade.data ?? null) === null
                          ? "—"
                          : `${(precisaoRecomendacoes(qualidade.data ?? null)! * 100).toFixed(0)}%`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {qualidade.data
                          ? `${qualidade.data.melhoraram} de ${qualidade.data.avaliadas} com desfecho medido`
                          : "sem desfecho medido ainda"}
                      </p>
                    </div>
                    <div className="border-border rounded-md border p-3">
                      <p className="text-muted-foreground text-xs">Aceitação</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {taxaAceitacao(qualidade.data ?? null) === null
                          ? "—"
                          : `${(taxaAceitacao(qualidade.data ?? null)! * 100).toFixed(0)}%`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {qualidade.data
                          ? `${qualidade.data.aceitas} aceitas de ${qualidade.data.total} geradas`
                          : "—"}
                      </p>
                    </div>
                    <div className="border-border rounded-md border p-3">
                      <p className="text-muted-foreground text-xs">Implementação</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {taxaImplementacao(qualidade.data ?? null) === null
                          ? "—"
                          : `${(taxaImplementacao(qualidade.data ?? null)! * 100).toFixed(0)}%`}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {qualidade.data
                          ? `${qualidade.data.implementadas} implementadas das aceitas`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {tiposIgnorados(qualidade.data ?? null).length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Tipos frequentemente ignorados (candidatos a recalibragem de peso):{" "}
                      {tiposIgnorados(qualidade.data ?? null)
                        .map((t) => `${t.tipo} (${t.aceitas}/${t.total})`)
                        .join(", ")}
                      .
                    </p>
                  )}

                  {/* GATES 01 a 04 — fila ordenada, matriz impacto × urgência e ciclo de vida */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">O que fazer primeiro</h3>
                      {fila.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sincronizar.isPending}
                          onClick={() => sincronizar.mutate(paraMemoria(fila))}
                        >
                          {sincronizar.isPending ? "Registrando…" : "Registrar na memória"}
                        </Button>
                      )}
                    </div>
                    {fila.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nenhuma ação priorizada: nenhuma regra apresentou falha, silêncio,
                        duplicidade ou ganho comprovado.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {fila.map((rec) => {
                          const lembrada = memoriaPorChave.get(rec.chave);
                          const passos = lembrada ? proximosStatus(lembrada.status) : [];
                          return (
                            <li
                              key={`prio-${rec.chave}`}
                              className="border-border rounded-md border p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-muted-foreground w-6 shrink-0 font-semibold tabular-nums">
                                  {rec.posicao}º
                                </span>
                                <Badge className={quadranteCores[rec.quadrante]}>
                                  {quadranteLabels[rec.quadrante]}
                                </Badge>
                                <span className="font-medium">
                                  {recomendacaoTipoLabels[rec.tipo]}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  prioridade {rec.prioridade} · impacto {rec.impacto} · urgência{" "}
                                  {rec.urgencia} · confiança {rec.confianca.toFixed(0)}%
                                </span>
                                {lembrada && (
                                  <Badge className={recommendationResultCores[lembrada.resultado]}>
                                    {recommendationStatusLabels[lembrada.status]}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1">{rec.mensagem}</p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                Previsão: {rec.forecast.texto}
                              </p>
                              {lembrada && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {passos.map((status) => (
                                    <Button
                                      key={`${lembrada.id}-${status}`}
                                      size="sm"
                                      variant={status === "descartada" ? "ghost" : "outline"}
                                      disabled={avancar.isPending}
                                      onClick={() => avancar.mutate({ id: lembrada.id, status })}
                                    >
                                      {recommendationStatusLabels[status]}
                                    </Button>
                                  ))}
                                  {lembrada.status === "implementada" && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={avaliar.isPending}
                                      onClick={() =>
                                        avaliar.mutate({
                                          id: lembrada.id,
                                          scoreAtual: rec.prioridade,
                                        })
                                      }
                                    >
                                      Medir resultado
                                    </Button>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>

                  {/* GATE 04 — histórico */}
                  {(memoria.data ?? []).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Memória de recomendações</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-muted-foreground text-xs">
                            <tr className="border-border border-b">
                              <th className="py-2 text-left font-medium">Recomendação</th>
                              <th className="py-2 text-left font-medium">Ciclo</th>
                              <th className="py-2 text-left font-medium">Resultado</th>
                              <th className="py-2 text-right font-medium">Prioridade</th>
                              <th className="py-2 text-right font-medium">Recorrências</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(memoria.data ?? []).map((r) => (
                              <tr
                                key={`mem-${r.id}`}
                                className="border-border/60 border-b last:border-0"
                              >
                                <td className="py-2">
                                  {r.ruleNome ?? r.chave}
                                  <span className="text-muted-foreground block text-xs">
                                    {r.tipo} · gerada em {dataHora(r.geradaEm)}
                                  </span>
                                </td>
                                <td className="py-2">{recommendationStatusLabels[r.status]}</td>
                                <td className="py-2">
                                  <Badge className={recommendationResultCores[r.resultado]}>
                                    {recommendationResultLabels[r.resultado]}
                                  </Badge>
                                </td>
                                <td className="py-2 text-right tabular-nums">{r.score}</td>
                                <td className="py-2 text-right tabular-nums">{r.ocorrencias}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* GATE 04 — dependências */}
                  {grafo && grafo.nos.some((n) => n.dispara.length > 0 || n.emLoop) && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Dependências entre regras</h3>
                      <ul className="space-y-1 text-sm">
                        {grafo.nos
                          .filter((n) => n.dispara.length > 0 || n.emLoop)
                          .map((n) => (
                            <li key={`graf-${n.ruleId}`} className="flex items-start gap-2">
                              <Icon name="ArrowRight" className="mt-0.5 size-4 shrink-0" />
                              <span>
                                {n.nome}
                                {n.dispara.length > 0 && (
                                  <>
                                    {" → "}
                                    {n.dispara.map((id) => nomePorRegra.get(id) ?? id).join(", ")}
                                  </>
                                )}
                                {n.emLoop && (
                                  <Badge className={`${ruleHealthCores.morta} ml-2`}>loop</Badge>
                                )}
                                {n.gargalo && (
                                  <Badge className={`${ruleHealthCores.suspeita} ml-2`}>
                                    gargalo
                                  </Badge>
                                )}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* GATE 05 — simulador */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">E se eu desligar essa regra?</h3>
                    <label htmlFor="simulador-regra" className="text-muted-foreground text-xs">
                      Escolha a regra para simular
                    </label>
                    <select
                      id="simulador-regra"
                      value={regraSimulada}
                      onChange={(e) => setRegraSimulada(e.target.value)}
                      className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none sm:max-w-sm"
                    >
                      <option value="">Selecione…</option>
                      {inteligencia.data.regras.map((r) => (
                        <option key={`sim-${r.ruleId}`} value={r.ruleId}>
                          {r.nome}
                        </option>
                      ))}
                    </select>

                    {simulacao && (
                      <div className="border-border space-y-2 rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={simulacaoVereditoCores[simulacao.veredito]}>
                            {simulacaoVereditoLabels[simulacao.veredito]}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            últimos {simulacao.janelaDias} dias
                          </span>
                        </div>
                        <ul className="text-muted-foreground space-y-1 text-xs">
                          <li>Executou {numero(simulacao.execucoes)} vezes.</li>
                          <li>Impactou {numero(simulacao.oportunidadesTocadas)} oportunidades.</li>
                          <li>Economizou {simulacao.horasEconomizadas.toFixed(1)} horas.</li>
                          <li>
                            Conversão:{" "}
                            {simulacao.lift === null
                              ? "sem amostra suficiente"
                              : `${simulacao.lift >= 0 ? "+" : ""}${(simulacao.lift * 100).toFixed(1)} p.p. (confiança ${simulacao.confianca!.toFixed(0)}%)`}
                          </li>
                          {simulacao.dependentes.length > 0 && (
                            <li>
                              Regras dependentes:{" "}
                              {simulacao.dependentes
                                .map((id) => nomePorRegra.get(id) ?? id)
                                .join(", ")}
                              .
                            </li>
                          )}
                        </ul>
                        <p>{simulacao.motivo}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Confiança vem de teste de duas proporções contra a base do workspace: a mesma
                    diferença vale mais com amostra maior. Previsões são projeções da janela
                    observada, não garantias (ADR-018).
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Sistema ---------------- */}
        <TabsContent value="sistema" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Filas, cron e erros</CardTitle>
              {health.data && (
                <Badge className={severidadeCores[severidadeDaFila(health.data.outbox)]}>
                  Fila: {severidadeLabels[severidadeDaFila(health.data.outbox)]}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {metrics.isLoading || !sistema ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metrica label="Erros registrados" valor={numero(sistema.erros)} />
                  <Metrica
                    label="Execuções de cron"
                    valor={numero(sistema.cronExecucoes)}
                    detalhe={`${numero(sistema.cronFalhas)} falhas`}
                  />
                  <Metrica label="Outbox pendente" valor={numero(sistema.outboxPendente)} />
                  <Metrica label="Outbox falhou" valor={numero(sistema.outboxFalhou)} />
                  <Metrica
                    label="Storage do workspace"
                    valor={formatBytes(sistema.arquivos.bytes)}
                    detalhe={`${numero(sistema.arquivos.total)} arquivos`}
                  />
                  <Metrica
                    label="Latência média da fila"
                    valor={formatDuracao((health.data?.outbox.latenciaMediaSegundos ?? 0) * 1000)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métricas coletadas</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (metrics.data?.metricas.length ?? 0) === 0 ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Icon name="monitoring" className="text-base" aria-hidden />
                  Nenhuma métrica na janela. A coleta começa no primeiro registro enviado pela
                  aplicação.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {metrics.data!.metricas.map((m) => (
                    <li
                      key={`${m.metric_name}-${m.metric_type}`}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>{m.metric_name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {m.amostras} amostras · média {m.media ?? "—"} · p95 {m.p95 ?? "—"} · máx{" "}
                        {m.maximo ?? "—"} · {dataHora(m.ultimo_em)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Alertas (GATE 06) ---------------- */}
        <TabsContent value="alertas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Alertas abertos</CardTitle>
              <Badge variant="outline">Confiabilidade {notaAlertas}/100</Badge>
            </CardHeader>
            <CardContent>
              {alerts.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (alerts.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Icon name="check_circle" className="text-base" aria-hidden />
                  Nenhum alerta aberto. O avaliador roda por cron e compara as métricas coletadas
                  com o orçamento.
                </p>
              ) : (
                <ul className="space-y-2">
                  {alerts.data!.map((a) => (
                    <li
                      key={a.id}
                      className="border-border flex flex-wrap items-start justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">{a.titulo}</p>
                        {a.detalhe && <p className="text-muted-foreground text-xs">{a.detalhe}</p>}
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {a.metrica ?? "—"}
                          {a.valor != null && ` · medido ${a.valor}`}
                          {a.limite != null && ` · limite ${a.limite}`} · {dataHora(a.createdAt)} ·{" "}
                          {alertStatusLabels[a.status]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={alertSeveridadeCores[a.severidade]}>
                          {alertSeveridadeLabels[a.severidade]}
                        </Badge>
                        {a.status === "aberto" && (
                          <button
                            type="button"
                            onClick={() => ack.mutate({ id: a.id, resolver: false })}
                            disabled={ack.isPending}
                            className="border-border text-muted-foreground hover:bg-accent min-h-9 rounded-md border px-3 text-xs"
                          >
                            Reconhecer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => ack.mutate({ id: a.id, resolver: true })}
                          disabled={ack.isPending}
                          className="border-border hover:bg-accent min-h-9 rounded-md border px-3 text-xs"
                        >
                          Resolver
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Conhecimento (Sprint 26, GATE 08) ---------------- */}
        <TabsContent value="conhecimento" className="space-y-4">
          <KnowledgeHealthPanel workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground text-xs">
        Atualizado em {dataHora(metrics.data?.geradoEm)} · janela de{" "}
        {metrics.data?.janelaHoras ?? janelaHoras} h.
      </p>
    </div>
  );
}
