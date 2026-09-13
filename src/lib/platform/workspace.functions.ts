import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODULE_KEYS = [
  "crm",
  "erp",
  "academy",
  "ia",
  "analytics",
  "financeiro",
  "marketing",
  "portal_cliente",
  "intelligence_hub",
  "knowledge",
] as const;

const DEFAULT_ENABLED = new Set<string>(["crm"]);

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

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

/**
 * Contexto da sessão: perfil, workspace ativo, papéis e flags de módulo.
 * Também consome convites pendentes endereçados ao e-mail do usuário.
 */
export const getSessionContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : null;
    const metadata = claims.user_metadata as Record<string, unknown> | undefined;
    // Só consumimos convite quando o provedor confirmou a posse do e-mail.
    const emailVerificado =
      (claims as Record<string, unknown>).email_verified === true ||
      metadata?.email_verified === true;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Garante o perfil (não há trigger no schema auth).
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          nome:
            (metadata?.nome as string | undefined) ??
            (metadata?.full_name as string | undefined) ??
            null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

    // Consome convites pendentes para este e-mail (comparação exata: `ilike`
    // trataria `_` e `%` do endereço como coringas).
    if (email && emailVerificado) {
      const { data: invites } = await supabaseAdmin
        .from("workspace_invites")
        .select("id, workspace_id, role, expira_em")
        .eq("status", "pendente")
        .eq("email", email);

      for (const invite of invites ?? []) {
        if (new Date(invite.expira_em) < new Date()) {
          await supabaseAdmin
            .from("workspace_invites")
            .update({ status: "expirado" })
            .eq("id", invite.id);
          continue;
        }
        await supabaseAdmin
          .from("workspace_members")
          .upsert(
            { workspace_id: invite.workspace_id, user_id: userId, ativo: true },
            { onConflict: "workspace_id,user_id", ignoreDuplicates: true },
          );
        await supabaseAdmin
          .from("user_roles")
          .upsert(
            { workspace_id: invite.workspace_id, user_id: userId, role: invite.role },
            { onConflict: "user_id,workspace_id,role", ignoreDuplicates: true },
          );
        await supabaseAdmin
          .from("workspace_invites")
          .update({ status: "aceito", aceito_em: new Date().toISOString() })
          .eq("id", invite.id);
        const { recordAudit } = await import("./audit.server");
        await recordAudit(supabaseAdmin, {
          workspaceId: invite.workspace_id,
          actorId: userId,
          action: "invite.accepted",
          entity: "workspace_invites",
          entityId: invite.id,
        });
        const { notifyWorkspace } = await import("./notifications.server");
        await notifyWorkspace(
          supabaseAdmin,
          invite.workspace_id,
          {
            titulo: "Novo membro no workspace",
            mensagem: `${email} aceitou o convite.`,
            tipo: "sucesso",
            link: "/app/configuracoes",
            entity: "workspace_members",
          },
          userId,
        );

      }
    }

    // Leitura sob RLS, como o próprio usuário.
    const { supabase } = context;
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, ativo, workspaces(id, slug, nome, status, plano, trial_expira_em)")
        .eq("user_id", userId)
        .eq("ativo", true),
    ]);

    const workspace = (memberships ?? [])
      .map((m) => m.workspaces)
      .find(Boolean) as
      | { id: string; slug: string; nome: string; status: string; plano: string; trial_expira_em: string | null }
      | undefined;

    if (!workspace) {
      return { profile: profile ?? null, workspace: null, roles: [], flags: {} as Record<string, boolean> };
    }

    // Marca o último acesso do membro no workspace ativo.
    await supabaseAdmin
      .from("workspace_members")
      .update({ ultimo_acesso_em: new Date().toISOString() })
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId);

    const [{ data: roles }, { data: flags }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("workspace_id", workspace.id),
      supabase.from("module_flags").select("module, enabled").eq("workspace_id", workspace.id),
    ]);

    return {
      profile: profile ?? null,
      workspace,
      roles: (roles ?? []).map((r) => r.role as string),
      flags: Object.fromEntries((flags ?? []).map((f) => [f.module as string, f.enabled])) as Record<string, boolean>,
    };
  });

/**
 * Bootstrap do primeiro proprietário: cria o workspace, vincula o usuário
 * como membro e concede o papel `proprietario`. Roda com service role porque
 * as policies exigem ser admin — e ainda não existe admin algum.
 */
export const bootstrapWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ nome: z.string().trim().min(2).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();

    if (existing) {
      return { workspaceId: existing.workspace_id, created: false };
    }

    const base = slugify(data.nome) || "workspace";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: taken } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${i}`;
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: workspace, error } = await supabaseAdmin
      .from("workspaces")
      .insert({
        nome: data.nome,
        slug,
        status: "trial",
        plano: "trial",
        trial_expira_em: trialEnd.toISOString(),
        criado_por: userId,
      })
      .select("id")
      .single();

    if (error || !workspace) throw new Error("Não foi possível criar o workspace.");

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email: typeof claims.email === "string" ? claims.email : null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

    await supabaseAdmin
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: userId, ativo: true });

    await supabaseAdmin
      .from("user_roles")
      .insert({ workspace_id: workspace.id, user_id: userId, role: "proprietario" });

    await supabaseAdmin.from("module_flags").insert(
      MODULE_KEYS.map((module) => ({
        workspace_id: workspace.id,
        module,
        enabled: DEFAULT_ENABLED.has(module),
      })),
    );

    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: workspace.id,
      actorId: userId,
      action: "workspace.bootstrap",
      entity: "workspaces",
      entityId: workspace.id,
      metadata: { slug, plano: "trial" },
    });


    return { workspaceId: workspace.id, created: true };
  });

/** Lista membros e convites do workspace (RLS decide o que é visível). */
export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: members }, { data: roles }, { data: invites }] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("user_id, ativo, joined_at")
        .eq("workspace_id", data.workspaceId),
      supabase.from("user_roles").select("user_id, role").eq("workspace_id", data.workspaceId),
      supabase
        .from("workspace_invites")
        .select("id, email, role, status, expira_em, created_at")
        .eq("workspace_id", data.workspaceId)
        .eq("status", "pendente"),
    ]);

    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, nome, email, avatar_url").in("id", ids)
      : { data: [] as { id: string; nome: string | null; email: string | null; avatar_url: string | null }[] };

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      members: (members ?? []).map((m) => ({
        ...m,
        profile: byId.get(m.user_id) ?? null,
      })),
      roles: roles ?? [],
      invites: invites ?? [],
    };
  });

/** Convite de membro — a policy de INSERT exige admin do workspace. */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(160),
        role: z.enum(APP_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("workspace_invites").insert({
      workspace_id: data.workspaceId,
      email: data.email,
      role: data.role,
      convidado_por: userId,
    });

    if (error) {
      console.error("[inviteMember]", error);
      throw new Error(
        error.code === "23505"
          ? "Já existe um convite pendente para este e-mail."
          : "Não foi possível criar o convite.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId: userId,
      action: "invite.created",
      entity: "workspace_invites",
      metadata: { email: data.email, role: data.role },
    });

    return { ok: true };
  });

/** Cancela um convite pendente (policy exige admin). */
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ inviteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_invites")
      .delete()
      .eq("id", data.inviteId);
    if (error) throw new Error("Não foi possível cancelar o convite.");
    return { ok: true };
  });
