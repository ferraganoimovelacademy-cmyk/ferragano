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

const LEVELS = ["nenhum", "leitura", "escrita", "total"] as const;

export const PERMISSION_LEVELS = LEVELS;
export const PERMISSION_MODULES = MODULE_KEYS;
export const PERMISSION_ROLES = APP_ROLES;

export const moduleLabels: Record<string, string> = {
  crm: "CRM",
  erp: "ERP",
  academy: "Academy",
  ia: "IA",
  analytics: "Analytics",
  financeiro: "Financeiro",
  marketing: "Marketing",
  portal_cliente: "Portal do cliente",
  intelligence_hub: "Intelligence Hub",
  knowledge: "Knowledge",
};

export const levelLabels: Record<string, string> = {
  nenhum: "Nenhum",
  leitura: "Leitura",
  escrita: "Escrita",
  total: "Total",
};

/** Matriz de permissões (papel × módulo) e flags de módulo do workspace. */
export const listPermissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: permissoes }, { data: flags }] = await Promise.all([
      supabase
        .from("role_permissions")
        .select("role, module, nivel")
        .eq("workspace_id", data.workspaceId),
      supabase.from("module_flags").select("module, enabled").eq("workspace_id", data.workspaceId),
    ]);

    return {
      permissoes: permissoes ?? [],
      flags: Object.fromEntries((flags ?? []).map((f) => [f.module as string, f.enabled])),
    };
  });

/** Define o nível de acesso de um papel em um módulo. */
export const setPermissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        role: z.enum(APP_ROLES),
        module: z.enum(MODULE_KEYS),
        nivel: z.enum(LEVELS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.role === "proprietario" && data.nivel !== "total") {
      throw new Error("O proprietário sempre mantém acesso total.");
    }

    const { error } = await context.supabase.from("role_permissions").upsert(
      {
        workspace_id: data.workspaceId,
        role: data.role,
        module: data.module,
        nivel: data.nivel,
      },
      { onConflict: "workspace_id,role,module" },
    );
    if (error) {
      console.error("[setPermissao]", error);
      throw new Error("Sem permissão para alterar a matriz de acesso.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "permission.updated",
      entity: "role_permissions",
      metadata: { role: data.role, module: data.module, nivel: data.nivel },
    });

    return { ok: true };
  });

/** Liga ou desliga um módulo inteiro para o workspace. */
export const setModuleFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        module: z.enum(MODULE_KEYS),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("module_flags").upsert(
      { workspace_id: data.workspaceId, module: data.module, enabled: data.enabled },
      { onConflict: "workspace_id,module" },
    );
    if (error) {
      console.error("[setModuleFlag]", error);
      throw new Error("Sem permissão para alterar os módulos.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("./audit.server");
    await recordAudit(supabaseAdmin, {
      workspaceId: data.workspaceId,
      actorId: context.userId,
      action: "module.toggled",
      entity: "module_flags",
      metadata: { module: data.module, enabled: data.enabled },
    });

    return { ok: true };
  });
