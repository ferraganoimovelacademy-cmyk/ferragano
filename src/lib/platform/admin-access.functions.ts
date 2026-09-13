import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADMIN_LEVELS,
  ADMIN_MODULES,
  ADMIN_SENSITIVE_MODULES,
  atendeNivel,
  type AdminLevel,
  type AdminModule,
} from "./admin-access";

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

/** Matriz administrativa + acesso efetivo de quem chamou. */
export const listAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    const [{ data: matriz }, { data: papeis }, { data: seguranca }] = await Promise.all([
      supabase
        .from("admin_module_access")
        .select("role, module, nivel")
        .eq("workspace_id", data.workspaceId),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("workspace_id", data.workspaceId),
      supabase
        .from("workspace_security")
        .select("exigir_2fa_admin")
        .eq("workspace_id", data.workspaceId)
        .maybeSingle(),
    ]);

    const meus = new Set((papeis ?? []).map((p) => p.role as string));
    const meuAcesso = Object.fromEntries(
      ADMIN_MODULES.map((module) => {
        const nivel = (matriz ?? [])
          .filter((m) => m.module === module && meus.has(m.role as string))
          .map((m) => m.nivel as AdminLevel)
          .reduce<AdminLevel>(
            (maior, atual) => (atendeNivel(atual, maior) ? atual : maior),
            "nenhum",
          );
        return [module, nivel];
      }),
    ) as Record<AdminModule, AdminLevel>;

    return {
      matriz: (matriz ?? []).map((m) => ({
        role: m.role as string,
        module: m.module as AdminModule,
        nivel: m.nivel as AdminLevel,
      })),
      meuAcesso,
      exigir2fa: Boolean(seguranca?.exigir_2fa_admin),
      mfaAtiva: claims["aal"] === "aal2",
      modulosSensiveis: ADMIN_SENSITIVE_MODULES,
      papeis: [...meus],
    };
  });

/** Define o nível de um papel em um módulo administrativo. */
export const setAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        role: z.enum(APP_ROLES),
        module: z.enum(ADMIN_MODULES),
        nivel: z.enum(ADMIN_LEVELS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminModule } = await import("./admin-access.server");
    await assertAdminModule(context, data.workspaceId, "admin_permissoes", "total");

    if (data.role === "proprietario" && data.nivel !== "total") {
      throw new Error("O proprietário sempre mantém acesso administrativo total.");
    }

    const { error } = await context.supabase.from("admin_module_access").upsert(
      {
        workspace_id: data.workspaceId,
        role: data.role,
        module: data.module,
        nivel: data.nivel,
      },
      { onConflict: "workspace_id,role,module" },
    );
    if (error) {
      console.error("[setAdminAccess]", error.message);
      throw new Error("Sem permissão para alterar os acessos administrativos.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "admin_access.updated",
      entity: "admin_module_access",
      metadata: { role: data.role, module: data.module, nivel: data.nivel },
    });

    return { ok: true };
  });

/** Liga/desliga a exigência de 2FA para acessos administrativos sensíveis. */
export const setExigir2faAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminModule } = await import("./admin-access.server");
    await assertAdminModule(context, data.workspaceId, "admin_seguranca", "total");

    if (data.enabled && context.claims["aal"] !== "aal2") {
      throw new Error(
        "Cadastre a verificação em duas etapas na sua própria conta antes de exigi-la do time.",
      );
    }

    const { error } = await context.supabase
      .from("workspace_security")
      .upsert(
        { workspace_id: data.workspaceId, exigir_2fa_admin: data.enabled },
        { onConflict: "workspace_id" },
      );
    if (error) {
      console.error("[setExigir2faAdmin]", error.message);
      throw new Error("Sem permissão para alterar a política de segurança.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: data.enabled ? "security.2fa_required" : "security.2fa_optional",
      entity: "workspace_security",
      metadata: { exigir_2fa_admin: data.enabled },
    });

    return { ok: true };
  });
