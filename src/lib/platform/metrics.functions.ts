import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlatformMetricsSummary } from "@/lib/platform/metrics";

/**
 * SPRINT 11 — GATE A6: Query Layer das métricas de plataforma.
 *
 * A tabela `platform_metrics` só é legível por proprietário/administrador via
 * RLS; o resumo agregado vem da função `platform_metrics_summary`, que valida
 * o papel antes de devolver qualquer número.
 */
export const getPlatformMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaHoras: z.number().int().min(1).max(720).default(24),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PlatformMetricsSummary> => {
    const { data: row, error } = await context.supabase.rpc(
      "platform_metrics_summary" as never,
      { _workspace_id: data.workspaceId, _janela_horas: data.janelaHoras } as never,
    );

    if (error) {
      console.error("[getPlatformMetrics]", error.message);
      throw new Error("Não foi possível carregar as métricas da plataforma.");
    }

    return row as unknown as PlatformMetricsSummary;
  });

/** Registro de medição (latência de tela, erro, contagem). Só membro do workspace. */
export const recordPlatformMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        metricName: z.string().min(3).max(120),
        metricType: z.enum(["latencia", "contagem", "taxa", "erro", "duracao"]),
        metricValue: z.number().finite(),
        entityType: z.string().max(60).nullable().default(null),
        entityId: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc(
      "record_platform_metric" as never,
      {
        _workspace_id: data.workspaceId,
        _metric_name: data.metricName,
        _metric_type: data.metricType,
        _metric_value: data.metricValue,
        _entity_type: data.entityType ?? undefined,
        _entity_id: data.entityId ?? undefined,
      } as never,
    );

    if (error) {
      console.error("[recordPlatformMetric]", error.message);
      throw new Error("Não foi possível registrar a métrica.");
    }

    return { id: id as unknown as string };
  });