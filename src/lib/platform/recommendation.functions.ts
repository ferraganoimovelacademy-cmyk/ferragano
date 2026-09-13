import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  RECOMMENDATION_RESULTS,
  type RecommendationQuality,
  type RecommendationRow,
  type RecommendationStatus,
  type Quadrante,
} from "@/lib/platform/recommendation";

/**
 * SPRINT 21 — Recommendation Engine (única porta de escrita/leitura da
 * memória de recomendações). As funções de banco são `security definer` e
 * exigem papel de administrador; a tabela nunca é lida direto pelo cliente.
 */

type Linha = {
  id: string;
  workspace_id: string;
  chave: string;
  recommendation_type: string;
  rule_id: string | null;
  rule_nome: string | null;
  mensagem: string | null;
  score: number;
  confianca: number | string | null;
  impacto: number;
  urgencia: number;
  quadrante: string | null;
  status: RecommendationStatus;
  resultado: RecommendationRow["resultado"];
  ocorrencias: number;
  gerada_em: string;
  vista_em: string | null;
  aceita_em: string | null;
  implementada_em: string | null;
  avaliada_em: string | null;
  closed_at: string | null;
};

function mapear(row: Linha): RecommendationRow {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    chave: row.chave,
    tipo: row.recommendation_type,
    ruleId: row.rule_id,
    ruleNome: row.rule_nome,
    mensagem: row.mensagem,
    score: Number(row.score ?? 0),
    confianca: row.confianca === null ? null : Number(row.confianca),
    impacto: Number(row.impacto ?? 0),
    urgencia: Number(row.urgencia ?? 0),
    quadrante: (row.quadrante as Quadrante | null) ?? null,
    status: row.status,
    resultado: row.resultado,
    ocorrencias: Number(row.ocorrencias ?? 1),
    geradaEm: row.gerada_em,
    vistaEm: row.vista_em,
    aceitaEm: row.aceita_em,
    implementadaEm: row.implementada_em,
    avaliadaEm: row.avaliada_em,
    fechadaEm: row.closed_at,
  };
}

/** GATE 04 — histórico com ciclo de vida. */
export const listRecommendations = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "recommendation.list")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        incluirArquivadas: z.boolean().optional(),
        limite: z.number().int().min(1).max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<RecommendationRow[]> => {
    const { data: rows, error } = await context.supabase.rpc(
      "list_recommendations" as never,
      {
        _workspace_id: data.workspaceId,
        _incluir_arquivadas: data.incluirArquivadas ?? false,
        _limit: data.limite ?? 100,
      } as never,
    );
    if (error) {
      console.error("[listRecommendations]", error.message);
      throw new Error("Não foi possível carregar o histórico de recomendações.");
    }
    return ((rows ?? []) as unknown as Linha[]).map(mapear);
  });

/**
 * GATE 04 — materializa a fila rankeada na memória. Idempotente por chave:
 * a mesma recomendação recorrente incrementa ocorrências, não duplica.
 */
export const syncRecommendations = createServerFn({ method: "POST" })
  .middleware([instrumented("observability", "recommendation.sync")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        itens: z
          .array(
            z.object({
              chave: z.string().min(1).max(200),
              tipo: z.string().min(1).max(60),
              score: z.number().int().min(0).max(100),
              impacto: z.number().int().min(0).max(100),
              urgencia: z.number().int().min(0).max(100),
              quadrante: z.string().min(1).max(30),
              confianca: z.number().min(0).max(100).nullable().optional(),
              ruleId: z.string().uuid().nullable().optional(),
              ruleNome: z.string().max(160).nullable().optional(),
              mensagem: z.string().max(600).nullable().optional(),
            }),
          )
          .max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ registradas: number }> => {
    let registradas = 0;
    for (const item of data.itens) {
      const { error } = await context.supabase.rpc("upsert_recommendation" as never, {
        _workspace_id: data.workspaceId,
        _chave: item.chave,
        _recommendation_type: item.tipo,
        _score: item.score,
        _impacto: item.impacto,
        _urgencia: item.urgencia,
        _quadrante: item.quadrante,
        _confianca: item.confianca ?? null,
        _rule_id: item.ruleId ?? null,
        _rule_nome: item.ruleNome ?? null,
        _mensagem: item.mensagem ?? null,
      } as never);
      if (error) {
        console.error("[syncRecommendations]", error.message);
        throw new Error("Não foi possível registrar as recomendações.");
      }
      registradas += 1;
    }
    return { registradas };
  });

/** GATE 04 — avança o ciclo de vida (aceitar, implementar, descartar, arquivar). */
export const advanceRecommendation = createServerFn({ method: "POST" })
  .middleware([instrumented("observability", "recommendation.advance")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["vista", "aceita", "implementada", "descartada", "arquivada"]),
        resultado: z.enum(RECOMMENDATION_RESULTS).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: ok, error } = await context.supabase.rpc("advance_recommendation" as never, {
      _id: data.id,
      _status: data.status,
      _resultado: data.resultado ?? null,
    } as never);
    if (error) {
      console.error("[advanceRecommendation]", error.message);
      throw new Error("Não foi possível atualizar a recomendação.");
    }
    return { ok: Boolean(ok) };
  });

/**
 * GATE 03 — Learning Feedback. O score atual da mesma chave é recalculado
 * no cliente a partir da inteligência da janela e comparado ao score do
 * momento da implementação. Melhorou, piorou ou não mudou: o motor aprende.
 */
export const evaluateRecommendation = createServerFn({ method: "POST" })
  .middleware([instrumented("observability", "recommendation.evaluate")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        id: z.string().uuid(),
        scoreAtual: z.number().int().min(0).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ resultado: string | null }> => {
    const { data: resultado, error } = await context.supabase.rpc(
      "evaluate_recommendation" as never,
      { _id: data.id, _score_atual: data.scoreAtual } as never,
    );
    if (error) {
      console.error("[evaluateRecommendation]", error.message);
      throw new Error("Não foi possível avaliar a recomendação.");
    }
    return { resultado: (resultado as unknown as string | null) ?? null };
  });

/** GATE 05 — precisão do próprio motor de recomendação. */
export const getRecommendationQuality = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        dias: z.number().int().min(1).max(730).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<RecommendationQuality> => {
    const { data: row, error } = await context.supabase.rpc(
      "recommendation_quality" as never,
      { _workspace_id: data.workspaceId, _dias: data.dias ?? 90 } as never,
    );
    if (error) {
      console.error("[getRecommendationQuality]", error.message);
      throw new Error("Não foi possível carregar a qualidade das recomendações.");
    }
    return row as unknown as RecommendationQuality;
  });