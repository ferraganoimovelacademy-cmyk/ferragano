import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  ADMIN_SENSITIVE_MODULES,
  atendeNivel,
  type AdminLevel,
  type AdminModule,
} from "./admin-access";

export type AdminGuardContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims: Record<string, unknown>;
};

export class AdminAccessError extends Error {
  constructor(
    message: string,
    readonly code: "sem_permissao" | "mfa_obrigatorio",
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

/**
 * Fronteira de autorização da área administrativa. Toda função de servidor
 * que devolve dado administrativo passa por aqui — nunca pela interface.
 */
export async function assertAdminModule(
  context: AdminGuardContext,
  workspaceId: string,
  module: AdminModule,
  minimo: AdminLevel = "leitura",
): Promise<{ nivel: AdminLevel }> {
  const { supabase, userId, claims } = context;

  const [{ data: papeis }, { data: acessos }, { data: seguranca }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("workspace_id", workspaceId),
    supabase
      .from("admin_module_access")
      .select("role, nivel")
      .eq("workspace_id", workspaceId)
      .eq("module", module),
    supabase
      .from("workspace_security")
      .select("exigir_2fa_admin")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const meus = new Set((papeis ?? []).map((p) => p.role as string));
  const nivel = (acessos ?? [])
    .filter((a) => meus.has(a.role as string))
    .map((a) => a.nivel as AdminLevel)
    .sort((a, b) => (atendeNivel(a, b) ? -1 : 1))[0];

  if (!atendeNivel(nivel, minimo)) {
    throw new AdminAccessError("Sem permissão para este módulo administrativo.", "sem_permissao");
  }

  const exige2fa =
    Boolean(seguranca?.exigir_2fa_admin) && ADMIN_SENSITIVE_MODULES.includes(module);
  if (exige2fa && claims["aal"] !== "aal2") {
    throw new AdminAccessError(
      "Verificação em duas etapas obrigatória para este módulo.",
      "mfa_obrigatorio",
    );
  }

  return { nivel: nivel as AdminLevel };
}
