import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import type { Comparacao, ExecutiveTwin, Simulacao } from "@/lib/platform/executive-twin";
import { lerComparacao, lerSimulacao, lerTwin } from "@/lib/platform/executive-twin.server";

/** SPRINT 30 — porta única do contexto `Executive Twin` (somente leitura). */

/** GATES 01-07: estado consolidado do gêmeo digital executivo. */
export const getExecutiveTwin = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "executive_twin.estado")])
  .inputValidator((input: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ExecutiveTwin> =>
    lerTwin(context.supabase as never, data.workspaceId),
  );

/** GATE 03: comparação entre dois momentos declarados. */
export const compararMomentos = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "executive_twin.comparacao")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        mesA: z.string().regex(/^\d{4}-\d{2}$/),
        mesB: z.string().regex(/^\d{4}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Comparacao> =>
    lerComparacao(context.supabase as never, data.workspaceId, data.mesA, data.mesB),
  );

/** GATE 06: cenário hipotético sobre padrões históricos observados. */
export const simularCenario = createServerFn({ method: "GET" })
  .middleware([instrumented("platform", "executive_twin.simulacao")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        variavel: z.enum(["visitas", "propostas", "atividades", "oportunidades"]),
        deltaPercentual: z.number().min(-90).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<Simulacao> =>
    lerSimulacao(context.supabase as never, data.workspaceId, data.variavel, data.deltaPercentual),
  );
