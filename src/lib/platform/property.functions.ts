import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordAudit } from "@/lib/platform/audit.server";
import { publishEvent } from "@/lib/platform/events.server";
import { slugify } from "@/lib/platform/comercial";
import {
  KNOWLEDGE_TIPOS,
  MEDIA_TIPOS,
  RELEASE_STATUS,
  variacao,
} from "@/lib/platform/property";

/**
 * SPRINT 07 — Property Domain.
 * Developer → Project → Release → Tower → Unit, com Price History,
 * Property Knowledge, Media e Inventory Engine baseado em eventos.
 */

const ws = z.string().uuid();

/* ============================ DEVELOPERS ============================ */

export const listDevelopers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: ws }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("developers")
      .select("id, nome, slug, cnpj, site, logo_url, contato_nome, contato_email, contato_telefone, ativo")
      .eq("workspace_id", data.workspaceId)
      .order("nome");

    if (error) {
      console.error("[listDevelopers]", error.message);
      throw new Error("Não foi possível carregar as construtoras.");
    }

    const ids = (rows ?? []).map((r) => r.id);
    const { data: projetos } = ids.length
      ? await context.supabase
          .from("empreendimentos")
          .select("id, developer_id")
          .in("developer_id", ids)
      : { data: [] as { id: string; developer_id: string | null }[] };

    const contagem = new Map<string, number>();
    for (const p of projetos ?? []) {
      if (p.developer_id) contagem.set(p.developer_id, (contagem.get(p.developer_id) ?? 0) + 1);
    }

    return (rows ?? []).map((r) => ({ ...r, projetos: contagem.get(r.id) ?? 0 }));
  });

export const createDeveloper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        nome: z.string().trim().min(2).max(120),
        cnpj: z.string().trim().max(20).optional().or(z.literal("")),
        site: z.string().trim().max(200).optional().or(z.literal("")),
        contatoNome: z.string().trim().max(120).optional().or(z.literal("")),
        contatoEmail: z.string().trim().max(160).optional().or(z.literal("")),
        contatoTelefone: z.string().trim().max(40).optional().or(z.literal("")),
        observacao: z.string().trim().max(2000).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("developers")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        slug: slugify(data.nome),
        cnpj: data.cnpj || null,
        site: data.site || null,
        contato_nome: data.contatoNome || null,
        contato_email: data.contatoEmail || null,
        contato_telefone: data.contatoTelefone || null,
        observacao: data.observacao || null,
        criado_por: userId,
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error("[createDeveloper]", error.message);
      throw new Error(
        error.code === "23505"
          ? "Já existe uma construtora com esse nome."
          : "Não foi possível cadastrar a construtora.",
      );
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "developer.created",
      entity: "developer",
      entityId: row.id,
      metadata: { nome: row.nome },
    });

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "DeveloperCreated",
      aggregate: "developer",
      aggregateId: row.id,
      actorId: userId,
      payload: { nome: row.nome },
    });

    return row;
  });

export const linkProjectDeveloper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        empreendimentoId: z.string().uuid(),
        developerId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("empreendimentos")
      .update({ developer_id: data.developerId })
      .eq("id", data.empreendimentoId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[linkProjectDeveloper]", error.message);
      throw new Error("Não foi possível vincular a construtora.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "empreendimento.developer_linked",
      entity: "empreendimento",
      entityId: data.empreendimentoId,
      metadata: { developerId: data.developerId },
    });

    return { ok: true };
  });

/* ============================= RELEASES ============================= */

export const listReleases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, empreendimentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("releases")
      .select("id, nome, ordem, status, lancamento_em, entrega_prevista, entrega_real, descricao")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .order("ordem");

    if (error) {
      console.error("[listReleases]", error.message);
      throw new Error("Não foi possível carregar as fases.");
    }
    return rows ?? [];
  });

export const createRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        empreendimentoId: z.string().uuid(),
        nome: z.string().trim().min(1).max(80),
        ordem: z.number().int().min(1).max(99).default(1),
        status: z.enum(RELEASE_STATUS).default("planejado"),
        lancamentoEm: z.string().optional().or(z.literal("")),
        entregaPrevista: z.string().optional().or(z.literal("")),
        descricao: z.string().trim().max(1000).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("releases")
      .insert({
        workspace_id: data.workspaceId,
        empreendimento_id: data.empreendimentoId,
        nome: data.nome,
        ordem: data.ordem,
        status: data.status,
        lancamento_em: data.lancamentoEm || null,
        entrega_prevista: data.entregaPrevista || null,
        descricao: data.descricao || null,
        criado_por: userId,
      })
      .select("id, nome, status")
      .single();

    if (error) {
      console.error("[createRelease]", error.message);
      throw new Error(
        error.code === "23505"
          ? "Já existe uma fase com esse nome neste empreendimento."
          : "Não foi possível criar a fase.",
      );
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "ReleaseCreated",
      aggregate: "release",
      aggregateId: row.id,
      actorId: userId,
      payload: { nome: row.nome, empreendimentoId: data.empreendimentoId },
    });

    return row;
  });

export const setReleaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        releaseId: z.string().uuid(),
        status: z.enum(RELEASE_STATUS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("releases")
      .update({
        status: data.status,
        entrega_real: data.status === "entregue" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", data.releaseId)
      .eq("workspace_id", data.workspaceId)
      .select("id, nome, status, empreendimento_id")
      .single();

    if (error) {
      console.error("[setReleaseStatus]", error.message);
      throw new Error("Não foi possível atualizar a fase.");
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "ReleaseStatusChanged",
      aggregate: "release",
      aggregateId: row.id,
      actorId: userId,
      payload: { nome: row.nome, status: row.status },
    });

    return row;
  });

/* ============================== TOWERS ============================== */

export const listTowers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, empreendimentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("towers")
      .select("id, nome, andares, unidades_por_andar, release_id, observacao")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .order("nome");

    if (error) {
      console.error("[listTowers]", error.message);
      throw new Error("Não foi possível carregar as torres.");
    }
    return rows ?? [];
  });

export const createTower = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        empreendimentoId: z.string().uuid(),
        nome: z.string().trim().min(1).max(60),
        releaseId: z.string().uuid().nullish(),
        andares: z.number().int().min(1).max(200).nullish(),
        unidadesPorAndar: z.number().int().min(1).max(60).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("towers")
      .insert({
        workspace_id: data.workspaceId,
        empreendimento_id: data.empreendimentoId,
        release_id: data.releaseId ?? null,
        nome: data.nome,
        andares: data.andares ?? null,
        unidades_por_andar: data.unidadesPorAndar ?? null,
        criado_por: userId,
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error("[createTower]", error.message);
      throw new Error(
        error.code === "23505"
          ? "Já existe uma torre com esse nome."
          : "Não foi possível criar a torre.",
      );
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "TowerCreated",
      aggregate: "tower",
      aggregateId: row.id,
      actorId: userId,
      payload: { nome: row.nome, empreendimentoId: data.empreendimentoId },
    });

    return row;
  });

/* =========================== PRICE HISTORY =========================== */

export const listUnitPriceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, unidadeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("unit_price_history")
      .select("id, preco, preco_anterior, variacao_percentual, motivo, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("unidade_id", data.unidadeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[listUnitPriceHistory]", error.message);
      throw new Error("Não foi possível carregar o histórico de preço.");
    }
    return rows ?? [];
  });

/** Preço nunca é sobrescrito sem histórico: as duas escritas andam juntas. */
export const changeUnitPrice = createServerFn({ method: "POST" })
  .middleware([instrumented("property", "alterar_preco")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        unidadeId: z.string().uuid(),
        preco: z.number().nonnegative().max(1e11),
        motivo: z.string().trim().max(200).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: atual, error: erroLeitura } = await supabase
      .from("unidades")
      .select("id, preco, identificador, empreendimento_id")
      .eq("id", data.unidadeId)
      .eq("workspace_id", data.workspaceId)
      .single();

    if (erroLeitura || !atual) throw new Error("Unidade não encontrada.");

    const anterior = atual.preco ? Number(atual.preco) : null;
    if (anterior === data.preco) return { id: atual.id, preco: data.preco, inalterado: true };

    const { error } = await supabase
      .from("unidades")
      .update({ preco: data.preco })
      .eq("id", data.unidadeId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[changeUnitPrice]", error.message);
      throw new Error("Você não tem permissão para alterar o preço desta unidade.");
    }

    const delta = variacao(anterior, data.preco);

    await supabase.from("unit_price_history").insert({
      workspace_id: data.workspaceId,
      unidade_id: data.unidadeId,
      preco_anterior: anterior,
      preco: data.preco,
      variacao_percentual: delta,
      motivo: data.motivo || null,
      autor_id: userId,
    });

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "UnitPriceChanged",
      aggregate: "unit",
      aggregateId: data.unidadeId,
      actorId: userId,
      payload: {
        identificador: atual.identificador,
        precoAnterior: anterior,
        preco: data.preco,
        variacao: delta,
        motivo: data.motivo || null,
      },
    });

    return { id: atual.id, preco: data.preco, variacao: delta, inalterado: false };
  });

/* =========================== INVENTORY ENGINE =========================== */

/**
 * Inventory Engine: o estado da unidade só muda por aqui, e a mudança
 * sempre publica evento — Timeline, Analytics e automações leem dali.
 */
export const moveUnitInventory = createServerFn({ method: "POST" })
  .middleware([instrumented("property", "alterar_estoque")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        unidadeId: z.string().uuid(),
        status: z.enum(["disponivel", "reservada", "vendida", "bloqueada", "em_analise"]),
        motivo: z.string().trim().max(200).optional().or(z.literal("")),
        correlationId: z.string().uuid().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: atual } = await supabase
      .from("unidades")
      .select("id, status, identificador")
      .eq("id", data.unidadeId)
      .eq("workspace_id", data.workspaceId)
      .single();

    if (!atual) throw new Error("Unidade não encontrada.");

    const { error } = await supabase
      .from("unidades")
      .update({ status: data.status })
      .eq("id", data.unidadeId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[moveUnitInventory]", error.message);
      throw new Error("Você não tem permissão para alterar esta unidade.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "unidade.status_changed",
      entity: "unidade",
      entityId: data.unidadeId,
      metadata: { de: atual.status, para: data.status, motivo: data.motivo || null },
    });

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "UnitStatusChanged",
      aggregate: "unit",
      aggregateId: data.unidadeId,
      actorId: userId,
      correlationId: data.correlationId ?? null,
      payload: {
        identificador: atual.identificador,
        de: atual.status,
        para: data.status,
        motivo: data.motivo || null,
      },
    });

    return { id: data.unidadeId, status: data.status };
  });

/* ========================= PROPERTY KNOWLEDGE ========================= */

export const listPropertyKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, empreendimentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("property_knowledge")
      .select("id, tipo, titulo, corpo, ordem, publico, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .order("tipo")
      .order("ordem");

    if (error) {
      console.error("[listPropertyKnowledge]", error.message);
      throw new Error("Não foi possível carregar o conhecimento do empreendimento.");
    }
    return rows ?? [];
  });

export const createPropertyKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        empreendimentoId: z.string().uuid(),
        tipo: z.enum(KNOWLEDGE_TIPOS),
        titulo: z.string().trim().min(2).max(160),
        corpo: z.string().trim().max(8000).optional().or(z.literal("")),
        ordem: z.number().int().min(1).max(99).default(1),
        publico: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("property_knowledge")
      .insert({
        workspace_id: data.workspaceId,
        empreendimento_id: data.empreendimentoId,
        tipo: data.tipo,
        titulo: data.titulo,
        corpo: data.corpo || null,
        ordem: data.ordem,
        publico: data.publico,
        criado_por: userId,
      })
      .select("id, tipo, titulo")
      .single();

    if (error) {
      console.error("[createPropertyKnowledge]", error.message);
      throw new Error("Não foi possível salvar o conteúdo.");
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "PropertyKnowledgeAdded",
      aggregate: "project",
      aggregateId: data.empreendimentoId,
      actorId: userId,
      payload: { tipo: row.tipo, titulo: row.titulo },
    });

    return row;
  });

export const deletePropertyKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("property_knowledge")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[deletePropertyKnowledge]", error.message);
      throw new Error("Apenas administradores podem remover conteúdos.");
    }
    return { ok: true };
  });

/* =========================== PROPERTY MEDIA =========================== */

export const listPropertyMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, empreendimentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("property_media")
      .select("id, tipo, titulo, url, ordem, publico, unidade_id, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .order("ordem");

    if (error) {
      console.error("[listPropertyMedia]", error.message);
      throw new Error("Não foi possível carregar os materiais.");
    }
    return rows ?? [];
  });

export const createPropertyMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: ws,
        empreendimentoId: z.string().uuid(),
        tipo: z.enum(MEDIA_TIPOS),
        titulo: z.string().trim().min(2).max(160),
        url: z.string().trim().url().max(600),
        ordem: z.number().int().min(1).max(99).default(1),
        publico: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("property_media")
      .insert({
        workspace_id: data.workspaceId,
        empreendimento_id: data.empreendimentoId,
        tipo: data.tipo,
        titulo: data.titulo,
        url: data.url,
        ordem: data.ordem,
        publico: data.publico,
        criado_por: userId,
      })
      .select("id, tipo, titulo")
      .single();

    if (error) {
      console.error("[createPropertyMedia]", error.message);
      throw new Error("Não foi possível salvar o material.");
    }

    await publishEvent(supabase, {
      workspaceId: data.workspaceId,
      type: "PropertyMediaAdded",
      aggregate: "project",
      aggregateId: data.empreendimentoId,
      actorId: userId,
      payload: { tipo: row.tipo, titulo: row.titulo },
    });

    return row;
  });

export const deletePropertyMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: ws, id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("property_media")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[deletePropertyMedia]", error.message);
      throw new Error("Apenas administradores podem remover materiais.");
    }
    return { ok: true };
  });
