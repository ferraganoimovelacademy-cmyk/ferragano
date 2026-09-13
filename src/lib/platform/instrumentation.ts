import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TelemetryDomain } from "@/lib/platform/telemetry";

/**
 * SPRINT 12 — GATE 01: instrumentação como camada transversal.
 *
 * Substitui `requireSupabaseAuth` nas server functions instrumentadas:
 * mede duração, marca sucesso/erro e grava telemetria + métrica agregada.
 * O contexto (`supabase`, `userId`, `claims`) segue idêntico, então trocar
 * `[requireSupabaseAuth]` por `[instrumented("sales", "mover_etapa")]` é a
 * única mudança necessária em cada função.
 *
 * Regras:
 * - o workspace vem do próprio input (`workspaceId`); sem ele não há registro;
 * - erro de telemetria nunca propaga;
 * - o erro da operação real é registrado e re-lançado sem alteração.
 */
export function instrumented(
  domain: TelemetryDomain,
  action: string,
  options: { surface?: string; metric?: string } = {},
) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, data, context }) => {
      const inicio = Date.now();
      const workspaceId =
        data && typeof data === "object" && "workspaceId" in data
          ? (data as { workspaceId?: unknown }).workspaceId
          : undefined;

      const registrar = async (ok: boolean, erro?: string) => {
        if (typeof workspaceId !== "string" || workspaceId.length === 0) return;
        try {
          const { recordTelemetry } = await import("@/lib/platform/telemetry.server");
          await recordTelemetry(context.supabase, {
            workspaceId,
            domain,
            action,
            duracaoMs: Date.now() - inicio,
            ok,
            surface: options.surface ?? null,
            metric: options.metric ?? null,
            erro: erro ?? null,
          });
        } catch (e) {
          console.warn("[instrumented]", domain, action, e);
        }
      };

      try {
        const result = await next();
        await registrar(true);
        return result;
      } catch (error) {
        await registrar(false, error instanceof Error ? error.message : String(error));
        throw error;
      }
    });
}