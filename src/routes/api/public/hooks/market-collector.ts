import { createFileRoute } from "@tanstack/react-router";

/**
 * SPRINT 25 — Market Collector.
 *
 * Chamado pelo pg_cron uma vez por dia. Rota pública (o cron vem de fora),
 * autenticada pela apikey do projeto. Nunca retorna PII: apenas contadores.
 */
export const Route = createFileRoute("/api/public/hooks/market-collector")({
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
          const { coletarIndicadores } = await import("@/lib/platform/market.server");
          const resultado = await coletarIndicadores();

          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc(
              "log_job_run" as never,
              {
                _job: "market.collector",
                _duracao_ms: Date.now() - inicio,
                _ok: resultado.falhas.length === 0,
                _detalhe: resultado,
              } as never,
            );
          } catch (logErro) {
            console.error("[market-collector] log", (logErro as Error).message);
          }

          return Response.json({ ok: true, ...resultado });
        } catch (e) {
          console.error("[market-collector] erro", (e as Error).message);
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc(
              "log_job_run" as never,
              {
                _job: "market.collector",
                _duracao_ms: Date.now() - inicio,
                _ok: false,
                _detalhe: { erro: (e as Error).message },
              } as never,
            );
          } catch {
            // observabilidade nunca derruba o coletor
          }
          return new Response(JSON.stringify({ ok: false, error: "collector_failed" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
