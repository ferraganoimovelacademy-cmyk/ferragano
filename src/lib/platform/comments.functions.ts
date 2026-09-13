import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * GATE 03.5 — motor de comentários.
 * Serviço de fundação polimórfico: qualquer entidade recebe thread de
 * comentários sem tabela própria. RLS garante o isolamento por workspace;
 * a autoria é imposta pela policy (`autor_id = auth.uid()`).
 */

const entityRef = {
  workspaceId: z.string().uuid(),
  entity: z.string().trim().min(1).max(60).regex(/^[a-z_]+$/, "entidade inválida"),
  entityId: z.string().uuid(),
};

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object(entityRef).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("comments")
      .select("id, parent_id, autor_id, corpo, editado_em, removido_em, created_at")
      .eq("workspace_id", data.workspaceId)
      .eq("entity", data.entity)
      .eq("entity_id", data.entityId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[listComments]", error.message);
      throw new Error("Não foi possível carregar os comentários.");
    }

    const autorIds = [...new Set((rows ?? []).map((r) => r.autor_id))];
    const { data: profiles } = autorIds.length
      ? await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", autorIds)
      : { data: [] as { id: string; nome: string | null; email: string | null; avatar_url: string | null }[] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (rows ?? []).map((row) => {
      const autor = byId.get(row.autor_id);
      const removido = Boolean(row.removido_em);
      return {
        id: row.id,
        parentId: row.parent_id,
        corpo: removido ? "" : row.corpo,
        removido,
        editado: Boolean(row.editado_em),
        createdAt: row.created_at,
        autorId: row.autor_id,
        autorNome: autor?.nome ?? autor?.email ?? "Membro removido",
        autorAvatar: autor?.avatar_url ?? null,
        proprio: row.autor_id === userId,
      };
    });
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ...entityRef,
        corpo: z.string().trim().min(1).max(5000),
        parentId: z.string().uuid().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("comments")
      .insert({
        workspace_id: data.workspaceId,
        entity: data.entity,
        entity_id: data.entityId,
        parent_id: data.parentId ?? null,
        autor_id: context.userId,
        corpo: data.corpo,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[addComment]", error.message);
      throw new Error("Não foi possível publicar o comentário.");
    }
    return { id: created.id };
  });

export const editComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        commentId: z.string().uuid(),
        corpo: z.string().trim().min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("comments")
      .update({ corpo: data.corpo, editado_em: new Date().toISOString() })
      .eq("id", data.commentId)
      .is("removido_em", null);

    if (error) {
      console.error("[editComment]", error.message);
      throw new Error("Não foi possível editar o comentário.");
    }
    return { ok: true as const };
  });

/**
 * Exclusão suave: mantém a thread coerente (respostas continuam legíveis) e
 * preserva rastro. A policy de UPDATE só deixa o próprio autor marcar; admin
 * usa a exclusão definitiva pela policy de DELETE.
 */
export const removeComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ commentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: updated, error } = await supabase
      .from("comments")
      .update({ removido_em: new Date().toISOString(), corpo: "[removido]" })
      .eq("id", data.commentId)
      .select("id");

    if (error) {
      console.error("[removeComment]", error.message);
      throw new Error("Não foi possível remover o comentário.");
    }

    // Não é o autor: cai na policy de DELETE (autor ou admin).
    if (!updated?.length) {
      const { error: delError } = await supabase.from("comments").delete().eq("id", data.commentId);
      if (delError) {
        console.error("[removeComment:delete]", delError.message);
        throw new Error("Não foi possível remover o comentário.");
      }
    }

    return { ok: true as const };
  });
