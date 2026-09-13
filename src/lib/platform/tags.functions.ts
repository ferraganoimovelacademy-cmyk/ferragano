import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * GATE 03.5 — motor de tags.
 * Serviço de fundação: qualquer entidade (lead, imóvel, cliente, contrato)
 * usa estas funções em vez de criar tabela própria de etiquetas.
 * Toda leitura e escrita passa por RLS — nunca service role.
 */

const CORES = [
  "graphite",
  "petrol",
  "gold",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export type TagColor = (typeof CORES)[number];

const entityRef = {
  workspaceId: z.string().uuid(),
  entity: z.string().trim().min(1).max(60).regex(/^[a-z_]+$/, "entidade inválida"),
  entityId: z.string().uuid(),
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Catálogo de tags do workspace, opcionalmente filtrado por escopo. */
export const listTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        escopo: z.string().trim().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("tags")
      .select("id, nome, slug, cor, escopo")
      .eq("workspace_id", data.workspaceId)
      .order("nome");

    if (data.escopo) query = query.or(`escopo.is.null,escopo.eq.${data.escopo}`);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listTags]", error.message);
      throw new Error("Não foi possível carregar as tags.");
    }
    return rows ?? [];
  });

/** Cria a tag se ainda não existir (idempotente por slug) e devolve a tag. */
export const upsertTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(1).max(60),
        cor: z.enum(CORES).default("graphite"),
        escopo: z.string().trim().max(60).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = slugify(data.nome);
    if (!slug) throw new Error("Nome de tag inválido.");

    const { data: existing } = await supabase
      .from("tags")
      .select("id, nome, slug, cor, escopo")
      .eq("workspace_id", data.workspaceId)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from("tags")
      .insert({
        workspace_id: data.workspaceId,
        nome: data.nome.trim(),
        slug,
        cor: data.cor,
        escopo: data.escopo ?? null,
        criado_por: userId,
      })
      .select("id, nome, slug, cor, escopo")
      .single();

    if (error) {
      console.error("[upsertTag]", error.message);
      throw new Error("Não foi possível criar a tag.");
    }
    return created;
  });

/** Tags vinculadas a um registro específico. */
export const listEntityTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object(entityRef).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("taggings")
      .select("id, tag_id, tags(id, nome, slug, cor)")
      .eq("workspace_id", data.workspaceId)
      .eq("entity", data.entity)
      .eq("entity_id", data.entityId);

    if (error) {
      console.error("[listEntityTags]", error.message);
      throw new Error("Não foi possível carregar as tags do registro.");
    }

    return (rows ?? [])
      .filter((row) => row.tags)
      .map((row) => ({
        taggingId: row.id,
        id: row.tags!.id,
        nome: row.tags!.nome,
        slug: row.tags!.slug,
        cor: row.tags!.cor,
      }));
  });

/** Vincula uma tag existente a um registro. Repetição é silenciosamente ignorada. */
export const attachTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ...entityRef, tagId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("taggings").insert({
      workspace_id: data.workspaceId,
      tag_id: data.tagId,
      entity: data.entity,
      entity_id: data.entityId,
      criado_por: context.userId,
    });

    // 23505 = já vinculada
    if (error && error.code !== "23505") {
      console.error("[attachTag]", error.message);
      throw new Error("Não foi possível vincular a tag.");
    }
    return { ok: true as const };
  });

/** Remove o vínculo (autor do vínculo ou admin, pela policy). */
export const detachTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ taggingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("taggings")
      .delete()
      .eq("id", data.taggingId);

    if (error) {
      console.error("[detachTag]", error.message);
      throw new Error("Não foi possível remover a tag.");
    }
    return { ok: true as const };
  });
