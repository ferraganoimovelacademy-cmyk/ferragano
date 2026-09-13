import { createFileRoute } from "@tanstack/react-router";

/**
 * SPRINT 17 — Automação Inteligente.
 *
 * Chamado pelo pg_cron: avalia os sinais do Advisor de todos os workspaces
 * ativos e enfileira os efeitos no Outbox. Rota pública autenticada pela
 * apikey do projeto; a resposta traz apenas contadores (nunca PII).
 */
export const Route = createFileRoute("/api/public/hooks/advisor-watchdog")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer /i, "") ??
          "";

        const esperado =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";

        if (!esperado || apikey !== esperado) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const inicio = Date.now();
        try {
          const { avaliarSinaisAutomaticos } = await import("@/lib/platform/watchdog.server");
          const resultado = await avaliarSinaisAutomaticos();

          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc(
              "log_job_run" as never,
              {
                _job: "advisor.watchdog",
                _duracao_ms: Date.now() - inicio,
                _ok: true,
                _detalhe: resultado,
              } as never,
            );
          } catch (logErro) {
            console.error("[advisor-watchdog] log", (logErro as Error).message);
          }

          return Response.json({ ok: true, ...resultado });
        } catch (e) {
          console.error("[advisor-watchdog] erro", (e as Error).message);
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc(
              "log_job_run" as never,
              {
                _job: "advisor.watchdog",
                _ok: false,
                _detalhe: { erro: (e as Error).message },
              } as never,
            );
          } catch {
            // observabilidade nunca derruba o job
          }
          return new Response(JSON.stringify({ ok: false, error: "watchdog_failed" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
