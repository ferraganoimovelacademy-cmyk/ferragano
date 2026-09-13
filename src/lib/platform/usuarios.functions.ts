import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const APP_ROLES = [
  "proprietario",
  "administrador",
  "diretor",
  "gerente",
  "corretor",
  "marketing",
  "financeiro",
  "suporte",
  "cliente",
] as const;

const MEMBER_STATUS = ["ativo", "inativo", "suspenso"] as const;

async function assertAdmin(
  supabase: { rpc: (fn: "is_workspace_admin", args: Record<string, unknown>) => Promise<{ data: unknown }> },
  userId: string,
  workspaceId: string,
) {
  const { data } = await supabase.rpc("is_workspace_admin", {
    _user_id: userId,
    _workspace_id: workspaceId,
  });
  if (data !== true) throw new Error("Apenas administradores podem executar esta ação.");
}

/** Diretório de usuários do workspace com papel, equipe, gestor e status. */
export const listUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: members }, { data: roles }, { data: equipes }, { data: invites }] =
      await Promise.all([
        supabase
          .from("workspace_members")
          .select("user_id, ativo, status, joined_at, equipe_id, gestor_id, ultimo_acesso_em")
          .eq("workspace_id", data.workspaceId),
        supabase.from("user_roles").select("user_id, role").eq("workspace_id", data.workspaceId),
        supabase.from("equipes").select("id, nome, cor").eq("workspace_id", data.workspaceId),
        supabase
          .from("workspace_invites")
          .select("id, email, role, status, expira_em, created_at")
          .eq("workspace_id", data.workspaceId)
          .eq("status", "pendente"),
      ]);

    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabase
          .from("profiles")
          .select("id, nome, email, telefone, whatsapp, cargo, avatar_url")
          .in("id", ids)
      : { data: [] };

    const byProfile = new Map((profiles ?? []).map((p) => [p.id, p]));
    const byEquipe = new Map((equipes ?? []).map((e) => [e.id, e]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role as string]);
    }

    return {
      usuarios: (members ?? []).map((m) => ({
        ...m,
        profile: byProfile.get(m.user_id) ?? null,
        equipe: m.equipe_id ? (byEquipe.get(m.equipe_id) ?? null) : null,
        gestor: m.gestor_id ? (byProfile.get(m.gestor_id) ?? null) : null,
        roles: rolesByUser.get(m.user_id) ?? [],
      })),
      equipes: equipes ?? [],
      invites: invites ?? [],
    };
  });

/** Atualiza vínculo do usuário com a empresa: equipe, gestor, situação e papel. */
export const updateMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        userId: z.string().uuid(),
        equipe_id: z.string().uuid().nullable().optional(),
        gestor_id: z.string().uuid().nullable().optional(),
        status: z.enum(MEMBER_STATUS).optional(),
        role: z.enum(APP_ROLES).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: actorId } = context;
    await assertAdmin(supabase as never, actorId, data.workspaceId);

    if (data.gestor_id && data.gestor_id === data.userId) {
      throw new Error("Um usuário não pode ser gestor de si mesmo.");
    }

    const patch: Record<string, unknown> = {};
    if (data.equipe_id !== undefined) patch.equipe_id = data.equipe_id;
    if (data.gestor_id !== undefined) patch.gestor_id = data.gestor_id;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.ativo = data.status === "ativo";
    }

    if (Object.keys(patch).length) {
      const { error } = await supabase
        .from("workspace_members")
        .update(patch as never)
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", data.userId);
      if (error) {
        console.error("[updateMembro]", error);
        throw new Error("Não foi possível atualizar o usuário.");
      }
    }

    if (data.role) {
      // Não permite rebaixar o último proprietário do workspace.
      const { data: owners } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("workspace_id", data.workspaceId)
        .eq("role", "proprietario");
      const isOwner = (owners ?? []).some((o) => o.user_id === data.userId);
      if (isOwner && data.role !== "proprietario" && (owners ?? []).length <= 1) {
        throw new Error("O workspace precisa de pelo menos um proprietário.");
      }

      await supabase
        .from("user_roles")
        .delete()
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", data.userId);
      const { error } = await supabase.from("user_roles").insert({
        workspace_id: data.workspaceId,
        user_id: data.userId,
        role: data.role,
      });
      if (error) {
        console.error("[updateMembro:role]", error);
        throw new Error("Não foi possível alterar o papel do usuário.");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId,
      action: "member.updated",
      entity: "workspace_members",
      entityId: data.userId,
      metadata: { ...patch, role: data.role ?? null },
    });

    return { ok: true };
  });

/** Atualiza o próprio perfil (nome, cargo, telefone, whatsapp, avatar). */
export const updateMeuPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(80).optional(),
        cargo: z.string().trim().max(80).nullable().optional(),
        telefone: z.string().trim().max(40).nullable().optional(),
        whatsapp: z.string().trim().max(40).nullable().optional(),
        avatar_url: z.string().trim().url().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error("Não foi possível atualizar o perfil.");
    return { ok: true };
  });
