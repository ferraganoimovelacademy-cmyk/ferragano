import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { instrumented } from "@/lib/platform/instrumentation";
import { montarGrafoConhecimento, type KnowledgeEntrada } from "@/lib/platform/knowledge-build";
import type { GrafoConhecimento } from "@/lib/platform/knowledge";

/**
 * SPRINT 26 — KNOWLEDGE: única porta de leitura do grafo.
 *
 * Lê exclusivamente a Query Layer certificada (`read_customer_360`,
 * `read_property_360`, `read_sales_360`, `read_opportunity_signals`,
 * `list_recommendations`) e o catálogo do Market Intelligence. Nenhuma tabela
 * de domínio é consultada daqui e nenhum cálculo acontece aqui: o grafo é
 * montado na camada pura (`knowledge-build.ts`), auditável em teste.
 */

type Linha = Record<string, unknown>;
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

export type KnowledgeGrafoResposta = {
  grafo: GrafoConhecimento;
  /** Fontes que falharam na leitura (visão parcial declarada, nunca silenciosa). */
  fontesIndisponiveis: string[];
};

export const getKnowledgeGraph = createServerFn({ method: "GET" })
  .middleware([instrumented("observability", "knowledge.graph")])
  .inputValidator((input: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        limite: z.number().int().min(1).max(300).default(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<KnowledgeGrafoResposta> => {
    const supabase = context.supabase;
    const limite = data.limite;

    const [clientesRes, imoveisRes, corretoresRes, sinaisRes, recsRes, seriesRes, regioesRes] =
      await Promise.all([
        supabase.rpc("read_customer_360", { _workspace_id: data.workspaceId, _limit: limite }),
        supabase.rpc("read_property_360", { _workspace_id: data.workspaceId }),
        supabase.rpc("read_sales_360", { _workspace_id: data.workspaceId }),
        supabase.rpc("read_opportunity_signals" as never, {
          _workspace_id: data.workspaceId,
          _limit: limite,
        } as never),
        supabase.rpc("list_recommendations", {
          _workspace_id: data.workspaceId,
          _limit: limite,
        }),
        supabase
          .from("market_indicator_series")
          .select("id, codigo, nome, fonte_nome, updated_at")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("market_regions")
          .select("id, nome, tipo, cidade, uf, updated_at")
          .eq("workspace_id", data.workspaceId),
      ]);

    const indisponiveis: string[] = [];
    const falhou = (nome: string, erro: { message: string } | null) => {
      if (!erro) return false;
      console.warn(`[getKnowledgeGraph] ${nome}`, erro.message);
      indisponiveis.push(nome);
      return true;
    };

    const linhas = (res: { data: unknown; error: { message: string } | null }, nome: string) =>
      falhou(nome, res.error) ? [] : ((res.data ?? []) as unknown as Linha[]);

    const entrada: KnowledgeEntrada = {
      pessoas: linhas(clientesRes, "customer_360").map((r) => ({
        id: String(r["person_id"]),
        nome: txt(r["nome"]) ?? "Pessoa",
        responsavelId: txt(r["responsavel_id"]),
        atualizadoEm: txt(r["ultima_interacao_em"]),
      })),
      corretores: linhas(corretoresRes, "sales_360").map((r) => ({
        id: String(r["responsavel_id"]),
        nome: txt(r["responsavel_nome"]) ?? "Corretor",
        atualizadoEm: txt(r["ultima_atividade_em"]),
      })),
      empreendimentos: linhas(imoveisRes, "property_360").map((r) => ({
        id: String(r["empreendimento_id"]),
        nome: txt(r["nome"]) ?? "Empreendimento",
        cidade: txt(r["cidade"]),
        uf: txt(r["uf"]),
        atualizadoEm: txt(r["created_at"]),
      })),
      oportunidades: linhas(sinaisRes, "opportunity_signals").map((r) => ({
        id: String(r["opportunity_id"]),
        titulo: txt(r["titulo"]) ?? "Oportunidade",
        personId: txt(r["person_id"]),
        responsavelId: txt(r["responsavel_id"]),
        empreendimentoId: txt(r["empreendimento_id"]),
        estagio: txt(r["estagio"]),
        diasSemInteracao: r["dias_sem_interacao"] == null ? null : Number(r["dias_sem_interacao"]),
      })),
      recomendacoes: linhas(recsRes, "list_recommendations").map((r) => ({
        id: String(r["id"]),
        chave: txt(r["chave"]) ?? "recomendacao",
        tipo: txt(r["recommendation_type"]) ?? "recomendacao",
        mensagem: txt(r["mensagem"]),
        status: txt(r["status"]),
        resultado: txt(r["resultado"]),
        quadrante: txt(r["quadrante"]),
        score: r["score"] == null ? null : Number(r["score"]),
        confianca: r["confianca"] == null ? null : Number(r["confianca"]),
        geradaEm: txt(r["gerada_em"]),
        avaliadaEm: txt(r["avaliada_em"]),
        implementadaEm: txt(r["implementada_em"]),
      })),
      indicadores: linhas(seriesRes, "market_indicator_series").map((r) => ({
        id: String(r["id"]),
        codigo: txt(r["codigo"]) ?? "indicador",
        nome: txt(r["nome"]) ?? "Indicador",
        fonte: txt(r["fonte_nome"]) ?? "Fonte externa",
        atualizadoEm: txt(r["updated_at"]),
      })),
      regioes: linhas(regioesRes, "market_regions").map((r) => ({
        id: String(r["id"]),
        nome: txt(r["nome"]) ?? "Região",
        tipo: txt(r["tipo"]) ?? "bairro",
        cidade: txt(r["cidade"]),
        uf: txt(r["uf"]),
        atualizadoEm: txt(r["updated_at"]),
      })),
    };

    return {
      grafo: montarGrafoConhecimento(entrada),
      fontesIndisponiveis: indisponiveis,
    };
  });
