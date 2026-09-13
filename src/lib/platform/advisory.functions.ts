import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import {
  derivarSinais,
  montarSnapshotAdvisor,
  type AdvisorSinal,
  type AdvisorSnapshot,
} from "@/lib/platform/advisor";
import type { AutomationIntelligence } from "@/lib/platform/automation-intelligence";
import type { RecommendationQuality, RecommendationRow } from "@/lib/platform/recommendation";
import type { AdvisoryEmpreendimento } from "@/lib/platform/advisory";

/**
 * SPRINT 22 — ADVISORY: única porta de leitura do contexto.
 *
 * Lê SOMENTE Query Layer certificada: Read Models 360 (`read_*_360`),
 * `automation_intelligence` (ADR-017), `list_recommendations` e
 * `recommendation_quality` (ADR-019). Nenhuma tabela transacional.
 * A composição em linguagem executiva acontece no cliente, com a lógica
 * pura de `@/lib/platform/advisory` — o servidor só entrega evidência.
 */

export type AdvisoryContexto = {
  snapshot: AdvisorSnapshot;
  sinais: AdvisorSinal[];
  inteligencia: AutomationIntelligence | null;
  empreendimentos: AdvisoryEmpreendimento[];
  memoria: RecommendationRow[];
  qualidade: RecommendationQuality | null;
  geradoEm: string;
};

type Linha = Record<string, unknown>;

export const getAdvisoryContext = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "advisory.context")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        dias: z.number().int().min(1).max(730).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AdvisoryContexto> => {
    const supabase = context.supabase;
    const dias = data.dias ?? 90;

    const [exec, vend, mkt, prop, intel, memoria, qualidade] = await Promise.all([
      supabase.rpc("read_executive_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("read_sales_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("read_marketing_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("read_property_360", { _workspace_id: data.workspaceId }),
      supabase.rpc("automation_intelligence" as never, {
        _workspace_id: data.workspaceId,
        _dias: dias,
      } as never),
      supabase.rpc("list_recommendations" as never, {
        _workspace_id: data.workspaceId,
        _incluir_arquivadas: true,
        _limit: 200,
      } as never),
      supabase.rpc("recommendation_quality" as never, {
        _workspace_id: data.workspaceId,
        _dias: dias,
      } as never),
    ]);

    const erroLeitura = exec.error ?? vend.error ?? mkt.error ?? prop.error;
    if (erroLeitura) {
      console.error("[getAdvisoryContext] read models", erroLeitura.message);
      throw new Error("Não foi possível ler os painéis do workspace.");
    }

    const snapshot = montarSnapshotAdvisor(
      (exec.data ?? [])[0] as unknown as Linha | undefined,
      (vend.data ?? []) as unknown as Linha[],
      (mkt.data ?? []) as unknown as Linha[],
    );

    // Automação, memória e qualidade são admin-only: sem papel, o Advisor
    // fala apenas do funil em vez de falhar a tela inteira.
    if (intel.error) console.warn("[getAdvisoryContext] intelligence", intel.error.message);
    if (memoria.error) console.warn("[getAdvisoryContext] memoria", memoria.error.message);
    if (qualidade.error) console.warn("[getAdvisoryContext] qualidade", qualidade.error.message);

    const linhas = (memoria.error ? [] : ((memoria.data ?? []) as unknown as Linha[])).map(
      (row): RecommendationRow => ({
        id: String(row["id"]),
        workspaceId: String(row["workspace_id"]),
        chave: String(row["chave"]),
        tipo: String(row["recommendation_type"]),
        ruleId: (row["rule_id"] as string | null) ?? null,
        ruleNome: (row["rule_nome"] as string | null) ?? null,
        mensagem: (row["mensagem"] as string | null) ?? null,
        score: Number(row["score"] ?? 0),
        confianca: row["confianca"] == null ? null : Number(row["confianca"]),
        impacto: Number(row["impacto"] ?? 0),
        urgencia: Number(row["urgencia"] ?? 0),
        quadrante: (row["quadrante"] as RecommendationRow["quadrante"]) ?? null,
        status: row["status"] as RecommendationRow["status"],
        resultado: row["resultado"] as RecommendationRow["resultado"],
        ocorrencias: Number(row["ocorrencias"] ?? 1),
        geradaEm: String(row["gerada_em"]),
        vistaEm: (row["vista_em"] as string | null) ?? null,
        aceitaEm: (row["aceita_em"] as string | null) ?? null,
        implementadaEm: (row["implementada_em"] as string | null) ?? null,
        avaliadaEm: (row["avaliada_em"] as string | null) ?? null,
        fechadaEm: (row["closed_at"] as string | null) ?? null,
      }),
    );

    const empreendimentos: AdvisoryEmpreendimento[] = (
      (prop.data ?? []) as unknown as Linha[]
    ).map((row) => ({
      empreendimentoId: String(row["empreendimento_id"]),
      nome: (row["nome"] as string | null) ?? "—",
      vendas30d: Number(row["vendas_30d"] ?? 0),
      vendas90d: Number(row["vendas_90d"] ?? 0),
      visitas30d: Number(row["visitas_30d"] ?? 0),
      oportunidadesAbertas: Number(row["oportunidades_abertas"] ?? 0),
      unidadesDisponiveis: Number(row["unidades_disponiveis"] ?? 0),
      conversaoPercentual: Number(row["conversao_percentual"] ?? 0),
      velocidadeMensal: Number(row["velocidade_mensal"] ?? 0),
      estoqueMeses: row["estoque_meses"] == null ? null : Number(row["estoque_meses"]),
    }));

    return {
      snapshot,
      empreendimentos,
      sinais: derivarSinais(snapshot),
      inteligencia: intel.error
        ? null
        : ((intel.data ?? null) as unknown as AutomationIntelligence | null),
      memoria: linhas,
      qualidade: qualidade.error
        ? null
        : ((qualidade.data ?? null) as unknown as RecommendationQuality | null),
      geradoEm: new Date().toISOString(),
    };
  });
