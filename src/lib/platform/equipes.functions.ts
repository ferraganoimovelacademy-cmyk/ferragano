import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

/** Equipes do workspace + contagem de membros. */
export const listEquipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: equipes }, { data: members }] = await Promise.all([
      supabase
        .from("equipes")
        .select("*")
        .eq("workspace_id", data.workspaceId)
        .order("nome"),
      supabase
        .from("workspace_members")
        .select("user_id, equipe_id")
        .eq("workspace_id", data.workspaceId),
    ]);

    const ids = Array.from(
      new Set([
        ...(equipes ?? []).map((e) => e.gerente_id).filter(Boolean),
        ...(members ?? []).map((m) => m.user_id),
      ]),
    ) as string[];

    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", ids)
      : { data: [] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const counts = new Map<string, number>();
    for (const m of members ?? []) {
      if (m.equipe_id) counts.set(m.equipe_id, (counts.get(m.equipe_id) ?? 0) + 1);
    }

    return {
      equipes: (equipes ?? []).map((e) => ({
        ...e,
        gerente: e.gerente_id ? (byId.get(e.gerente_id) ?? null) : null,
        membros: counts.get(e.id) ?? 0,
      })),
      semEquipe: (members ?? []).filter((m) => !m.equipe_id).length,
    };
  });

/** Cria ou atualiza uma equipe (policies exigem admin). */
export const upsertEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        workspaceId: z.string().uuid(),
        nome: z.string().trim().min(2).max(60),
        descricao: z.string().trim().max(240).optional().nullable(),
        cor: z
          .string()
          .trim()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#1F6F78"),
        gerente_id: z.string().uuid().nullable().optional(),
        parent_id: z.string().uuid().nullable().optional(),
        ativa: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, workspaceId, ...rest } = data;

    if (id && rest.parent_id === id) {
      throw new Error("Uma equipe não pode ser subordinada a si mesma.");
    }

    const payload = {
      workspace_id: workspaceId,
      nome: rest.nome,
      slug: slugify(rest.nome) || "equipe",
      descricao: rest.descricao ?? null,
      cor: rest.cor,
      gerente_id: rest.gerente_id ?? null,
      parent_id: rest.parent_id ?? null,
      ativa: rest.ativa,
    };

    const query = id
      ? supabase.from("equipes").update(payload).eq("id", id)
      : supabase.from("equipes").insert({ ...payload, criado_por: userId });

    const { error } = await query;
    if (error) {
      console.error("[upsertEquipe]", error);
      throw new Error(
        error.code === "23505"
          ? "Já existe uma equipe com esse nome."
          : "Sem permissão para gerenciar equipes.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId,
      actorId: userId,
      action: id ? "equipe.updated" : "equipe.created",
      entity: "equipes",
      entityId: id,
      metadata: { nome: rest.nome },
    });

    return { ok: true };
  });

/** Remove uma equipe; membros ficam sem equipe. */
export const deleteEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("equipes").delete().eq("id", data.id);
    if (error) throw new Error("Sem permissão para remover a equipe.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "equipe.deleted",
      entity: "equipes",
      entityId: data.id,
    });
    return { ok: true };
  });
