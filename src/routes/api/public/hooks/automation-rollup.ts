import { createFileRoute } from "@tanstack/react-router";

/**
 * SPRINT 19 — rollup diário da Automation Intelligence (ADR-017).
 * Materializa `automation_daily_metrics` a partir da fila ANTES de qualquer
 * purga do Outbox. Rota pública porque o cron vem de fora; a execução exige
 * o service role (a função de banco não é executável por `anon`).
 */
export const Route = createFileRoute("/api/public/hooks/automation-rollup")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc(
            "rollup_automation_daily_metrics" as never,
            { _dias: 3 } as never,
          );

          if (error) throw new Error(error.message);

          return new Response(JSON.stringify({ ok: true, linhas: data ?? 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[automation-rollup]", (e as Error).message);
          return new Response(JSON.stringify({ ok: false, erro: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
