import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COMPROMISSO_STATUS, COMPROMISSO_TIPOS } from "@/lib/platform/agenda";
import { recordAudit } from "@/lib/platform/audit.server";
import { notify } from "@/lib/platform/notifications.server";

/**
 * Domínio Comercial — Agenda (compromissos e follow-ups).
 * Toda leitura/escrita sob RLS do workspace; nunca service role.
 * O vínculo com o registro é polimórfico (`entity` + `entity_id`), no mesmo
 * contrato dos serviços de fundação.
 */

const tipo = z.enum(COMPROMISSO_TIPOS);
const status = z.enum(COMPROMISSO_STATUS);
const entity = z
  .string()
  .trim()
  .regex(/^[a-z_]+$/, "Entidade inválida.")
  .max(40);

const SELECT =
  "id, titulo, descricao, tipo, status, inicio_em, fim_em, lembrete_em, responsavel_id, entity, entity_id, concluido_em, criado_por, created_at";

export const listCompromissos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        status: status.optional(),
        apenasMeus: z.boolean().default(false),
        entity: entity.optional(),
        entityId: z.string().uuid().optional(),
        de: z.string().datetime().optional(),
        ate: z.string().datetime().optional(),
        limite: z.number().int().min(1).max(300).default(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("compromissos")
      .select(SELECT)
      .eq("workspace_id", data.workspaceId)
      .order("inicio_em", { ascending: true })
      .limit(data.limite);

    if (data.status) query = query.eq("status", data.status);
    if (data.apenasMeus) query = query.eq("responsavel_id", context.userId);
    if (data.entity && data.entityId) {
      query = query.eq("entity", data.entity).eq("entity_id", data.entityId);
    }
    if (data.de) query = query.gte("inicio_em", data.de);
    if (data.ate) query = query.lte("inicio_em", data.ate);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listCompromissos]", error.message);
      throw new Error("Não foi possível carregar a agenda.");
    }

    const ids = [
      ...new Set((rows ?? []).map((r) => r.responsavel_id).filter(Boolean)),
    ] as string[];
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, nome, email").in("id", ids)
      : { data: [] as { id: string; nome: string | null; email: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Rótulo do registro vinculado: só pessoas por enquanto (RLS filtra o resto).
    const personIds = [
      ...new Set(
        (rows ?? []).filter((r) => r.entity === "person" && r.entity_id).map((r) => r.entity_id!),
      ),
    ];
    const { data: pessoas } = personIds.length
      ? await context.supabase.from("people").select("id, nome").in("id", personIds)
      : { data: [] as { id: string; nome: string }[] };
    const personById = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));

    return (rows ?? []).map((row) => ({
      ...row,
      responsavelNome: row.responsavel_id
        ? (byId.get(row.responsavel_id)?.nome ?? byId.get(row.responsavel_id)?.email ?? "—")
        : null,
      vinculoNome:
        row.entity === "person" && row.entity_id ? (personById.get(row.entity_id) ?? null) : null,
    }));
  });

export const createCompromisso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        titulo: z.string().trim().min(2).max(160),
        descricao: z.string().trim().max(2000).optional().or(z.literal("")),
        tipo: tipo.default("followup"),
        inicioEm: z.string().datetime(),
        fimEm: z.string().datetime().nullish(),
        responsavelId: z.string().uuid().nullish(),
        entity: entity.nullish(),
        entityId: z.string().uuid().nullish(),
      })
      .refine((v) => Boolean(v.entity) === Boolean(v.entityId), {
        message: "Vínculo incompleto.",
        path: ["entityId"],
      })
      .refine((v) => !v.fimEm || new Date(v.fimEm) >= new Date(v.inicioEm), {
        message: "O término não pode ser antes do início.",
        path: ["fimEm"],
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const responsavelId = data.responsavelId ?? userId;

    const { data: criado, error } = await supabase
      .from("compromissos")
      .insert({
        workspace_id: data.workspaceId,
        titulo: data.titulo,
        descricao: data.descricao || null,
        tipo: data.tipo,
        inicio_em: data.inicioEm,
        fim_em: data.fimEm ?? null,
        responsavel_id: responsavelId,
        entity: data.entity ?? null,
        entity_id: data.entityId ?? null,
        criado_por: userId,
      })
      .select("id, titulo, inicio_em")
      .single();

    if (error) {
      console.error("[createCompromisso]", error.message);
      throw new Error("Não foi possível criar o compromisso.");
    }

    if (data.entity === "person" && data.entityId) {
      await supabase.from("activities").insert({
        workspace_id: data.workspaceId,
        person_id: data.entityId,
        tipo: "nota",
        titulo: "Compromisso agendado",
        descricao: `Compromisso agendado: ${data.titulo}.`,
        autor_id: userId,
        metadata: { compromisso_id: criado.id, tipo: data.tipo },
      });
    }

    if (responsavelId !== userId) {
      await notify(supabase, {
        workspaceId: data.workspaceId,
        userId: responsavelId,
        titulo: "Novo compromisso para você",
        mensagem: data.titulo,
        link: "/app/agenda",
        entity: "compromisso",
        entityId: criado.id,
      });
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "compromisso.created",
      entity: "compromisso",
      entityId: criado.id,
      metadata: { tipo: data.tipo, vinculo: data.entity ?? null },
    });

    return criado;
  });

export const setCompromissoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        compromissoId: z.string().uuid(),
        status,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: atual, error: readErr } = await supabase
      .from("compromissos")
      .select("id, status, titulo, entity, entity_id")
      .eq("id", data.compromissoId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (readErr || !atual) throw new Error("Compromisso não encontrado.");
    if (atual.status === data.status) return { ok: true as const };

    const { error } = await supabase
      .from("compromissos")
      .update({
        status: data.status,
        concluido_em: data.status === "concluido" ? new Date().toISOString() : null,
      })
      .eq("id", data.compromissoId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[setCompromissoStatus]", error.message);
      throw new Error("Você não tem permissão para alterar este compromisso.");
    }

    if (data.status === "concluido" && atual.entity === "person" && atual.entity_id) {
      await supabase
        .from("people")
        .update({ ultimo_contato_em: new Date().toISOString() })
        .eq("id", atual.entity_id)
        .eq("workspace_id", data.workspaceId);

      await supabase.from("activities").insert({
        workspace_id: data.workspaceId,
        person_id: atual.entity_id,
        tipo: "nota",
        titulo: "Compromisso concluído",
        descricao: `Compromisso concluído: ${atual.titulo}.`,
        autor_id: userId,
        metadata: { compromisso_id: atual.id },
      });
    }

    await recordAudit(supabase, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "compromisso.status_changed",
      entity: "compromisso",
      entityId: data.compromissoId,
      metadata: { de: atual.status, para: data.status },
    });

    return { ok: true as const };
  });

export const deleteCompromisso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ workspaceId: z.string().uuid(), compromissoId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("compromissos")
      .delete()
      .eq("id", data.compromissoId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      console.error("[deleteCompromisso]", error.message);
      throw new Error("Você não tem permissão para excluir este compromisso.");
    }

    await recordAudit(context.supabase, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "compromisso.deleted",
      entity: "compromisso",
      entityId: data.compromissoId,
    });

    return { ok: true as const };
  });
