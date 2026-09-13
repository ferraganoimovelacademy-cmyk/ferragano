import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * SPRINT 09 — Outbox Worker.
 *
 * Chamado pelo pg_cron a cada minuto. Rota pública (o cron vem de fora),
 * autenticada pela apikey do projeto. Nunca retorna PII: apenas contadores.
 */
const bodySchema = z
  .object({ limite: z.number().int().min(1).max(100).optional() })
  .strict()
  .optional();

export const Route = createFileRoute("/api/public/hooks/outbox-worker")({
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

        let limite = 20;
        try {
          const bruto = await request.text();
          if (bruto) {
            const parsed = bodySchema.safeParse(JSON.parse(bruto));
            if (parsed.success && parsed.data?.limite) limite = parsed.data.limite;
          }
        } catch {
          // corpo vazio ou inválido: usa o padrão
        }

        try {
          const { processarOutbox } = await import("@/lib/platform/automation.server");
          const inicio = Date.now();
          const resultado = await processarOutbox(limite);

          // GATE 04 — registra a execução para a tela de saúde da plataforma.
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc(
              "log_job_run" as never,
              {
                _job: "outbox.worker",
                _duracao_ms: Date.now() - inicio,
                _ok: true,
                _detalhe: resultado,
              } as never,
            );
          } catch (logErro) {
            console.error("[outbox-worker] log", (logErro as Error).message);
          }

          return Response.json({ ok: true, ...resultado });
        } catch (e) {
          console.error("[outbox-worker] erro", (e as Error).message);
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc(
              "log_job_run" as never,
              {
                _job: "outbox.worker",
                _ok: false,
                _detalhe: { erro: (e as Error).message },
              } as never,
            );
          } catch {
            // observabilidade nunca derruba o worker
          }
          return new Response(JSON.stringify({ ok: false, error: "worker_failed" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
