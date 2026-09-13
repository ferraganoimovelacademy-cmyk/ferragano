import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { montarSnapshotAdvisor, type AdvisorVendedor } from "@/lib/platform/advisor";
import type { AdvisoryEmpreendimento } from "@/lib/platform/advisory";
import type { ForecastBase, OpportunitySignal } from "@/lib/platform/predictive";

/**
 * SPRINT 23 — PREDICTIVE: única porta de leitura do contexto.
 *
 * Lê apenas a Query Layer certificada: `read_opportunity_signals`,
 * `read_forecast_base`, `read_property_360` e `read_sales_360`. Nenhuma
 * tabela transacional é consultada daqui, e nenhum cálculo acontece aqui —
 * a previsão é montada na camada pura (`predictive.ts`), auditável em teste.
 */

type Linha = Record<string, unknown>;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOuNulo = (v: unknown) => (v == null ? null : Number(v));
const texto = (v: unknown, padrao: string) => (typeof v === "string" && v.trim() ? v : padrao);

export type PredictiveContexto = {
  sinais: OpportunitySignal[];
  empreendimentos: AdvisoryEmpreendimento[];
  vendedores: AdvisorVendedor[];
  forecastBase: ForecastBase | null;
  /** true quando o usuário não tem papel de gestão (visão reduzida). */
  visaoReduzida: boolean;
  geradoEm: string;
};

export const getPredictiveContext = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "predictive.context")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        limite: z.number().int().min(1).max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PredictiveContexto> => {
    const supabase = context.supabase;

    const [sinaisRes, forecastRes, propRes, salesRes] = await Promise.all([
      supabase.rpc("read_opportunity_signals" as never, {
        _workspace_id: data.workspaceId,
        _limit: data.limite ?? 200,
      } as never),
      supabase.rpc("read_forecast_base" as never, {
        _workspace_id: data.workspaceId,
      } as never),
      supabase.rpc("read_property_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("read_sales_360", { _workspace_id: data.workspaceId }),
    ]);

    if (sinaisRes.error) {
      console.error("[getPredictiveContext] sinais", sinaisRes.error.message);
      throw new Error("Não foi possível ler os sinais das oportunidades.");
    }

    // Forecast e ranking de corretor são de gestão: sem papel, o radar mostra
    // só o que o usuário pode ver em vez de derrubar a tela.
    if (forecastRes.error) console.warn("[getPredictiveContext] forecast", forecastRes.error.message);
    if (salesRes.error) console.warn("[getPredictiveContext] sales", salesRes.error.message);
    if (propRes.error) console.warn("[getPredictiveContext] property", propRes.error.message);

    const sinais: OpportunitySignal[] = ((sinaisRes.data ?? []) as unknown as Linha[]).map((r) => ({
      opportunityId: String(r["opportunity_id"]),
      titulo: texto(r["titulo"], "Oportunidade"),
      personId: (r["person_id"] as string | null) ?? null,
      personNome: texto(r["person_nome"], "Sem cliente"),
      responsavelId: (r["responsavel_id"] as string | null) ?? null,
      responsavelNome: texto(r["responsavel_nome"], "Sem responsável"),
      empreendimentoId: (r["empreendimento_id"] as string | null) ?? null,
      empreendimentoNome: (r["empreendimento_nome"] as string | null) ?? null,
      estagio: texto(r["estagio"], "novo"),
      stageNome: (r["stage_nome"] as string | null) ?? null,
      stageProbabilidade: numOuNulo(r["stage_probabilidade"]),
      slaHoras: numOuNulo(r["sla_horas"]),
      valor: numOuNulo(r["valor"]),
      diasNaEtapa: num(r["dias_na_etapa"]),
      diasDesdeCriacao: num(r["dias_desde_criacao"]),
      interacoes30d: num(r["interacoes_30d"]),
      diasSemInteracao: numOuNulo(r["dias_sem_interacao"]),
      visitasRealizadas: num(r["visitas_realizadas"]),
      propostas: num(r["propostas"]),
      propostasEnviadas: num(r["propostas_enviadas"]),
      tarefasAtrasadas: num(r["tarefas_atrasadas"]),
      temProximaAcao: Boolean(r["tem_proxima_acao"]),
      stageConversao: numOuNulo(r["stage_conversao"]),
      stageAmostra: num(r["stage_amostra"]),
      empreendimentoVelocidade: numOuNulo(r["empreendimento_velocidade"]),
    }));

    const empreendimentos: AdvisoryEmpreendimento[] = (
      propRes.error ? [] : ((propRes.data ?? []) as unknown as Linha[])
    ).map((row) => ({
      empreendimentoId: String(row["empreendimento_id"]),
      nome: texto(row["nome"], "—"),
      vendas30d: num(row["vendas_30d"]),
      vendas90d: num(row["vendas_90d"]),
      visitas30d: num(row["visitas_30d"]),
      oportunidadesAbertas: num(row["oportunidades_abertas"]),
      unidadesDisponiveis: num(row["unidades_disponiveis"]),
      conversaoPercentual: num(row["conversao_percentual"]),
      velocidadeMensal: num(row["velocidade_mensal"]),
      estoqueMeses: numOuNulo(row["estoque_meses"]),
    }));

    const vendedores = salesRes.error
      ? []
      : montarSnapshotAdvisor(undefined, (salesRes.data ?? []) as unknown as Linha[], []).vendedores;

    const fbLinha = forecastRes.error
      ? undefined
      : (((forecastRes.data ?? []) as unknown as Linha[])[0] ?? undefined);

    const forecastBase: ForecastBase | null = fbLinha
      ? {
          ganhasMes: num(fbLinha["ganhas_mes"]),
          valorGanhoMes: num(fbLinha["valor_ganho_mes"]),
          ganhas90d: num(fbLinha["ganhas_90d"]),
          criadas90d: num(fbLinha["criadas_90d"]),
          diasNoMes: num(fbLinha["dias_no_mes"]) || 30,
          diasDecorridos: num(fbLinha["dias_decorridos"]),
          oportunidadesAbertas: num(fbLinha["oportunidades_abertas"]),
          pipelineTotal: num(fbLinha["pipeline_total"]),
          ticketMedio: numOuNulo(fbLinha["ticket_medio"]),
          cicloMedioDias: numOuNulo(fbLinha["ciclo_medio_dias"]),
        }
      : null;

    return {
      sinais,
      empreendimentos,
      vendedores,
      forecastBase,
      visaoReduzida: Boolean(forecastRes.error),
      geradoEm: new Date().toISOString(),
    };
  });