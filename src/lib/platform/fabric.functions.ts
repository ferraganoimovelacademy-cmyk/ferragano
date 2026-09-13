import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  CONTEXTO_POR_DOMINIO_TELEMETRIA,
  CONTEXTO_POR_JOB_FABRIC,
  contextoDeEventoFabric,
} from "@/lib/platform/fabric-map";
import {
  PIPELINES,
  custoPipelines,
  estatisticaCache,
  grafoRuntime,
  mapaCalor,
  metricasPorContexto,
  otimizarOrdem,
  perfilPipeline,
  saudeFabric,
  versionarPipeline,
  type Amostra,
  type CacheEstatistica,
  type Custos,
  type EstadoVersao,
  type FaixaCalor,
  type GrafoRuntime,
  type MetricaContexto,
  type OtimizacaoOrdem,
  type PerfilPipeline,
  type SaudeFabric,
} from "@/lib/platform/fabric";
import {
  planoRecalculo,
  type Contexto,
  type EventoMudanca,
  type ExecucaoContexto,
  type PlanoRecalculo,
} from "@/lib/platform/orchestrator";

/**
 * SPRINT 27.1 — porta de leitura do Intelligence Fabric.
 *
 * Só lê o que já foi medido (platform_job_runs, platform_telemetry,
 * domain_events, market_indicator_series). Nenhuma duração é estimada: o que
 * não foi medido volta como `null` e vira lacuna declarada na camada pura.
 */

type Linha = Record<string, unknown>;
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export type FabricResposta = {
  metricas: MetricaContexto[];
  otimizacao: OtimizacaoOrdem;
  cache: CacheEstatistica;
  plano: PlanoRecalculo;
  perfis: PerfilPipeline[];
  versoes: EstadoVersao[];
  custos: Custos;
  calor: { faixas: FaixaCalor[]; gargalos: Contexto[]; referenciaMs: number | null };
  runtime: GrafoRuntime;
  saude: SaudeFabric;
  janelaHoras: number;
  amostrasObservadas: number;
  fontesIndisponiveis: string[];
};

export const getFabric = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "fabric.estado")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaHoras: z.number().int().min(1).max(24 * 90).default(24 * 14),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<FabricResposta> => {
    const supabase = context.supabase;
    const desde = new Date(Date.now() - data.janelaHoras * 36e5).toISOString();

    const [jobsRes, telemetriaRes, eventosRes, seriesRes] = await Promise.all([
      supabase
        .from("platform_job_runs")
        .select("job, ok, started_at, finished_at, duracao_ms")
        .gte("started_at", desde)
        .order("started_at", { ascending: false })
        .limit(500),
      supabase
        .from("platform_telemetry")
        .select("domain, action, ok, duracao_ms, created_at")
        .eq("workspace_id", data.workspaceId)
        .gte("created_at", desde)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("domain_events")
        .select("event_type, aggregate, occurred_at")
        .eq("workspace_id", data.workspaceId)
        .gte("occurred_at", desde)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("market_indicator_series")
        .select("codigo, nome, updated_at")
        .eq("ativo", true)
        .limit(50),
    ]);

    const indisponiveis: string[] = [];
    const linhas = (res: { data: unknown; error: { message: string } | null }, nome: string) => {
      if (res.error) {
        console.warn(`[getFabric] ${nome}`, res.error.message);
        indisponiveis.push(nome);
        return [] as Linha[];
      }
      return (res.data ?? []) as unknown as Linha[];
    };

    /* Amostras: jobs de plataforma + telemetria de servidor, ambos já medidos. */
    const amostras: Amostra[] = [
      ...linhas(jobsRes, "platform_job_runs").flatMap((r) => {
        const ctx = CONTEXTO_POR_JOB_FABRIC[txt(r["job"]) ?? ""];
        if (!ctx) return [];
        return [
          {
            contexto: ctx,
            duracaoMs: num(r["duracao_ms"]),
            ok: r["ok"] === true,
            em: txt(r["finished_at"]) ?? txt(r["started_at"]),
          },
        ];
      }),
      ...linhas(telemetriaRes, "platform_telemetry").flatMap((r) => {
        const ctx = CONTEXTO_POR_DOMINIO_TELEMETRIA[txt(r["domain"]) ?? ""];
        if (!ctx) return [];
        return [
          {
            contexto: ctx,
            duracaoMs: num(r["duracao_ms"]),
            ok: r["ok"] === true,
            em: txt(r["created_at"]),
          },
        ];
      }),
    ];

    /* Eventos: mesmo insumo do Orchestrator, para o plano de recálculo vigente. */
    const eventos: EventoMudanca[] = [
      ...linhas(eventosRes, "domain_events").map((r) => ({
        evento: txt(r["event_type"]) ?? "evento",
        contexto: contextoDeEventoFabric(txt(r["aggregate"])),
        em: txt(r["occurred_at"]) ?? desde,
        detalhe: txt(r["aggregate"]),
      })),
      ...linhas(seriesRes, "market_indicator_series")
        .filter((r) => txt(r["updated_at"]))
        .map((r) => ({
          evento: `market.serie_atualizada:${txt(r["codigo"])}`,
          contexto: "market" as Contexto,
          em: txt(r["updated_at"])!,
          detalhe: txt(r["nome"]),
        })),
    ]
      .filter((e) => e.em >= desde)
      .sort((a, b) => (a.em < b.em ? 1 : -1))
      .slice(0, 120);

    /* Execuções mais recentes por contexto — insumo do grafo vivo. */
    const execucoes: ExecucaoContexto[] = [];
    const vistos = new Set<Contexto>();
    for (const a of amostras) {
      if (vistos.has(a.contexto)) continue;
      vistos.add(a.contexto);
      execucoes.push({ contexto: a.contexto, em: a.em, ok: a.ok, duracaoMs: a.duracaoMs, detalhe: null });
    }

    const metricas = metricasPorContexto(amostras);
    const plano = planoRecalculo(eventos);
    const cache = estatisticaCache(plano, metricas);
    const perfis = PIPELINES.map((p) => perfilPipeline(p.id, metricas)).filter(
      (p): p is PerfilPipeline => p != null,
    );
    const versoes = PIPELINES.map((p) => versionarPipeline(p.id)).filter(
      (v): v is EstadoVersao => v != null,
    );
    const runtime = grafoRuntime(plano, execucoes);

    return {
      metricas,
      otimizacao: otimizarOrdem(metricas),
      cache,
      plano,
      perfis,
      versoes,
      custos: custoPipelines(metricas),
      calor: mapaCalor(metricas),
      runtime,
      saude: saudeFabric({ metricas, plano, cache, perfis, versoes, runtime }),
      janelaHoras: data.janelaHoras,
      amostrasObservadas: amostras.length,
      fontesIndisponiveis: indisponiveis,
    };
  });
