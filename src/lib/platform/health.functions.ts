import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlatformHealth } from "@/lib/platform/health";

/**
 * GATE 04 — Observabilidade (Sprint 10.5).
 *
 * Única porta de leitura das métricas de plataforma. A função
 * `platform_health` é security definer e valida papel de proprietário/
 * administrador antes de devolver qualquer número; a tabela de execuções
 * de job (`platform_job_runs`) não é legível direto pela API.
 */
export const getPlatformHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PlatformHealth> => {
    const { data: row, error } = await context.supabase.rpc(
      "platform_health" as never,
      { _workspace_id: data.workspaceId } as never,
    );

    if (error) {
      console.error("[getPlatformHealth]", error.message);
      throw new Error("Não foi possível carregar a saúde da plataforma.");
    }

    return row as unknown as PlatformHealth;
  });