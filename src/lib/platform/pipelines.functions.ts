import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";
import { STAGE_CORES, STAGE_TIPOS } from "@/lib/platform/sales";

/**
 * SPRINT 06 — Stage Engine.
 * O funil NÃO é fixo: cada workspace desenha o seu (MCMV, investidor, locação).
 * Etapa carrega SLA, cor, ordem, checklist e critérios de saída — a regra vive
 * no dado, não no código.
 */

const slugify = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

export type PipelineComEtapas = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  padrao: boolean;
  etapas: {
    id: string;
    nome: string;
    ordem: number;
    cor: string;
    tipo: string;
    probabilidade: number;
    sla_horas: number | null;
    checklist: string[];
    criterios_saida: string[];
  }[];
};

const asLista = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : [];

export const listPipelines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PipelineComEtapas[]> => {
    const { supabase } = context;

    const [{ data: pipelines, error }, { data: etapas, error: errEtapas }] = await Promise.all([
      supabase
        .from("pipelines")
        .select("id, nome, slug, descricao, ativo, padrao")
        .eq("workspace_id", data.workspaceId)
        .order("padrao", { ascending: false })
        .order("nome"),
      supabase
        .from("pipeline_stages")
        .select("id, pipeline_id, nome, ordem, cor, tipo, probabilidade, sla_horas, checklist, criterios_saida")
        .eq("workspace_id", data.workspaceId)
        .order("ordem"),
    ]);

    if (error || errEtapas) {
      console.error("[listPipelines]", error?.message ?? errEtapas?.message);
      throw new Error("Não foi possível carregar os funis.");
    }

    return (pipelines ?? []).map((p) => ({
      ...p,
      etapas: (etapas ?? [])
        .filter((e) => e.pipeline_id === p.id)
        .map((e) => ({
          id: e.id,
          nome: e.nome,
          ordem: e.ordem,
          cor: e.cor,
          tipo: e.tipo,
          probabilidade: e.probabilidade,
          sla_horas: e.sla_horas,
          checklist: asLista(e.checklist),
          criterios_saida: asLista(e.criterios_saida),
        })),
    }));
  });

/**
 * Cria o funil padrão do workspace. A função de banco é SECURITY DEFINER e só
 * o service role executa — por isso verificamos o papel do chamador antes.
 */
export const ensureDefaultPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: admin } = await supabase.rpc("is_workspace_admin", {
      _user_id: userId,
      _workspace_id: data.workspaceId,
    });
    if (!admin) throw new Error("Apenas administradores podem criar funis.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pipelineId, error } = await supabaseAdmin.rpc("seed_default_pipeline", {
      _workspace_id: data.workspaceId,
    });

    if (error) {
      console.error("[ensureDefaultPipeline]", error.message);
      throw new Error("Não foi possível criar o funil padrão.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "pipeline.seeded",
      entity: "pipeline",
      entityId: pipelineId as string,
    });

    return { pipelineId: pipelineId as string };
  });

export const createPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(80),
        descricao: z.string().trim().max(400).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("pipelines")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        slug: slugify(data.nome) || `funil-${Date.now()}`,
        descricao: data.descricao || null,
        criado_por: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createPipeline]", error.message);
      throw new Error("Não foi possível criar o funil.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "pipeline.created",
      entity: "pipeline",
      entityId: row.id,
      metadata: { nome: data.nome },
    });

    return row;
  });

export const upsertStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        pipelineId: z.string().uuid(),
        stageId: z.string().uuid().optional(),
        nome: z.string().trim().min(1).max(60),
        ordem: z.number().int().min(0).max(99),
        cor: z.enum(STAGE_CORES).default("slate"),
        tipo: z.enum(STAGE_TIPOS).default("aberto"),
        probabilidade: z.number().int().min(0).max(100).default(0),
        slaHoras: z.number().int().min(0).max(8760).nullish(),
        checklist: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
        criteriosSaida: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const payload = {
      workspace_id: data.workspaceId,
      pipeline_id: data.pipelineId,
      nome: data.nome,
      ordem: data.ordem,
      cor: data.cor,
      tipo: data.tipo,
      probabilidade: data.probabilidade,
      sla_horas: data.slaHoras ?? null,
      checklist: data.checklist as never,
      criterios_saida: data.criteriosSaida as never,
    };

    const query = data.stageId
      ? supabase
          .from("pipeline_stages")
          .update(payload)
          .eq("id", data.stageId)
          .eq("workspace_id", data.workspaceId)
          .select("id")
          .single()
      : supabase.from("pipeline_stages").insert(payload).select("id").single();

    const { data: row, error } = await query;
    if (error) {
      console.error("[upsertStage]", error.message);
      throw new Error("Não foi possível salvar a etapa.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: data.stageId ? "stage.updated" : "stage.created",
      entity: "pipeline_stage",
      entityId: row.id,
      metadata: { nome: data.nome },
    });

    return row;
  });

export const deleteStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: z.string().uuid(), stageId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { count } = await supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", data.workspaceId)
      .eq("stage_id", data.stageId);

    if ((count ?? 0) > 0)
      throw new Error("Existem oportunidades nesta etapa. Mova-as antes de excluir.");

    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", data.stageId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[deleteStage]", error.message);
      throw new Error("Não foi possível excluir a etapa.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "stage.deleted",
      entity: "pipeline_stage",
      entityId: data.stageId,
    });

    return { ok: true as const };
  });
