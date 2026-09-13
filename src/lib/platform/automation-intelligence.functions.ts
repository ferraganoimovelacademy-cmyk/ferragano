import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AutomationIntelligence } from "@/lib/platform/automation-intelligence";

/**
 * SPRINT 19 — única porta de leitura da Automation Intelligence.
 * A função de banco é `security definer` e valida papel de administrador
 * antes de devolver qualquer número; a tabela histórica não é lida direto.
 */
export const getAutomationIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        dias: z.number().int().min(1).max(730).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AutomationIntelligence> => {
    const { data: row, error } = await context.supabase.rpc(
      "automation_intelligence" as never,
      { _workspace_id: data.workspaceId, _dias: data.dias ?? 90 } as never,
    );

    if (error) {
      console.error("[getAutomationIntelligence]", error.message);
      throw new Error("Não foi possível carregar a inteligência das automações.");
    }

    return row as unknown as AutomationIntelligence;
  });
