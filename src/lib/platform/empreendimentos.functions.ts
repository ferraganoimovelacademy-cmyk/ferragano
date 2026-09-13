import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EMPREENDIMENTO_SEGMENTOS,
  EMPREENDIMENTO_STATUS,
  UNIDADE_STATUS,
  slugify,
} from "@/lib/platform/comercial";
import { recordAudit } from "@/lib/platform/audit.server";

/** Domínio Imobiliário — portfólio de empreendimentos e unidades. */

export const listEmpreendimentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("empreendimentos")
      .select(
        "id, nome, slug, construtora, cidade, uf, bairro, status, segmento, preco_min, preco_max, entrega_prevista, capa_url, publico, created_at",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listEmpreendimentos]", error.message);
      throw new Error("Não foi possível carregar os empreendimentos.");
    }

    const ids = (rows ?? []).map((r) => r.id);
    const { data: unidades } = ids.length
      ? await context.supabase
          .from("unidades")
          .select("empreendimento_id, status")
          .in("empreendimento_id", ids)
      : { data: [] as { empreendimento_id: string; status: string }[] };

    const contagem = new Map<string, { total: number; disponiveis: number }>();
    for (const u of unidades ?? []) {
      const atual = contagem.get(u.empreendimento_id) ?? { total: 0, disponiveis: 0 };
      atual.total += 1;
      if (u.status === "disponivel") atual.disponiveis += 1;
      contagem.set(u.empreendimento_id, atual);
    }

    return (rows ?? []).map((row) => ({
      ...row,
      unidadesTotal: contagem.get(row.id)?.total ?? 0,
      unidadesDisponiveis: contagem.get(row.id)?.disponiveis ?? 0,
    }));
  });

export const createEmpreendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(120),
        construtora: z.string().trim().max(120).optional().or(z.literal("")),
        cidade: z.string().trim().max(80).optional().or(z.literal("")),
        uf: z.string().trim().max(2).optional().or(z.literal("")),
        bairro: z.string().trim().max(80).optional().or(z.literal("")),
        status: z.enum(EMPREENDIMENTO_STATUS).default("lancamento"),
        segmento: z.enum(EMPREENDIMENTO_SEGMENTOS).default("mcmv"),
        precoMin: z.number().nonnegative().max(1e11).nullish(),
        precoMax: z.number().nonnegative().max(1e11).nullish(),
        descricao: z.string().trim().max(2000).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = slugify(data.nome);
    if (!slug) throw new Error("Nome inválido.");

    const { data: row, error } = await supabase
      .from("empreendimentos")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome,
        slug,
        construtora: data.construtora || null,
        cidade: data.cidade || null,
        uf: data.uf ? data.uf.toUpperCase() : null,
        bairro: data.bairro || null,
        status: data.status,
        segmento: data.segmento,
        preco_min: data.precoMin ?? null,
        preco_max: data.precoMax ?? null,
        descricao: data.descricao || null,
        criado_por: userId,
      })
      .select("id, nome, slug")
      .single();

    if (error) {
      console.error("[createEmpreendimento]", error.message);
      throw new Error(
        error.code === "23505"
          ? "Já existe um empreendimento com esse nome."
          : "Não foi possível cadastrar o empreendimento.",
      );
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "empreendimento.created",
      entity: "empreendimento",
      entityId: row.id,
      metadata: { nome: row.nome },
    });

    return row;
  });

export const listUnidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: z.string().uuid(), empreendimentoId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("unidades")
      .select("id, identificador, tipologia, dormitorios, vagas, area_privativa, andar, preco, status")
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .order("identificador");

    if (error) {
      console.error("[listUnidades]", error.message);
      throw new Error("Não foi possível carregar as unidades.");
    }
    return rows ?? [];
  });

/**
 * Publica/despublica um empreendimento na vitrine pública do site.
 * A leitura anônima é liberada por RLS apenas quando publico = true.
 */
export const setEmpreendimentoPublico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        empreendimentoId: z.string().uuid(),
        publico: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("empreendimentos")
      .update({ publico: data.publico })
      .eq("id", data.empreendimentoId)
      .eq("workspace_id", data.workspaceId)
      .select("id, nome, publico")
      .single();

    if (error) {
      console.error("[setEmpreendimentoPublico]", error.message);
      throw new Error("Não foi possível alterar a publicação.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: data.publico ? "empreendimento.published" : "empreendimento.unpublished",
      entity: "empreendimento",
      entityId: row.id,
      metadata: { nome: row.nome },
    });

    return row;
  });

/** Detalhe interno de um empreendimento (RLS por workspace). */
export const getEmpreendimento = createServerFn({ method: "GET" })
  .middleware([instrumented("property", "abrir_empreendimento")])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), empreendimentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("empreendimentos")
      .select(
        "id, nome, slug, construtora, cidade, uf, bairro, status, segmento, preco_min, preco_max, entrega_prevista, capa_url, descricao, publico, destaque",
      )
      .eq("id", data.empreendimentoId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (error) {
      console.error("[getEmpreendimento]", error.message);
      throw new Error("Não foi possível carregar o empreendimento.");
    }
    return row;
  });

/** Lista paginada de unidades — a listagem completa pode ter milhares de linhas. */
export const listUnidadesPaginado = createServerFn({ method: "GET" })
  .middleware([instrumented("property", "abrir_unidade")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        empreendimentoId: z.string().uuid(),
        pagina: z.number().int().min(1).default(1),
        porPagina: z.number().int().min(5).max(100).default(20),
        status: z.enum(UNIDADE_STATUS).optional(),
        busca: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const from = (data.pagina - 1) * data.porPagina;
    let query = context.supabase
      .from("unidades")
      .select(
        "id, identificador, tipologia, dormitorios, vagas, area_privativa, andar, preco, status",
        { count: "exact" },
      )
      .eq("workspace_id", data.workspaceId)
      .eq("empreendimento_id", data.empreendimentoId)
      .order("identificador")
      .range(from, from + data.porPagina - 1);

    if (data.status) query = query.eq("status", data.status);
    if (data.busca) {
      const termo = data.busca.replace(/[%,()]/g, "");
      query = query.or(`identificador.ilike.%${termo}%,tipologia.ilike.%${termo}%`);
    }

    const { data: rows, error, count } = await query;
    if (error) {
      console.error("[listUnidadesPaginado]", error.message);
      throw new Error("Não foi possível carregar as unidades.");
    }

    return {
      rows: rows ?? [],
      total: count ?? 0,
      pagina: data.pagina,
      porPagina: data.porPagina,
    };
  });

export const createUnidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        empreendimentoId: z.string().uuid(),
        identificador: z.string().trim().min(1).max(30),
        tipologia: z.string().trim().max(60).optional().or(z.literal("")),
        dormitorios: z.number().int().min(0).max(20).nullish(),
        vagas: z.number().int().min(0).max(20).nullish(),
        areaPrivativa: z.number().nonnegative().max(100000).nullish(),
        andar: z.number().int().min(-10).max(200).nullish(),
        preco: z.number().nonnegative().max(1e11).nullish(),
        status: z.enum(UNIDADE_STATUS).default("disponivel"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("unidades")
      .insert({
        workspace_id: data.workspaceId,
        empreendimento_id: data.empreendimentoId,
        identificador: data.identificador,
        tipologia: data.tipologia || null,
        dormitorios: data.dormitorios ?? null,
        vagas: data.vagas ?? null,
        area_privativa: data.areaPrivativa ?? null,
        andar: data.andar ?? null,
        preco: data.preco ?? null,
        status: data.status,
        criado_por: userId,
      })
      .select("id, identificador")
      .single();

    if (error) {
      console.error("[createUnidade]", error.message);
      throw new Error("Não foi possível cadastrar a unidade.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "unidade.created",
      entity: "unidade",
      entityId: row.id,
      metadata: { identificador: row.identificador, empreendimentoId: data.empreendimentoId },
    });

    return row;
  });

export const setUnidadeStatus = createServerFn({ method: "POST" })
  .middleware([instrumented("property", "alterar_estoque")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        unidadeId: z.string().uuid(),
        status: z.enum(UNIDADE_STATUS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("unidades")
      .update({ status: data.status })
      .eq("id", data.unidadeId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[setUnidadeStatus]", error.message);
      throw new Error("Você não tem permissão para alterar esta unidade.");
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "unidade.status_changed",
      entity: "unidade",
      entityId: data.unidadeId,
      metadata: { status: data.status },
    });

    return { ok: true as const };
  });
