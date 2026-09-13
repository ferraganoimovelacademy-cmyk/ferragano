import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  DecisionAccuracy,
  FeatureAdoption,
  PlatformAlert,
} from "@/lib/platform/telemetry";

/**
 * SPRINT 12 — Query Layer do domínio Observability.
 * Telemetria, adoção, precisão de decisão e alertas passam só por aqui.
 */

const dominio = z.enum([
  "people",
  "sales",
  "property",
  "platform",
  "automation",
  "observability",
  "marketing",
]);

/** Telemetria do cliente (jornada, Web Vitals, login/logout, cache). */
export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        domain: dominio,
        action: z.string().min(2).max(60),
        duracaoMs: z.number().int().min(0).max(600_000).nullable().default(null),
        ok: z.boolean().default(true),
        surface: z.string().max(80).nullable().default(null),
        entityType: z.string().max(60).nullable().default(null),
        entityId: z.string().uuid().nullable().default(null),
        sessionId: z.string().uuid().nullable().default(null),
        erro: z.string().max(500).nullable().default(null),
        metric: z.string().max(120).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { recordTelemetry } = await import("@/lib/platform/telemetry.server");
    await recordTelemetry(context.supabase, data);
    return { ok: true };
  });

/** GATE 02/03 — jornada real de uso e adoção por feature. */
export const getFeatureAdoption = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaHoras: z.number().int().min(1).max(720).default(168),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<FeatureAdoption> => {
    const { data: row, error } = await context.supabase.rpc("feature_adoption" as never, {
      _workspace_id: data.workspaceId,
      _janela_horas: data.janelaHoras,
    } as never);

    if (error) {
      console.error("[getFeatureAdoption]", error.message);
      throw new Error("Não foi possível carregar a adoção de funcionalidades.");
    }

    return row as unknown as FeatureAdoption;
  });

/** GATE 04 — recomendou → aceitou? → vendeu? */
export const getDecisionAccuracy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        janelaHoras: z.number().int().min(1).max(8760).default(720),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<DecisionAccuracy> => {
    const { data: row, error } = await context.supabase.rpc("decision_accuracy" as never, {
      _workspace_id: data.workspaceId,
      _janela_horas: data.janelaHoras,
    } as never);

    if (error) {
      console.error("[getDecisionAccuracy]", error.message);
      throw new Error("Não foi possível carregar a precisão das recomendações.");
    }

    return row as unknown as DecisionAccuracy;
  });

/** Registra a decisão do corretor sobre a próxima melhor ação sugerida. */
export const recordDecisionOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        recomendacao: z.string().min(3).max(300),
        recomendacaoTipo: z.string().min(2).max(60),
        opportunityId: z.string().uuid().nullable().default(null),
        personId: z.string().uuid().nullable().default(null),
        confianca: z.number().int().min(0).max(100).nullable().default(null),
        decisao: z.enum(["pendente", "aceita", "ignorada", "rejeitada"]).default("pendente"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("record_decision_outcome" as never, {
      _workspace_id: data.workspaceId,
      _recomendacao: data.recomendacao,
      _recomendacao_tipo: data.recomendacaoTipo,
      _opportunity_id: data.opportunityId ?? undefined,
      _person_id: data.personId ?? undefined,
      _confianca: data.confianca ?? undefined,
      _decisao: data.decisao,
    } as never);

    if (error) {
      console.error("[recordDecisionOutcome]", error.message);
      throw new Error("Não foi possível registrar a decisão.");
    }

    return { id: id as unknown as string };
  });

/** GATE 06 — alertas abertos da plataforma. */
export const listPlatformAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        incluirResolvidos: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PlatformAlert[]> => {
    const { data: rows, error } = await context.supabase.rpc("list_platform_alerts" as never, {
      _workspace_id: data.workspaceId,
      _incluir_resolvidos: data.incluirResolvidos,
    } as never);

    if (error) {
      console.error("[listPlatformAlerts]", error.message);
      throw new Error("Não foi possível carregar os alertas da plataforma.");
    }

    return ((rows ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      id: r["id"] as string,
      chave: r["chave"] as string,
      severidade: r["severidade"] as PlatformAlert["severidade"],
      titulo: r["titulo"] as string,
      detalhe: (r["detalhe"] as string | null) ?? null,
      metrica: (r["metrica"] as string | null) ?? null,
      valor: r["valor"] == null ? null : Number(r["valor"]),
      limite: r["limite"] == null ? null : Number(r["limite"]),
      status: r["status"] as PlatformAlert["status"],
      createdAt: r["created_at"] as string,
    }));
  });

/** Reconhece ou resolve um alerta (proprietário/administrador). */
export const ackPlatformAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), resolver: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: ok, error } = await context.supabase.rpc("ack_platform_alert" as never, {
      _id: data.id,
      _resolver: data.resolver,
    } as never);

    if (error) {
      console.error("[ackPlatformAlert]", error.message);
      throw new Error("Não foi possível atualizar o alerta.");
    }

    return { ok: Boolean(ok) };
  });