import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  auditoriaConhecimento,
  executiveStory,
  knowledgeDiff,
  planoRecalculo,
  type Auditoria,
  type Contexto,
  type EventoMudanca,
  type ExecucaoContexto,
  type ExecutiveStory,
  type KnowledgeDiff,
  type MudancaValor,
  type PlanoRecalculo,
  type SnapshotItem,
} from "@/lib/platform/orchestrator";

/**
 * SPRINT 27 — porta de leitura do Knowledge Orchestrator.
 *
 * Não recalcula nada: lê eventos e execuções já registrados (domain_events,
 * platform_job_runs, market_indicator_series, recommendation_history) e monta
 * plano, diff, auditoria e narrativa na camada pura, auditável em teste.
 */

type Linha = Record<string, unknown>;
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => (v == null ? null : Number(v));

/** Mapeia agregados de domínio e jobs de plataforma para bounded contexts. */
const CONTEXTO_POR_JOB: Record<string, Contexto> = {
  "market.collector": "market",
  "advisor.watchdog": "advisor",
  "outbox.worker": "dominio",
  "automation.rollup": "recommendation",
  "readmodels.refresh": "knowledge",
};

const contextoDoAgregado = (agregado: string | null): Contexto => {
  switch (agregado) {
    case "market":
    case "market_region":
      return "market";
    case "person":
    case "people":
      return "behavior";
    case "recommendation":
      return "recommendation";
    case "advisor":
      return "advisor";
    default:
      return "dominio";
  }
};

export type OrquestracaoResposta = {
  plano: PlanoRecalculo;
  auditoria: Auditoria;
  diff: KnowledgeDiff;
  historia: ExecutiveStory;
  eventos: EventoMudanca[];
  execucoes: ExecucaoContexto[];
  /** Variações observadas — o cliente recompõe a narrativa somando frescor/confiança. */
  mudancas: MudancaValor[];
  periodoSemanas: number;
  fontesIndisponiveis: string[];
};

export const getOrquestracao = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "orchestrator.estado")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaHoras: z.number().int().min(1).max(24 * 90).default(24 * 28),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<OrquestracaoResposta> => {
    const supabase = context.supabase;
    const desde = new Date(Date.now() - data.janelaHoras * 36e5).toISOString();

    const [eventosRes, jobsRes, seriesRes, recsRes] = await Promise.all([
      supabase
        .from("domain_events")
        .select("event_type, aggregate, occurred_at")
        .eq("workspace_id", data.workspaceId)
        .gte("occurred_at", desde)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("platform_job_runs")
        .select("job, ok, started_at, finished_at, duracao_ms")
        .gte("started_at", desde)
        .order("started_at", { ascending: false })
        .limit(200),
      supabase
        .from("market_indicator_series")
        .select("codigo, nome, updated_at")
        .eq("ativo", true)
        .limit(50),
      supabase
        .from("recommendation_history")
        .select(
          "id, chave, recommendation_type, score, score_na_implementacao, score_na_avaliacao, implementada_em, avaliada_em, updated_at",
        )
        .eq("workspace_id", data.workspaceId)
        .gte("updated_at", desde)
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

    const indisponiveis: string[] = [];
    const linhas = (res: { data: unknown; error: { message: string } | null }, nome: string) => {
      if (res.error) {
        console.warn(`[getOrquestracao] ${nome}`, res.error.message);
        indisponiveis.push(nome);
        return [] as Linha[];
      }
      return (res.data ?? []) as unknown as Linha[];
    };

    /* Eventos: domínio + coleta de indicadores externos. */
    const eventos: EventoMudanca[] = [
      ...linhas(eventosRes, "domain_events").map((r) => ({
        evento: txt(r["event_type"]) ?? "evento",
        contexto: contextoDoAgregado(txt(r["aggregate"])),
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

    /* Execuções: um registro por contexto, o mais recente. */
    const execucoes: ExecucaoContexto[] = [];
    const vistos = new Set<Contexto>();
    for (const r of linhas(jobsRes, "platform_job_runs")) {
      const ctx = CONTEXTO_POR_JOB[txt(r["job"]) ?? ""];
      if (!ctx || vistos.has(ctx)) continue;
      vistos.add(ctx);
      execucoes.push({
        contexto: ctx,
        em: txt(r["finished_at"]) ?? txt(r["started_at"]),
        ok: r["ok"] === true,
        duracaoMs: num(r["duracao_ms"]),
        detalhe: txt(r["job"]),
      });
    }

    const plano = planoRecalculo(eventos);
    const auditoria = auditoriaConhecimento(plano, execucoes);

    /* Diff: score na implementação (antes) × score atual (depois). */
    const recs = linhas(recsRes, "recommendation_history");
    const antes: SnapshotItem[] = [];
    const depois: SnapshotItem[] = [];
    const mudancas: MudancaValor[] = [];
    let implementadas = 0;

    for (const r of recs) {
      const alvo = `recomendacao:${String(r["id"])}`;
      const rotulo = txt(r["chave"]) ?? txt(r["recommendation_type"]) ?? "Recomendação";
      const scoreAtual = num(r["score"]);
      const scoreBase = num(r["score_na_implementacao"]) ?? num(r["score_na_avaliacao"]);
      if (txt(r["implementada_em"])) implementadas += 1;
      if (scoreBase !== null) {
        antes.push({ alvo, rotulo, contexto: "recommendation", valor: scoreBase });
      }
      depois.push({
        alvo,
        rotulo,
        contexto: "recommendation",
        valor: scoreAtual,
        algoritmo: "recommendation.ranquear",
        em: txt(r["updated_at"]),
      });
      if (scoreBase !== null && scoreAtual !== null && scoreBase !== scoreAtual) {
        mudancas.push({
          alvo,
          rotulo,
          contexto: "recommendation",
          de: scoreBase,
          para: scoreAtual,
          em: txt(r["updated_at"]) ?? desde,
        });
      }
    }

    const diff = knowledgeDiff(
      { em: desde, itens: antes },
      { em: new Date().toISOString(), itens: depois },
      eventos,
    );

    const periodoSemanas = Math.max(1, Math.round(data.janelaHoras / (24 * 7)));
    const historia = executiveStory({
      periodoSemanas,
      mudancas,
      eventos,
      recomendacoesImplementadas: implementadas,
      // Confiança e frescor vêm do Knowledge Health (Sprint 26.1), calculados no cliente.
      confiancaConhecimento: null,
      frescorConhecimento: null,
    });

    return {
      plano,
      auditoria,
      diff,
      historia,
      eventos,
      execucoes,
      mudancas,
      periodoSemanas,
      fontesIndisponiveis: indisponiveis,
    };
  });
