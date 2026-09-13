import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";
import {
  AUTOMATION_ACOES,
  AUTOMATION_CANAIS,
  type AutomationEffectivenessRow,
  type AutomationRule,
  type ConfigValue,
  type OutboxRow,
  type OutboxStatus,
} from "@/lib/platform/automation";

/**
 * SPRINT 09 — leitura e configuração do Automation Engine.
 * Regras: qualquer membro lê, só admin escreve (RLS + checagem explícita).
 * A fila (`outbox_events`) não tem policy de SELECT: o acesso passa pela
 * função `list_outbox_queue`, que já valida o papel de admin.
 */

const asObjeto = (v: unknown): Record<string, ConfigValue> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, ConfigValue>) : {};

export const listAutomationRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AutomationRule[]> => {
    const { data: regras, error } = await context.supabase
      .from("automation_rules")
      .select("id, nome, descricao, event_type, acao, canal, config, delay_segundos, ativa")
      .eq("workspace_id", data.workspaceId)
      .order("event_type")
      .order("nome");

    if (error) throw new Error(error.message);

    return (regras ?? []).map((r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      eventType: r.event_type,
      acao: r.acao as AutomationRule["acao"],
      canal: r.canal as AutomationRule["canal"],
      config: asObjeto(r.config),
      delaySegundos: r.delay_segundos,
      ativa: r.ativa,
    }));
  });

export const toggleAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ruleId: z.string().uuid(), ativa: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: regra, error } = await supabase
      .from("automation_rules")
      .update({ ativa: data.ativa })
      .eq("id", data.ruleId)
      .select("id, workspace_id, nome, ativa")
      .single();

    if (error) throw new Error(error.message);

    await recordAudit(supabase, {
      workspaceId: regra.workspace_id,
      actorId: userId,
      action: data.ativa ? "automation_rule.enabled" : "automation_rule.disabled",
      entity: "automation_rule",
      entityId: regra.id,
      metadata: { nome: regra.nome },
    });

    return { id: regra.id, ativa: regra.ativa };
  });

export const upsertAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        ruleId: z.string().uuid().optional(),
        nome: z.string().trim().min(3).max(120),
        descricao: z.string().trim().max(400).optional().nullable(),
        eventType: z.string().trim().min(3).max(80),
        acao: z.enum(AUTOMATION_ACOES),
        canal: z.enum(AUTOMATION_CANAIS),
        delaySegundos: z.number().int().min(0).max(2592000),
        config: z.record(z.string(), z.unknown()).optional(),
        condicoes: z.record(z.string(), z.unknown()).optional(),
        ativa: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const payload = {
      workspace_id: data.workspaceId,
      nome: data.nome,
      descricao: data.descricao ?? null,
      event_type: data.eventType,
      acao: data.acao,
      canal: data.canal,
      delay_segundos: data.delaySegundos,
      config: (data.config ?? {}) as never,
      condicoes: (data.condicoes ?? {}) as never,
      ativa: data.ativa,
      criado_por: userId,
    };

    const query = data.ruleId
      ? supabase.from("automation_rules").update(payload).eq("id", data.ruleId)
      : supabase.from("automation_rules").insert(payload);

    const { data: regra, error } = await query.select("id").single();
    if (error) throw new Error(error.message);

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: data.ruleId ? "automation_rule.updated" : "automation_rule.created",
      entity: "automation_rule",
      entityId: regra.id,
      metadata: { nome: data.nome, eventType: data.eventType, acao: data.acao },
    });

    return { id: regra.id };
  });

export const deleteAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), ruleId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("automation_rules").delete().eq("id", data.ruleId);
    if (error) throw new Error(error.message);

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "automation_rule.deleted",
      entity: "automation_rule",
      entityId: data.ruleId,
      metadata: {},
    });

    return { ok: true };
  });

export const listOutboxQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        status: z
          .enum(["pendente", "processando", "entregue", "falhou", "descartado"])
          .optional()
          .nullable(),
        limite: z.number().int().min(1).max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<OutboxRow[]> => {
    const { data: fila, error } = await context.supabase.rpc("list_outbox_queue", {
      _workspace_id: data.workspaceId,
      _status: data.status ?? undefined,
      _limit: data.limite ?? 50,
    });

    if (error) throw new Error(error.message);

    return (fila ?? []).map((r) => ({
      id: r.id,
      eventType: r.event_type,
      canal: r.canal,
      destino: r.destino,
      status: r.status as OutboxStatus,
      tentativas: r.tentativas,
      maxTentativas: r.max_tentativas,
      ultimoErro: r.ultimo_erro,
      disponivelEm: r.disponivel_em,
      processadoEm: r.processado_em,
      createdAt: r.created_at,
      ruleId: r.rule_id,
    }));
  });

export const retryOutboxEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ outboxId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("retry_outbox_event", { _id: data.outboxId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Cria as regras padrão do workspace. A função de banco é SECURITY DEFINER e
 * só o service role executa — por isso o papel do chamador é verificado antes.
 */
export const ensureDefaultAutomationRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: admin } = await supabase.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: data.workspaceId,
    });
    if (!admin) throw new Error("Apenas administradores podem criar regras de automação.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("seed_automation_rules", {
      _workspace_id: data.workspaceId,
    });

    if (error) {
      console.error("[ensureDefaultAutomationRules]", error.message);
      throw new Error("Não foi possível criar as regras padrão.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "automation_rule.seeded",
      entity: "automation_rule",
      metadata: {},
    });

    return { ok: true };
  });

/**
 * SPRINT 18 — efetividade por regra. A função de banco é security definer e
 * valida papel de administrador antes de devolver qualquer número.
 */
export const getAutomationEffectiveness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        dias: z.number().int().min(1).max(365).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AutomationEffectivenessRow[]> => {
    const { data: linhas, error } = await context.supabase.rpc(
      "automation_effectiveness" as never,
      { _workspace_id: data.workspaceId, _dias: data.dias ?? 30 } as never,
    );

    if (error) {
      console.error("[getAutomationEffectiveness]", error.message);
      throw new Error("Não foi possível carregar a efetividade das automações.");
    }

    type Bruta = {
      rule_id: string;
      nome: string;
      event_type: string;
      acao: string;
      canal: string;
      ativa: boolean;
      total: number | string;
      entregues: number | string;
      falhou: number | string;
      pendentes: number | string;
      descartados: number | string;
      tentativas_media: number | string;
      latencia_media_segundos: number | string;
      ultima_execucao: string | null;
      ultimo_erro: string | null;
    };

    const num = (v: number | string | null | undefined) => Number(v ?? 0);

    return ((linhas ?? []) as unknown as Bruta[]).map((r) => ({
      ruleId: r.rule_id,
      nome: r.nome,
      eventType: r.event_type,
      acao: r.acao as AutomationEffectivenessRow["acao"],
      canal: r.canal as AutomationEffectivenessRow["canal"],
      ativa: r.ativa,
      total: num(r.total),
      entregues: num(r.entregues),
      falhou: num(r.falhou),
      pendentes: num(r.pendentes),
      descartados: num(r.descartados),
      tentativasMedia: num(r.tentativas_media),
      latenciaMediaSegundos: num(r.latencia_media_segundos),
      ultimaExecucao: r.ultima_execucao,
      ultimoErro: r.ultimo_erro,
    }));
  });